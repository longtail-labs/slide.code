import { Effect, Layer, Queue, Stream } from 'effect'
import { PubSubClient } from '../services/pubsub.service.js'
import { DatabaseService } from '../services/database.service.js'
import {
  MessageTypes,
  TaskStartMessage,
  TaskContinueMessage,
  createInvalidateQuery
} from '@slide.code/schema/messages'
import { TaskQueryKeys } from '@slide.code/schema'
import {
  ClaudeCodeAgentTag,
  makeClaudeCodeAgent
} from '../resources/ClaudeCodeAgent/claude-code-agent.resource.js'
import { findClaudeCodeExecutable } from '../effects/findClaudeCodeExecutable.effect.js'
import type { SdkMessage } from '@slide.code/schema'
import { Option } from 'effect'
import { getUserRef } from '../refs/ipc/user.ref.js'

/**
 * Set up a subscriber that handles TASK_START messages by creating and running Claude Code Agent
 */
const make = Effect.gen(function* () {
  yield* Effect.logInfo('Starting TaskStartListener')

  const pubsub = yield* PubSubClient
  const dbService = yield* DatabaseService

  // Get a subscription to all messages
  const subscription = yield* pubsub.subscribe()

  // Fork a fiber to process messages
  yield* Effect.forkScoped(
    Effect.forever(
      Effect.gen(function* () {
        const message = yield* Queue.take(subscription)

        // Handle both TASK_START and TASK_CONTINUE messages
        if (
          message._tag === MessageTypes.TASK_START ||
          message._tag === MessageTypes.TASK_CONTINUE
        ) {
          const isStartMessage = message._tag === MessageTypes.TASK_START
          const isContinueMessage = message._tag === MessageTypes.TASK_CONTINUE

          const taskMessage = message as TaskStartMessage | TaskContinueMessage
          const taskId = taskMessage.taskId
          const sessionId = isContinueMessage
            ? (taskMessage as TaskContinueMessage).sessionId
            : undefined
          const continuePrompt = isContinueMessage
            ? (taskMessage as TaskContinueMessage).prompt
            : undefined

          yield* Effect.fork(
            Effect.gen(function* () {
              console.log(
                `[TaskStartListener] 🚀 Handling ${message._tag} for task:`,
                taskId,
                sessionId ? `(session: ${sessionId})` : '(new session)'
              )
              yield* Effect.logInfo(
                `[TaskStartListener] 🚀 ${isStartMessage ? 'Starting' : 'Continuing'} Claude Code Agent for task: ${taskId}${sessionId ? ` (session: ${sessionId})` : ''}`
              )

              // Get the task from database to get project info and prompt
              const task = yield* dbService.getTask(taskId)
              if (!task) {
                console.error('[TaskStartListener] ❌ Task not found:', taskId)
                return yield* Effect.fail(`Task not found: ${taskId}`)
              }

              // Get the project to get the working directory
              const project = yield* dbService.getProject(task.projectId)
              if (!project) {
                console.error('[TaskStartListener] ❌ Project not found:', task.projectId)
                return yield* Effect.fail(`Project not found: ${task.projectId}`)
              }

              console.log('[TaskStartListener] 🔧 Task found:', task.name)
              console.log('[TaskStartListener] 🔧 Project path:', project.path)

              // Determine session ID to use - for TASK_CONTINUE it's provided, for TASK_START we get latest
              let finalSessionId = sessionId
              if (isStartMessage && !finalSessionId) {
                console.log(
                  '[TaskStartListener] 🔧 TASK_START - No session ID provided, getting latest from database'
                )
                const latestSessionId = yield* dbService.getLatestSessionIdForTask(task.id)
                finalSessionId = latestSessionId || undefined
                console.log(
                  '[TaskStartListener] 🔧 Latest session ID:',
                  finalSessionId || 'none found'
                )
              }

              // Update task status to 'running' when we start
              yield* dbService.updateTask(task.id, {
                status: 'running'
              })

              // Determine the prompt to use
              const prompt = isContinueMessage && continuePrompt ? continuePrompt : task.name

              yield* Effect.forkDaemon(
                Effect.gen(function* () {
                  console.log('[TaskStartListener] 🔧 Inside daemon generator function - START')
                  yield* Effect.logInfo(
                    '[TaskStartListener] 🔧 Inside daemon generator function - START'
                  )

                  yield* Effect.logInfo(
                    '[TaskStartListener] 🚀 About to kick off Claude Code Agent'
                  )
                  console.log('[TaskStartListener] KICKING OFF CLAUDE CODE AGENT!')

                  yield* Effect.scoped(
                    Effect.gen(function* () {
                      yield* Effect.logInfo('[TaskStartListener] 🔧 Entering scoped section')
                      console.log('[TaskStartListener] 🔧 Entering scoped section')

                      // Find the Claude executable path first
                      yield* Effect.logInfo('[TaskStartListener] 🔧 Finding Claude executable')
                      console.log('[TaskStartListener] 🔧 Finding Claude executable')
                      const claudeExecutablePath = yield* findClaudeCodeExecutable

                      if (!claudeExecutablePath) {
                        console.error('[TaskStartListener] ❌ Claude executable not found')
                        return yield* Effect.fail(new Error('Claude executable not found'))
                      }

                      yield* Effect.logInfo(
                        `[TaskStartListener] 🔧 Found Claude executable at: ${claudeExecutablePath}`
                      )
                      console.log(
                        `[TaskStartListener] 🔧 Found Claude executable at: ${claudeExecutablePath}`
                      )

                      yield* Effect.logInfo(
                        `[TaskStartListener] 🔧 Working directory: ${project.path}`
                      )
                      console.log(`[TaskStartListener] 🔧 Working directory: ${project.path}`)

                      const agent = yield* makeClaudeCodeAgent({
                        workingDirectory: project.path,
                        maxTurns: 50,
                        permissionMode: 'bypassPermissions',
                        model: 'claude-3-5-sonnet-20241022',
                        pathToClaudeCodeExecutable: claudeExecutablePath
                      })

                      console.log(
                        '[TaskStartListener] 🔧 Claude Code Agent initialized for project:',
                        project.path
                      )

                      // Subscribe to agent messages and save them to database
                      const messageSubscription = agent.messages.pipe(
                        Stream.tap((message: SdkMessage) =>
                          Effect.gen(function* () {
                            try {
                              console.log(
                                '[TaskStartListener] 🔧 Saving message to database:',
                                message.type
                              )
                              console.log(
                                '[TaskStartListener] ✉️ Full message content:',
                                JSON.stringify(message, null, 2)
                              )

                              const subtype =
                                message.type === 'result' || message.type === 'system'
                                  ? message.subtype
                                  : null

                              yield* dbService.createChatMessage({
                                taskId: task.id,
                                type: message.type,
                                subtype,
                                event: message,
                                sessionId: 'session_id' in message ? message.session_id : null
                              })

                              // Invalidate the task queries so the UI updates with new messages
                              console.log(
                                '[TaskStartListener] 🔄 Publishing task invalidation for UI updates'
                              )

                              // Invalidate the basic task detail query
                              yield* pubsub.publish(
                                createInvalidateQuery([...TaskQueryKeys.detail(task.id)])
                              )

                              // Invalidate the task with messages query (our custom extended query)
                              yield* pubsub.publish(
                                createInvalidateQuery([
                                  ...TaskQueryKeys.detail(task.id),
                                  'withMessages'
                                ])
                              )
                            } catch (error) {
                              console.error('[TaskStartListener] ❌ Failed to save message:', error)
                            }
                          })
                        ),
                        Stream.runDrain
                      )

                      // Start the message subscription in the background
                      yield* Effect.fork(messageSubscription)

                      // Save the user prompt as a message
                      // For new sessions, save the initial prompt
                      // For continuing sessions, save the continue prompt
                      if (!finalSessionId) {
                        console.log(
                          '[TaskStartListener] 🔧 Creating initial user message for new session'
                        )
                      } else {
                        console.log(
                          '[TaskStartListener] 🔧 Creating continue user message for existing session'
                        )
                      }

                      yield* dbService.createChatMessage({
                        taskId: task.id,
                        type: 'prompt',
                        subtype: null,
                        event: {
                          type: 'prompt',
                          timestamp: Date.now(),
                          content: prompt
                        } as any,
                        sessionId: finalSessionId || null // Use the session ID if continuing
                      })

                      // Invalidate task queries after saving the message
                      yield* pubsub.publish(
                        createInvalidateQuery([...TaskQueryKeys.detail(task.id)])
                      )
                      yield* pubsub.publish(
                        createInvalidateQuery([...TaskQueryKeys.detail(task.id), 'withMessages'])
                      )

                      if (!finalSessionId) {
                        console.log(
                          '[TaskStartListener] 🔧 Starting Claude Code Agent with new session and prompt:',
                          prompt
                        )
                        // Start the agent with the initial prompt for new session
                        yield* agent.run(prompt)
                      } else {
                        console.log(
                          '[TaskStartListener] 🔧 Continuing Claude Code Agent with existing session:',
                          finalSessionId
                        )
                        // For continuing sessions, use the continue prompt if provided, otherwise task name
                        yield* agent.run(prompt, finalSessionId)
                      }

                      console.log(
                        '[TaskStartListener] 🔧 Claude Code Agent run command issued. Waiting for completion...'
                      )

                      // Wait for the agent to reach a terminal state before closing the scope
                      yield* agent.changes.pipe(
                        Stream.tap((s) =>
                          Effect.log(`[TaskStartListener] Agent state changed: ${s.status}`)
                        ),
                        Stream.filter(
                          (s) =>
                            s.status === 'finished' ||
                            s.status === 'error' ||
                            s.status === 'cancelled'
                        ),
                        Stream.runHead, // Take the first terminal state and finish the stream
                        Effect.tap((finalStateOption) => {
                          const status = finalStateOption.pipe(
                            Option.map((s) => s.status),
                            Option.getOrElse(() => 'unknown (stream ended prematurely)')
                          )
                          return Effect.gen(function* () {
                            yield* Effect.logInfo(
                              `[TaskStartListener] Agent run has concluded with status: ${status}`
                            )

                            // If the agent finished successfully, update task status to "completed" and check if needs review
                            if (status === 'finished') {
                              console.log(
                                '[TaskStartListener] 🔄 Agent finished successfully, updating task status to "completed"'
                              )

                              // Check if user is currently viewing this task
                              const userRef = yield* getUserRef
                              const userState = yield* userRef.get()
                              const isCurrentlyViewing = userState.currentTaskId === task.id
                              const needsReview = !isCurrentlyViewing

                              console.log(
                                `[TaskStartListener] 🔍 User currently viewing task ${task.id}:`,
                                isCurrentlyViewing,
                                `- needsReview: ${needsReview}`
                              )

                              yield* dbService.updateTask(task.id, {
                                status: 'completed',
                                needsReview
                              })

                              console.log(
                                '[TaskStartListener] ✅ Task status updated to "completed" for task:',
                                task.id,
                                `(needsReview: ${needsReview})`
                              )

                              // Invalidate task queries to update the UI
                              yield* pubsub.publish(
                                createInvalidateQuery([...TaskQueryKeys.lists()])
                              )
                              yield* pubsub.publish(
                                createInvalidateQuery([
                                  ...TaskQueryKeys.detail(task.id),
                                  'withMessages'
                                ])
                              )

                              console.log(
                                '[TaskStartListener] 🔄 Task queries invalidated for UI updates'
                              )
                            } else if (status === 'error' || status === 'cancelled') {
                              // If the agent failed or was cancelled, update status to 'failed'
                              console.log(
                                `[TaskStartListener] 🔄 Agent ${status}, updating task status to "failed"`
                              )

                              yield* dbService.updateTask(task.id, {
                                status: 'failed'
                              })

                              console.log(
                                '[TaskStartListener] ✅ Task status updated to "failed" for task:',
                                task.id
                              )

                              // Invalidate task queries to update the UI
                              yield* pubsub.publish(
                                createInvalidateQuery([...TaskQueryKeys.lists()])
                              )
                              yield* pubsub.publish(
                                createInvalidateQuery([
                                  ...TaskQueryKeys.detail(task.id),
                                  'withMessages'
                                ])
                              )
                            }
                          })
                        })
                      )

                      console.log('[TaskStartListener] 🔧 Claude Code Agent scope is now closing.')
                    })
                  ).pipe(
                    Effect.catchAll((error) => {
                      console.error('[TaskStartListener] ❌ Agent failed with error:', error)
                      return Effect.logError(`Agent failed with error: ${error}`)
                    })
                  )
                }).pipe(
                  Effect.catchAllCause((cause) => {
                    console.error('[TaskStartListener] ❌ Top-level agent fiber failed:', cause)
                    return Effect.logError(`Top-level agent fiber failed: ${cause}`)
                  })
                )
              )

              console.log(
                '[TaskStartListener] 🔧 Daemon fork created successfully for task:',
                taskId
              )
              yield* Effect.logInfo(
                `[TaskStartListener] 🔧 Daemon fork created successfully for task: ${taskId}`
              )
            }).pipe(
              Effect.catchAll((error) =>
                Effect.logError(`Error handling TASK_START message: ${error}`)
              )
            )
          )
        }
      })
    ).pipe(
      Effect.catchAll((error) => {
        Effect.logError('Fatal error in TaskStartListener message loop:', error)
        return Effect.void
      })
    )
  )

  yield* Effect.addFinalizer(() => Effect.logInfo('TaskStartListener stopped'))

  return Effect.logInfo('TaskStartListener started')
}).pipe(Effect.annotateLogs({ module: 'task-start-listener' }))

/**
 * Layer that provides the TaskStartListener
 */
export const TaskStartListener = {
  Live: Layer.scopedDiscard(make).pipe(
    Layer.provide(PubSubClient.Default),
    Layer.provide(DatabaseService.Default)
  )
}
