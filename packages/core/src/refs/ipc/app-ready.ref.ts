import { Effect } from 'effect'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import { AppReadySchema, type AppReadyState } from '@slide.code/schema'

/**
 * Initial state for the AppReady ref
 */
export const initialAppReadyState: AppReadyState = {
  isReady: false,
  error: undefined,
  errorDetails: null,
  timestamp: Date.now(),
  currentTaskId: null
}

/**
 * AppReadyRef service for tracking application ready state
 */
export class AppReadyRef extends Effect.Service<AppReadyRef>()('AppReadyRef', {
  dependencies: [IPCRefService.Default],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[AppReadyRef] ✨ Creating AppReadyRef')

    // Get the IPCRefService and create the ref
    const refService = yield* IPCRefService
    const ref = yield* refService.create('app-ready', initialAppReadyState, AppReadySchema)

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[AppReadyRef] 🧹 Cleaning up AppReadyRef')
        // No need to explicitly clean up as IPCRefService will handle this
        yield* Effect.logInfo('[AppReadyRef] 🧹 AppReadyRef cleaned up successfully')
      })
    )

    /**
     * Set the current task ID (when user navigates to a task)
     */
    const setCurrentTaskId = (taskId: string) =>
      Effect.gen(function* () {
        yield* ref.update((state: AppReadyState) => ({
          ...state,
          currentTaskId: taskId
        }))
      })

    /**
     * Clear the current task ID (when user navigates away from a task)
     */
    const clearCurrentTaskId = () =>
      Effect.gen(function* () {
        yield* ref.update((state: AppReadyState) => ({
          ...state,
          currentTaskId: null
        }))
      })

    // Return the ref API with additional methods
    return {
      ...ref,
      setCurrentTaskId,
      clearCurrentTaskId
    }
  })
}) {}

/**
 * Live layer for AppReadyRef
 */
export const AppReadyRefLive = AppReadyRef.Default

/**
 * Utility to mark the app as ready
 */
export const markAppReady = Effect.gen(function* () {
  const appReadyRef = yield* AppReadyRef
  yield* appReadyRef.update((state: AppReadyState) => ({
    ...state,
    isReady: true,
    timestamp: Date.now()
  }))
})

/**
 * Utility to mark the app as having an error
 */
export const markAppError = (errorMessage: string) =>
  Effect.gen(function* () {
    const appReadyRef = yield* AppReadyRef
    yield* appReadyRef.update((state: AppReadyState) => ({
      ...state,
      error: true,
      errorDetails: errorMessage,
      timestamp: Date.now()
    }))
  })

/**
 * Utility to set the current task ID
 */
export const setCurrentTaskId = (taskId: string) =>
  Effect.gen(function* () {
    const appReadyRef = yield* AppReadyRef
    yield* appReadyRef.setCurrentTaskId(taskId)
  })

/**
 * Utility to clear the current task ID
 */
export const clearCurrentTaskId = () =>
  Effect.gen(function* () {
    const appReadyRef = yield* AppReadyRef
    yield* appReadyRef.clearCurrentTaskId()
  })

/**
 * Utility to get the current task ID
 */
export const getCurrentTaskId = Effect.gen(function* () {
  const appReadyRef = yield* AppReadyRef
  const state = yield* appReadyRef.get()
  return state.currentTaskId
})
