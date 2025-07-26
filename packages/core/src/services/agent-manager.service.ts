import { Effect, Layer, Ref, Stream } from 'effect'
import { Context } from 'effect'
import { Option } from 'effect'
import {
  ClaudeCodeAgentTag,
  makeClaudeCodeAgent,
  type ClaudeCodeAgent
} from '../resources/ClaudeCodeAgent/claude-code-agent.resource.js'
import { findClaudeCodeExecutable } from '../effects/findClaudeCodeExecutable.effect.js'
import { DatabaseService } from './database.service.js'
import { PubSubClient } from './pubsub.service.js'
import { NotificationService } from './notification.service.js'
import type { SdkMessage } from '@slide.code/schema'
import { createInvalidateQuery, createTaskInvalidation, DEFAULT_MODEL } from '@slide.code/schema'
import { AppReadyRef } from '../refs/ipc/app-ready.ref.js'
import { RefsLayer } from '../refs/index.js'

// ==============================================
// TYPES
// ==============================================

type RunningAgents = Map<string, ClaudeCodeAgent>

interface AgentConfig {
  workingDirectory: string
  maxTurns: number
  permissionMode: 'default' | 'bypassPermissions' | 'acceptEdits' | 'plan'
  model: string
  taskId: string
  taskName: string
}

interface TaskContext {
  taskId: string
  sessionId?: string
  prompt: string
  model?: string
  permissionMode?: string
  attachments?: readonly {
    readonly fileName: string
    readonly mimeType: string
    readonly base64Data: string
    readonly size: number
    readonly fileType?: 'image' | 'document' | 'text' | 'code' | 'other'
  }[]
}

// ==============================================
// AGENT MANAGER SERVICE
// ==============================================

const make = Effect.gen(function* () {
  const runningAgents = yield* Ref.make<RunningAgents>(new Map())
  const dbService = yield* DatabaseService
  const pubsub = yield* PubSubClient
  const notificationService = yield* NotificationService
  const appReadyRef = yield* AppReadyRef

  const isAgentRunning = (taskId: string) =>
    Effect.gen(function* () {
      const agents = yield* Ref.get(runningAgents)
      return agents.has(taskId)
    })

  const trackAgent = (taskId: string, agent: ClaudeCodeAgent) =>
    Ref.update(runningAgents, (agents) => {
      const newAgents = new Map(agents)
      newAgents.set(taskId, agent)
      return newAgents
    })

  const untrackAgent = (taskId: string) =>
    Ref.update(runningAgents, (agents) => {
      const newAgents = new Map(agents)
      newAgents.delete(taskId)
      return newAgents
    })

  const cancelAgent = (taskId: string) =>
    Effect.gen(function* () {
      const agents = yield* Ref.get(runningAgents)
      const agent = agents.get(taskId)

      if (agent) {
        yield* Effect.logInfo(`Cancelling agent for task: ${taskId}`)
        yield* agent.cancel()
        yield* untrackAgent(taskId)
        yield* Effect.logInfo(`Agent cancelled and removed from tracking: ${taskId}`)
        return true
      } else {
        yield* Effect.logInfo(`No running agent found for task: ${taskId}`)
        // Fallback: update task status directly
        yield* dbService.updateTask(taskId, { status: 'stopped' })
        return false
      }
    })

  const setupMessageSubscription = (agent: ClaudeCodeAgent, taskId: string) =>
    Effect.gen(function* () {
      const messageSubscription = agent.messages.pipe(
        Stream.tap((message: SdkMessage) =>
          Effect.gen(function* () {
            const subtype =
              message.type === 'result' || message.type === 'system' ? message.subtype : null

            yield* dbService.createChatMessage({
              taskId,
              type: message.type,
              subtype,
              event: message,
              sessionId: 'session_id' in message ? message.session_id : null
            })

            yield* pubsub.publish(createInvalidateQuery(createTaskInvalidation(taskId)))
          }).pipe(
            Effect.catchAll((error) =>
              Effect.logError(`Failed to save message for task ${taskId}: ${error}`)
            )
          )
        ),
        Stream.runDrain
      )

      yield* Effect.fork(messageSubscription)
    })

  const handleAgentCompletion = (taskId: string, taskName: string, status: string) =>
    Effect.gen(function* () {
      // Remove agent from tracking
      yield* untrackAgent(taskId)
      yield* Effect.logInfo(`Agent removed from tracking for task: ${taskId}`)

      if (status === 'finished') {
        // Check if user is currently viewing this task
        const appReadyState = yield* appReadyRef.get()
        const isCurrentlyViewing = appReadyState.currentTaskId === taskId
        const needsReview = !isCurrentlyViewing

        yield* dbService.updateTask(taskId, {
          status: 'completed',
          needsReview
        })

        yield* Effect.fork(
          notificationService
            .showTaskNotificationWithNavigation(taskId, taskName, 'completed')
            .pipe(
              Effect.catchAll((error) =>
                Effect.logError(`Failed to show completion notification: ${error}`)
              )
            )
        )

        yield* Effect.logInfo(`Task completed: ${taskId} (needsReview: ${needsReview})`)
      } else if (status === 'error' || status === 'cancelled') {
        const taskStatus = status === 'cancelled' ? 'stopped' : 'failed'
        yield* dbService.updateTask(taskId, { status: taskStatus })

        const notificationStatus = status === 'cancelled' ? 'cancelled' : 'failed'
        yield* Effect.fork(
          notificationService
            .showTaskNotificationWithNavigation(taskId, taskName, notificationStatus)
            .pipe(
              Effect.catchAll((error) =>
                Effect.logError(`Failed to show ${notificationStatus} notification: ${error}`)
              )
            )
        )

        yield* Effect.logInfo(`Task ${taskStatus}: ${taskId}`)
      }

      // Invalidate queries for UI updates
      yield* pubsub.publish(createInvalidateQuery(createTaskInvalidation(taskId)))
    })

  const createAndRunAgent = (config: AgentConfig, context: TaskContext) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Creating Claude Code Agent for task: ${config.taskId}`)

      // Update task status to running
      yield* dbService.updateTask(config.taskId, { status: 'running' })

      yield* Effect.forkDaemon(
        Effect.scoped(
          Effect.gen(function* () {
            // Find Claude executable
            const claudeExecutablePath = yield* findClaudeCodeExecutable
            if (!claudeExecutablePath) {
              return yield* Effect.fail(new Error('Claude executable not found'))
            }

            // Create agent
            const agent = yield* makeClaudeCodeAgent({
              workingDirectory: config.workingDirectory,
              maxTurns: config.maxTurns,
              permissionMode: config.permissionMode,
              model: config.model,
              pathToClaudeCodeExecutable: claudeExecutablePath
            })

            // Track agent
            yield* trackAgent(config.taskId, agent)

            // Set up message subscription
            yield* setupMessageSubscription(agent, config.taskId)

            // Save user message
            yield* dbService.createChatMessage({
              taskId: config.taskId,
              type: 'prompt',
              subtype: null,
              event: {
                type: 'prompt',
                timestamp: Date.now(),
                content: context.prompt,
                model: context.model || DEFAULT_MODEL,
                permissionMode: context.permissionMode || 'bypassPermissions',
                attachments: context.attachments || undefined
              },
              sessionId: context.sessionId || null
            })

            // Run agent
            if (!context.sessionId) {
              yield* agent.run(context.prompt, undefined, context.attachments)
            } else {
              yield* agent.run(context.prompt, context.sessionId, context.attachments)
            }

            // Wait for completion and handle final state
            yield* agent.changes.pipe(
              Stream.tap((s) =>
                Effect.logInfo(`Agent state changed for ${config.taskId}: ${s.status}`)
              ),
              Stream.filter(
                (s) => s.status === 'finished' || s.status === 'error' || s.status === 'cancelled'
              ),
              Stream.runHead,
              Effect.tap((finalStateOption) => {
                const status = finalStateOption.pipe(
                  Option.map((s) => s.status),
                  Option.getOrElse(() => 'unknown')
                )
                return handleAgentCompletion(config.taskId, config.taskName, status)
              })
            )
          })
        ).pipe(
          Effect.catchAll((error) =>
            Effect.logError(`Agent failed for task ${config.taskId}: ${error}`)
          )
        )
      )
    })

  const cleanupAllAgents = () =>
    Effect.gen(function* () {
      const agents = yield* Ref.get(runningAgents)
      if (agents.size > 0) {
        yield* Effect.logInfo(`Cleaning up ${agents.size} running agents`)
        yield* Effect.forEach(
          Array.from(agents.values()),
          (agent) => agent.cancel().pipe(Effect.orDie),
          { concurrency: 'unbounded' }
        )
        yield* Ref.set(runningAgents, new Map())
        yield* Effect.logInfo('All running agents cleaned up')
      }
    })

  return {
    isAgentRunning,
    cancelAgent,
    createAndRunAgent,
    cleanupAllAgents
  } as const
})

export class AgentManagerService extends Context.Tag('AgentManagerService')<
  AgentManagerService,
  Effect.Effect.Success<typeof make>
>() {
  static readonly Default = Layer.effect(this, make).pipe(
    Layer.provide(DatabaseService.Default),
    Layer.provide(PubSubClient.Default),
    Layer.provide(NotificationService.Default),
    Layer.provide(RefsLayer)
  )
}
