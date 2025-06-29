import { Effect } from 'effect'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import { AppReadySchema, type AppReadyState } from '@slide.code/schema'

/**
 * Initial state for the AppReady ref
 */
export const initialAppReadyState: AppReadyState = {
  isReady: false,
  error: null,
  timestamp: Date.now()
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

    // Return the ref API directly to match the previous interface
    return ref
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
export const markAppError = (error: string) =>
  Effect.gen(function* () {
    const appReadyRef = yield* AppReadyRef
    yield* appReadyRef.update((state: AppReadyState) => ({
      ...state,
      error,
      timestamp: Date.now()
    }))
  })
