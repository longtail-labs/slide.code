import { Effect, Fiber, Schedule } from 'effect'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import { UpdateSchema, type UpdateState } from '../../state.js'
import {
  getCurrentVersion,
  getLatestVersion,
  isUpdateAvailable,
  canTriggerUpdateCheckUI,
  triggerUpdateCheckUI
} from '../../utils/index.js'
import { PubSubClient } from '../../services/pubsub.service.js'
import { MessageTypes } from '@slide.code/schema/messages'

/**
 * Initial state for the Update ref
 */
export const initialUpdateState: UpdateState = {
  currentVersion: getCurrentVersion().toString(),
  latestVersion: null,
  isUpdateAvailable: false,
  isCheckingForUpdates: false,
  updateError: null,
  lastChecked: Date.now()
}

/**
 * Errors that can be thrown by the Update ref
 */
export class UpdateRefError extends Error {
  readonly _tag = 'UpdateRefError'

  constructor(message: string) {
    super(message)
    this.name = 'UpdateRefError'
  }
}

/**
 * UpdateRef service for tracking application update state
 */
export class UpdateRef extends Effect.Service<UpdateRef>()('UpdateRef', {
  dependencies: [IPCRefService.Default, PubSubClient.Default],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[UpdateRef] 🚀 Creating UpdateRef')

    // Get the IPCRefService and create the ref
    const refService = yield* IPCRefService
    const ref = yield* refService.create('update', initialUpdateState, UpdateSchema)

    // Get the PubSubClient for message handling
    const pubsub = yield* PubSubClient

    // Service state
    let updateCheckFiber: Fiber.RuntimeFiber<unknown, unknown> | null = null
    let updateCheckInterval: number = 3600000 // 1 hour by default
    let updateSiteURL: string | null = null

    // Subscribe to check for updates messages
    yield* Effect.scoped(
      pubsub.listenTo(MessageTypes.CHECK_FOR_UPDATES, () =>
        Effect.gen(function* () {
          yield* Effect.logInfo('[UpdateRef] Received CHECK_FOR_UPDATES message')
          // yield* checkForUpdatesInternal
          yield* checkForUpdatesInternal.pipe(
            Effect.catchAll((error) =>
              Effect.logError(`[UpdateRef] Update check failed: ${error.message}`)
            )
          )
        })
      )
    )

    // Subscribe to show update dialog messages
    yield* Effect.scoped(
      pubsub.listenTo(MessageTypes.SHOW_UPDATE_DIALOG, (message) =>
        Effect.gen(function* () {
          yield* Effect.logInfo('[UpdateRef] Received SHOW_UPDATE_DIALOG message')

          // First check for updates if requested
          if (message._tag === MessageTypes.SHOW_UPDATE_DIALOG && message.checkForUpdates) {
            yield* checkForUpdatesInternal.pipe(
              Effect.catchAll((error) =>
                Effect.logError(`[UpdateRef] Update check failed: ${error.message}`)
              )
            )
          }

          // Then trigger the update UI
          yield* triggerUpdateUIInternal.pipe(
            Effect.catchAll((error) =>
              Effect.logError(`[UpdateRef] Update UI trigger failed: ${error.message}`)
            )
          )
        })
      )
    )

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[UpdateRef] 🧹 Cleaning up UpdateRef')

        // Stop any update checks in progress
        if (updateCheckFiber) {
          yield* Fiber.interrupt(updateCheckFiber)
          updateCheckFiber = null
        }

        yield* Effect.logInfo('[UpdateRef] 🧹 UpdateRef cleaned up successfully')
        return Effect.void
      })
    )

    /**
     * Initialize update settings
     */
    const initialize = (config: {
      updateSiteURL: string
      checkInterval?: number
      automaticChecks?: boolean
    }): Effect.Effect<boolean> =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[UpdateRef] Initializing with config:', config)

        updateSiteURL = config.updateSiteURL

        if (config.checkInterval) {
          updateCheckInterval = config.checkInterval
        }

        // Start automatic checks if enabled
        if (config.automaticChecks !== false && updateSiteURL) {
          startPeriodicUpdateCheck()
        }

        return true
      })

    /**
     * Start periodic update checking at the defined interval
     */
    function startPeriodicUpdateCheck(): void {
      Effect.logInfo(
        `[UpdateRef] Starting periodic update checks every ${updateCheckInterval / 60000} minutes`
      )

      // Stop any existing update check
      if (updateCheckFiber) {
        Effect.runPromise(Fiber.interrupt(updateCheckFiber))
        updateCheckFiber = null
      }

      // Create a schedule that runs at the specified interval
      const updateSchedule = Schedule.spaced(`${updateCheckInterval} millis`)

      // Run the effect in a separate fiber
      updateCheckFiber = Effect.runFork(
        Effect.gen(function* () {
          yield* Effect.logInfo('[UpdateRef] Running periodic update check')
          yield* checkForUpdatesInternal.pipe(
            Effect.catchAll((error) =>
              Effect.logError(`[UpdateRef] Update check failed: ${error.message}`)
            )
          )
        }).pipe(Effect.repeat(updateSchedule))
      )
    }

    /**
     * Stop periodic update checking
     */
    const stopPeriodicUpdateCheck = Effect.gen(function* () {
      if (updateCheckFiber) {
        yield* Effect.logInfo('[UpdateRef] Stopping periodic update checks')
        yield* Fiber.interrupt(updateCheckFiber)
        updateCheckFiber = null
      }
      return Effect.void
    })

    /**
     * Check for updates and update the ref
     */
    const checkForUpdatesInternal = Effect.gen(function* () {
      // Mark as checking for updates
      yield* ref.update((state) => ({
        ...state,
        isCheckingForUpdates: true,
        updateError: null
      }))

      try {
        // Get current state
        const currentState = yield* ref.get()

        yield* Effect.logInfo('[UpdateRef] Checking for updates...')

        if (!currentState.currentVersion) {
          throw new UpdateRefError('Current version is not set')
        }

        // Get current version
        const currentVersion = getCurrentVersion()

        // Get latest version from server
        let latestVersion
        try {
          if (!updateSiteURL) {
            throw new UpdateRefError('Update site URL is not set')
          }
          latestVersion = yield* getLatestVersion(updateSiteURL)
        } catch (error) {
          throw new UpdateRefError(`Failed to get latest version: ${error}`)
        }

        // Check if update is available
        const updateAvailable = isUpdateAvailable(currentVersion, latestVersion)

        // Update the ref with the latest info
        yield* ref.update((state) => ({
          ...state,
          latestVersion: latestVersion.toString(),
          isUpdateAvailable: updateAvailable,
          isCheckingForUpdates: false,
          lastChecked: Date.now()
        }))

        yield* Effect.logInfo(
          `[UpdateRef] Update check complete. Current: ${currentVersion}, Latest: ${latestVersion}, Update available: ${updateAvailable}`
        )

        return updateAvailable
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        yield* Effect.logError('[UpdateRef] Update check failed:', errorMessage)

        // Update the ref with the error
        yield* ref.update((state) => ({
          ...state,
          isCheckingForUpdates: false,
          updateError: errorMessage,
          lastChecked: Date.now()
        }))

        return yield* Effect.fail(new UpdateRefError(errorMessage))
      }
    })

    /**
     * Trigger the update UI
     */
    const triggerUpdateUIInternal = Effect.gen(function* () {
      const state = yield* ref.get()

      if (!state.isUpdateAvailable) {
        yield* Effect.logInfo('[UpdateRef] No update available to trigger')
        return false
      }

      // Check if we can trigger the update UI
      try {
        const canTrigger = yield* canTriggerUpdateCheckUI

        if (!canTrigger) {
          yield* Effect.logInfo('[UpdateRef] Update UI cannot be triggered at this time')
          return false
        }

        // Trigger the update UI
        yield* triggerUpdateCheckUI
        yield* Effect.logInfo('[UpdateRef] Update UI triggered successfully')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        yield* Effect.logError('[UpdateRef] Failed to trigger update UI:', errorMessage)
        return false
      }
    })

    // Return an object with the ref and methods
    return {
      ref,
      initialize,
      checkForUpdates: checkForUpdatesInternal,
      triggerUpdateUI: triggerUpdateUIInternal,
      startPeriodicUpdateCheck: Effect.sync(() => startPeriodicUpdateCheck()),
      stopPeriodicUpdateCheck
    }
  })
}) {}

/**
 * Live layer for UpdateRef
 */
export const UpdateRefLive = UpdateRef.Default

/**
 * Get the update ref from the service
 */
export const getUpdateRef = Effect.gen(function* () {
  const updateRef = yield* UpdateRef
  return updateRef.ref
})

/**
 * Check for updates (exposed for direct invocation)
 */
export const checkForUpdates = Effect.gen(function* () {
  const updateRef = yield* UpdateRef
  return yield* updateRef.checkForUpdates
})

/**
 * Trigger the update UI (exposed for direct invocation)
 */
export const triggerUpdateUI = Effect.gen(function* () {
  const updateRef = yield* UpdateRef
  return yield* updateRef.triggerUpdateUI
})
