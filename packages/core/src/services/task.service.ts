/**
 * TaskService - Manages Claude Code agents for tasks with event streaming
 *
 * Usage Example:
 * ```typescript
 * import { TaskService, type TaskInfo, type AgentEvent } from '@slide.code/core'
 *
 * // Create an agent for a task
 * const taskInfo: TaskInfo = {
 *   id: 'task-123',
 *   projectId: 'my-project', // Optional - creates vibeDirectory/my-project
 *   // projectPath: '/path/to/existing/project' // Alternative - use existing project path
 * }
 *
 * const taskService = yield* TaskService
 * const agent = yield* taskService.createAgent(taskInfo, {
 *   maxTurns: 10,
 *   permissionMode: 'acceptEdits'
 * })
 *
 * // Run the agent
 * yield* agent.run("Help me implement a new feature")
 *
 * // Listen to all agent events
 * yield* Effect.forkScoped(
 *   taskService.createAgentEventStream().pipe(
 *     Stream.runForEach((event: AgentEvent) =>
 *       Match.value(event.type).pipe(
 *         Match.when('message', () =>
 *           Effect.logInfo(`Agent ${event.taskId} sent message: ${event.data.type}`)
 *         ),
 *         Match.when('status', () =>
 *           Effect.logInfo(`Agent ${event.taskId} status: ${event.data}`)
 *         ),
 *         Match.exhaustive
 *       )
 *     )
 *   )
 * )
 *
 * // Listen to events for a specific task
 * yield* Effect.forkScoped(
 *   taskService.createAgentEventStreamForTask('task-123').pipe(
 *     Stream.runForEach((event) =>
 *       Effect.logInfo(`Task-specific event: ${event.type}`)
 *     )
 *   )
 * )
 *
 * // Listen only to status changes
 * yield* Effect.forkScoped(
 *   taskService.createAgentEventStreamForType('status').pipe(
 *     Stream.runForEach((event) =>
 *       Effect.logInfo(`Status change: ${event.data}`)
 *     )
 *   )
 * )
 * ```
 */

import { Effect, Context, Ref, Layer, Stream, PubSub, Queue } from 'effect'
import {
  ClaudeCodeAgent,
  makeClaudeCodeAgent,
  AgentStatus
} from '../resources/ClaudeCodeAgent/claude-code-agent.resource.js'
import { UserRef } from '../refs/ipc/user.ref.js'
import { ClaudeCodeConfig } from '../types/claude-code.types.js'
import { SdkMessage } from '@slide.code/schema'
import path from 'node:path'
import fs from 'node:fs'

export class TaskServiceError extends Error {
  readonly _tag = 'TaskServiceError'
  constructor(message: string) {
    super(message)
    this.name = 'TaskServiceError'
  }
}

// Task information needed for agent creation
export interface TaskInfo {
  id: string
  projectId?: string
  projectPath?: string // Optional project path if already resolved
}

// Agent event type that combines agent messages and status changes
export type AgentEvent = {
  taskId: string
  type: 'message' | 'status'
  data: SdkMessage | AgentStatus
}

export class TaskService extends Effect.Service<TaskService>()('TaskService', {
  dependencies: [UserRef.Default],
  scoped: Effect.gen(function* () {
    const userRef = yield* UserRef
    const agents = yield* Ref.make(new Map<string, ClaudeCodeAgent>())

    // Create PubSub for agent events
    const agentEventsPubSub = yield* PubSub.unbounded<AgentEvent>()

    const getAgent = (taskId: string) =>
      Ref.get(agents).pipe(Effect.map((agentMap) => agentMap.get(taskId)))

    // Helper to create working directory
    const createWorkingDirectory = (baseDir: string, subdirectory: string) =>
      Effect.gen(function* () {
        const workingDir = path.join(baseDir, subdirectory)

        yield* Effect.tryPromise({
          try: () => fs.promises.mkdir(workingDir, { recursive: true }),
          catch: (error) => new TaskServiceError(`Failed to create working directory: ${error}`)
        })

        yield* Effect.logInfo(`[TaskService] Created working directory: ${workingDir}`)
        return workingDir
      })

    const createAgent = (taskInfo: TaskInfo, agentConfig?: Partial<ClaudeCodeConfig>) =>
      Effect.gen(function* () {
        const existingAgent = yield* getAgent(taskInfo.id)
        if (existingAgent) {
          return yield* Effect.fail(
            new TaskServiceError(`Agent for task ${taskInfo.id} already exists`)
          )
        }

        const userState = yield* userRef.ref.get()

        if (!userState.vibeDirectory) {
          return yield* Effect.fail(
            new TaskServiceError('Vibe directory not configured in UserRef')
          )
        }

        // Determine working directory based on task's project
        let workingDirectory: string
        if (taskInfo.projectPath) {
          // Use provided project path directly
          workingDirectory = taskInfo.projectPath
          yield* Effect.logInfo(`[TaskService] Using provided project path: ${workingDirectory}`)
        } else {
          // Create subdirectory in vibe directory
          const subdirectory = taskInfo.projectId || taskInfo.id
          workingDirectory = yield* createWorkingDirectory(userState.vibeDirectory, subdirectory)
        }

        const defaultConfig = {
          workingDirectory,
          pathToClaudeCodeExecutable: userState.claudeCode?.executablePath || undefined
        }

        const finalConfig = { ...defaultConfig, ...agentConfig }

        const agent = yield* makeClaudeCodeAgent(finalConfig)
        yield* Ref.update(agents, (agentMap) => agentMap.set(taskInfo.id, agent))

        // Set up event streaming for this agent
        yield* Effect.forkScoped(
          agent.messages.pipe(
            Stream.tap((message) =>
              Effect.logDebug(`[TaskService] Message from agent ${taskInfo.id}: ${message.type}`)
            ),
            Stream.map(
              (message): AgentEvent => ({
                taskId: taskInfo.id,
                type: 'message',
                data: message
              })
            ),
            Stream.runForEach((agentEvent) => PubSub.publish(agentEventsPubSub, agentEvent))
          )
        )

        // Set up status change streaming
        yield* Effect.forkScoped(
          agent.changes.pipe(
            Stream.map((state) => state.status),
            Stream.changes,
            Stream.tap((status) =>
              Effect.logInfo(`[TaskService] Agent ${taskInfo.id} status changed to: ${status}`)
            ),
            Stream.map(
              (status): AgentEvent => ({
                taskId: taskInfo.id,
                type: 'status',
                data: status
              })
            ),
            Stream.runForEach((agentEvent) => PubSub.publish(agentEventsPubSub, agentEvent))
          )
        )

        yield* Effect.logInfo(
          `[TaskService] Created agent for task ${taskInfo.id} with working directory: ${workingDirectory}`
        )
        return agent
      })

    const removeAgent = (taskId: string) =>
      Effect.gen(function* () {
        const agent = yield* getAgent(taskId)
        if (agent) {
          // Cancel the agent if it's running
          yield* agent.cancel()
        }

        yield* Ref.update(agents, (agentMap) => {
          agentMap.delete(taskId)
          return agentMap
        })

        yield* Effect.logInfo(`[TaskService] Removed agent for task: ${taskId}`)
      })

    // Event streaming methods
    const createAgentEventStream = () => Stream.fromPubSub(agentEventsPubSub)

    const createAgentEventStreamForTask = (taskId: string) =>
      createAgentEventStream().pipe(
        Stream.filter((event) => event.taskId === taskId),
        Stream.tap(() => Effect.logDebug(`[TaskService] Filtered event stream for task: ${taskId}`))
      )

    const createAgentEventStreamForType = (eventType: 'message' | 'status') =>
      createAgentEventStream().pipe(
        Stream.filter((event) => event.type === eventType),
        Stream.tap(() =>
          Effect.logDebug(`[TaskService] Filtered event stream for type: ${eventType}`)
        )
      )

    const subscribeToAgentEvents = () => PubSub.subscribe(agentEventsPubSub)

    const subscribeToAgentEventsForTask = (taskId: string) =>
      Effect.gen(function* () {
        const queue = yield* Queue.unbounded<AgentEvent>()
        const subscription = yield* PubSub.subscribe(agentEventsPubSub)

        yield* Effect.forkScoped(
          Effect.forever(
            Effect.gen(function* () {
              const agentEvent = yield* Queue.take(subscription)
              if (agentEvent.taskId === taskId) {
                yield* Queue.offer(queue, agentEvent)
              }
            })
          ).pipe(Effect.catchAll(() => Effect.void))
        )

        return queue
      })

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        const agentMap = yield* Ref.get(agents)
        yield* Effect.logInfo(`[TaskService] Cleaning up ${agentMap.size} agents.`)

        // Cancel all running agents
        yield* Effect.all(
          Array.from(agentMap.values()).map((agent) => agent.cancel()),
          { concurrency: 'unbounded' }
        )

        // Shutdown event PubSub
        yield* Effect.sync(() => PubSub.shutdown(agentEventsPubSub))

        // Clear the agents map
        yield* Ref.set(agents, new Map())
      })
    )

    return {
      createAgent,
      getAgent,
      removeAgent,
      // Event streaming API
      createAgentEventStream,
      createAgentEventStreamForTask,
      createAgentEventStreamForType,
      subscribeToAgentEvents,
      subscribeToAgentEventsForTask
    }
  })
}) {}

export const TaskServiceLive = TaskService.Default
