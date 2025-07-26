import { Effect, Layer, Queue, Stream } from 'effect'
import { PubSubClient } from '../services/pubsub.service.js'
import { DatabaseService } from '../services/database.service.js'
import { AgentManagerService } from '../services/agent-manager.service.js'
import {
  MessageTypes,
  TaskStartMessage,
  TaskContinueMessage,
  TaskStopMessage
} from '@slide.code/schema/messages'
import { DEFAULT_MODEL } from '@slide.code/schema'
import {
  type TaskContext,
  createTaskLogger,
  buildPromptWithComments,
  publishTaskInvalidations,
  catchAndLogError,
  parseTaskMessage
} from './utils/task-listener.utils.js'

// ==============================================
// SETUP
// ==============================================

const logger = createTaskLogger('TaskStartListener')

// ==============================================
// MESSAGE HANDLERS
// ==============================================

const handleTaskStop = (taskId: string) =>
  Effect.gen(function* () {
    yield* logger.logTaskAction('🛑 Stopping Claude Code Agent', taskId)

    const agentManager = yield* AgentManagerService
    const cancelled = yield* agentManager.cancelAgent(taskId)

    yield* publishTaskInvalidations(taskId)

    if (cancelled) {
      yield* logger.logSuccess('Agent cancelled successfully', taskId)
    } else {
      yield* logger.logSuccess('Task status updated (no agent was running)', taskId)
    }
  }).pipe(catchAndLogError('TASK_STOP handling', taskId))

const handleTaskStartOrContinue = (context: TaskContext) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseService
    const agentManager = yield* AgentManagerService

    yield* logger.logTaskAction('🚀 Processing task request', context.taskId, context.sessionId)

    // Get task and project
    const task = yield* dbService.getTask(context.taskId)
    if (!task) {
      return yield* Effect.fail(`Task not found: ${context.taskId}`)
    }

    const project = yield* dbService.getProject(task.projectId)
    if (!project) {
      return yield* Effect.fail(`Project not found: ${task.projectId}`)
    }

    // Determine session ID if not provided
    let finalSessionId = context.sessionId
    if (!finalSessionId) {
      const latestSessionId = yield* dbService.getLatestSessionIdForTask(task.id)
      finalSessionId = latestSessionId || undefined
    }

    // Build the final prompt with comments
    const basePrompt = context.prompt || task.name
    const finalPrompt = buildPromptWithComments(basePrompt, context.fileComments)

    // Create agent configuration
    const agentConfig = {
      workingDirectory: project.path,
      maxTurns: 50,
      permissionMode:
        (context.permissionMode as 'default' | 'bypassPermissions' | 'acceptEdits' | 'plan') ||
        'bypassPermissions',
      model: context.model || DEFAULT_MODEL,
      taskId: task.id,
      taskName: task.name
    }

    // Create task context for agent
    const taskContext = {
      taskId: task.id,
      sessionId: finalSessionId,
      prompt: finalPrompt,
      model: context.model,
      permissionMode: context.permissionMode,
      attachments: context.attachments
    }

    // Create and run the agent
    yield* agentManager.createAndRunAgent(agentConfig, taskContext)

    yield* logger.logSuccess('Agent creation initiated', task.id)
  }).pipe(catchAndLogError('task start/continue handling', context.taskId))

// ==============================================
// MESSAGE PROCESSOR
// ==============================================

const processMessage = (message: any) =>
  Effect.gen(function* () {
    if (message._tag === MessageTypes.TASK_STOP) {
      const taskMessage = yield* parseTaskMessage(message as TaskStopMessage, 'TASK_STOP')
      yield* Effect.fork(handleTaskStop(taskMessage.taskId))
      return
    }

    if (message._tag === MessageTypes.TASK_START || message._tag === MessageTypes.TASK_CONTINUE) {
      const taskMessage = yield* parseTaskMessage(
        message as TaskStartMessage | TaskContinueMessage,
        message._tag
      )
      const isContinueMessage = message._tag === MessageTypes.TASK_CONTINUE

      const context: TaskContext = {
        taskId: taskMessage.taskId,
        sessionId: isContinueMessage ? (taskMessage as TaskContinueMessage).sessionId : undefined,
        prompt: isContinueMessage ? (taskMessage as TaskContinueMessage).prompt : undefined,
        fileComments: isContinueMessage
          ? (taskMessage as TaskContinueMessage).fileComments
          : undefined,
        model: taskMessage.model,
        permissionMode: taskMessage.permissionMode,
        attachments: taskMessage.attachments
      }

      yield* Effect.fork(handleTaskStartOrContinue(context))
    }
  })

// ==============================================
// MAIN LISTENER SETUP
// ==============================================

const make = Effect.gen(function* () {
  yield* logger.logInfo('Starting TaskStartListener')

  const pubsub = yield* PubSubClient
  const agentManager = yield* AgentManagerService

  // Get message subscription
  const subscription = yield* pubsub.subscribe()

  // Process messages
  yield* Effect.forkScoped(
    Effect.forever(
      Effect.gen(function* () {
        const message = yield* Queue.take(subscription)
        yield* processMessage(message)
      })
    ).pipe(
      Effect.catchAll((error) => {
        Effect.logError('Fatal error in TaskStartListener message loop:', error)
        return Effect.void
      })
    )
  )

  // Cleanup finalizer - delegate to agent manager
  yield* Effect.addFinalizer(() => agentManager.cleanupAllAgents())

  return logger.logInfo('TaskStartListener started')
}).pipe(Effect.annotateLogs({ module: 'task-start-listener' }))

/**
 * Layer that provides the TaskStartListener
 */
export const TaskStartListener = {
  Live: Layer.scopedDiscard(make).pipe(
    Layer.provide(PubSubClient.Default),
    Layer.provide(DatabaseService.Default),
    Layer.provide(AgentManagerService.Default)
  )
}
