import { Effect } from 'effect'
import { PubSubClient } from '../../services/pubsub.service.js'
import {
  createInvalidateQuery,
  createTasksInvalidation,
  createTaskInvalidation
} from '@slide.code/schema'

// ==============================================
// TYPES
// ==============================================

export interface TaskContext {
  taskId: string
  sessionId?: string
  prompt?: string
  fileComments?: readonly {
    readonly filePath: string
    readonly comment: string
    readonly lineNumber?: number
  }[]
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
// LOGGING UTILITIES
// ==============================================

export const createTaskLogger = (module: string) => ({
  logTaskAction: (action: string, taskId: string, sessionId?: string) =>
    Effect.logInfo(
      `[${module}] ${action} for task: ${taskId}${sessionId ? ` (session: ${sessionId})` : ''}`
    ),

  logSuccess: (message: string, taskId?: string) =>
    Effect.logInfo(`[${module}] ✅ ${message}${taskId ? ` (task: ${taskId})` : ''}`),

  logError: (message: string, error?: unknown, taskId?: string) =>
    Effect.logError(
      `[${module}] ❌ ${message}${taskId ? ` (task: ${taskId})` : ''}${error ? `: ${error}` : ''}`
    ),

  logWarning: (message: string, taskId?: string) =>
    Effect.logInfo(`[${module}] ⚠️ ${message}${taskId ? ` (task: ${taskId})` : ''}`),

  logInfo: (message: string, taskId?: string) =>
    Effect.logInfo(`[${module}] 🔧 ${message}${taskId ? ` (task: ${taskId})` : ''}`)
})

// ==============================================
// PROMPT UTILITIES
// ==============================================

export const buildPromptWithComments = (
  basePrompt: string,
  fileComments?: TaskContext['fileComments']
) => {
  if (!fileComments || fileComments.length === 0) return basePrompt

  const formattedComments = fileComments
    .map((comment) => {
      const lineInfo = comment.lineNumber ? ` at line ${comment.lineNumber}` : ''
      return `- ${comment.filePath}${lineInfo}: ${comment.comment}`
    })
    .join('\n')

  return `${basePrompt}\n\nFile Comments:\n${formattedComments}`
}

// ==============================================
// PUBSUB UTILITIES
// ==============================================

export const publishTaskInvalidations = (taskId: string) =>
  Effect.gen(function* () {
    const pubsub = yield* PubSubClient
    yield* pubsub.publish(createInvalidateQuery(createTasksInvalidation()))
    yield* pubsub.publish(createInvalidateQuery(createTaskInvalidation(taskId)))
  })

// ==============================================
// ERROR HANDLING UTILITIES
// ==============================================

export const catchAndLogError = (operation: string, taskId?: string) =>
  Effect.catchAll((error: unknown) =>
    Effect.logError(`Error during ${operation}${taskId ? ` for task ${taskId}` : ''}: ${error}`)
  )

export const safeEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  fallback: A,
  operation: string,
  taskId?: string
) =>
  effect.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Error during ${operation}${taskId ? ` for task ${taskId}` : ''}: ${error}`
        )
        return fallback
      })
    )
  )

// ==============================================
// VALIDATION UTILITIES
// ==============================================

export const validateTaskContext = (context: TaskContext) =>
  Effect.gen(function* () {
    if (!context.taskId) {
      return yield* Effect.fail(new Error('Task ID is required'))
    }

    // Add more validation as needed
    return context
  })

// ==============================================
// MESSAGE PARSING UTILITIES
// ==============================================

export const parseTaskMessage = <T extends { taskId: string }>(message: T, messageType: string) =>
  Effect.gen(function* () {
    if (!message.taskId) {
      return yield* Effect.fail(new Error(`Invalid ${messageType} message: missing taskId`))
    }
    return message
  })

// ==============================================
// ASYNC OPERATION UTILITIES
// ==============================================

export const withTimeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  timeoutMs: number,
  operation: string
) =>
  effect.pipe(
    Effect.timeout(timeoutMs),
    Effect.catchAll((error) =>
      Effect.logError(`Timeout during ${operation} (${timeoutMs}ms): ${error}`)
    )
  )

export const retryWithBackoff = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
) =>
  effect.pipe(
    Effect.retry({
      times: maxRetries
    })
  )
