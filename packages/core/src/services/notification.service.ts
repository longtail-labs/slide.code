import { Effect, Layer } from 'effect'
import { app, BrowserWindow } from 'electron'
import { AppReadyRef } from '../refs/ipc/app-ready.ref.js'
import {
  showTaskCompletionNotification,
  showNotification,
  type NotificationConfig
} from '../utils/notification.util.js'
import log from 'electron-log'

/**
 * NotificationService for managing app notifications with app activation and task navigation
 */
export class NotificationService extends Effect.Service<NotificationService>()(
  'NotificationService',
  {
    dependencies: [AppReadyRef.Default],
    scoped: Effect.gen(function* () {
      yield* Effect.logInfo('[NotificationService] 🔔 Creating NotificationService')

      const appReadyRef = yield* AppReadyRef

      /**
       * Activate/focus the Electron app
       */
      const activateApp = () =>
        Effect.sync(() => {
          try {
            log.info('[NotificationService] 🔵 Activating app')

            // Different activation strategies for different platforms
            if (process.platform === 'darwin') {
              // macOS
              app.dock?.show()
              app.focus({ steal: true })
            } else if (process.platform === 'win32') {
              // Windows - focus all windows
              const windows = BrowserWindow.getAllWindows()
              windows.forEach((window: BrowserWindow) => {
                if (!window.isDestroyed()) {
                  window.restore() // Restore if minimized
                  window.focus() // Focus the window
                  window.show() // Ensure it's visible
                }
              })
            } else {
              // Linux and others
              const windows = BrowserWindow.getAllWindows()
              windows.forEach((window: BrowserWindow) => {
                if (!window.isDestroyed()) {
                  window.focus()
                  window.show()
                }
              })
            }

            log.info('[NotificationService] ✅ App activation completed')
          } catch (error) {
            log.error('[NotificationService] ❌ Failed to activate app:', error)
          }
        })

      /**
       * Show a task completion notification with app activation and task navigation
       * @param taskId - The ID of the task
       * @param taskName - The name of the task
       * @param status - The completion status
       * @param options - Additional notification options
       */
      const showTaskNotificationWithNavigation = (
        taskId: string,
        taskName: string,
        status: 'completed' | 'failed' | 'cancelled',
        options?: Partial<NotificationConfig>
      ) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `[NotificationService] 🔔 Showing task notification: ${taskName} (${status})`
          )

          // Show the notification with click handler
          yield* showTaskCompletionNotification(taskName, status, {
            ...options,
            onClick: () => {
              // Run the activation and navigation in a forked Effect
              Effect.runFork(
                Effect.gen(function* () {
                  yield* Effect.logInfo(
                    `[NotificationService] 🔔 Notification clicked for task: ${taskId} (${taskName})`
                  )

                  console.log(
                    `[NotificationService] 🔔 Notification clicked for task: ${taskId} (${taskName})`
                  )
                  console.log(`[NotificationService] 🔔 Task status: ${status}`)

                  // Activate the app first
                  yield* activateApp()

                  // Set the current task ID so the UI can navigate to it
                  yield* appReadyRef.setCurrentTaskId(taskId)

                  yield* Effect.logInfo(
                    `[NotificationService] ✅ App activated and task set: ${taskId}`
                  )

                  console.log(`[NotificationService] ✅ App activated and task set: ${taskId}`)
                }).pipe(
                  Effect.catchAll((error) =>
                    Effect.logError(
                      `[NotificationService] ❌ Failed to handle notification click: ${error}`
                    )
                  )
                )
              )
            }
          })

          yield* Effect.logInfo(
            `[NotificationService] ✅ Task notification shown successfully: ${taskName}`
          )
        })

      /**
       * Show a generic notification with app activation
       * @param config - The notification configuration
       * @param shouldActivateApp - Whether to activate the app on click (default: true)
       */
      const showNotificationWithActivation = (
        config: NotificationConfig,
        shouldActivateApp: boolean = true
      ) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`[NotificationService] 🔔 Showing notification: ${config.title}`)

          const originalOnClick = config.onClick

          yield* showNotification({
            ...config,
            onClick: shouldActivateApp
              ? () => {
                  // Run the activation in a forked Effect
                  Effect.runFork(
                    Effect.gen(function* () {
                      yield* activateApp()

                      // Call the original onClick if provided
                      if (originalOnClick) {
                        originalOnClick()
                      }
                    }).pipe(
                      Effect.catchAll((error) =>
                        Effect.logError(
                          `[NotificationService] ❌ Failed to handle notification click: ${error}`
                        )
                      )
                    )
                  )
                }
              : originalOnClick
          })

          yield* Effect.logInfo(
            `[NotificationService] ✅ Notification shown successfully: ${config.title}`
          )
        })

      /**
       * Check if app activation is supported on the current platform
       */
      const isAppActivationSupported = () =>
        Effect.sync(() => {
          return (
            process.platform === 'darwin' ||
            process.platform === 'win32' ||
            process.platform === 'linux'
          )
        })

      // Register cleanup
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Effect.logInfo('[NotificationService] 🧹 Cleaning up NotificationService')
        })
      )

      return {
        showTaskNotificationWithNavigation,
        showNotificationWithActivation,
        activateApp,
        isAppActivationSupported
      }
    })
  }
) {}

/**
 * Live layer for NotificationService
 */
export const NotificationServiceLive = NotificationService.Default

/**
 * Helper to show task completion notification with navigation (direct access)
 */
export const showTaskNotificationWithNavigation = (
  taskId: string,
  taskName: string,
  status: 'completed' | 'failed' | 'cancelled',
  options?: Partial<NotificationConfig>
) =>
  Effect.gen(function* () {
    const notificationService = yield* NotificationService
    return yield* notificationService.showTaskNotificationWithNavigation(
      taskId,
      taskName,
      status,
      options
    )
  })

/**
 * Helper to show notification with app activation (direct access)
 */
export const showNotificationWithActivation = (
  config: NotificationConfig,
  shouldActivateApp?: boolean
) =>
  Effect.gen(function* () {
    const notificationService = yield* NotificationService
    return yield* notificationService.showNotificationWithActivation(config, shouldActivateApp)
  })

/**
 * Helper to activate the app (direct access)
 */
export const activateApp = () =>
  Effect.gen(function* () {
    const notificationService = yield* NotificationService
    return yield* notificationService.activateApp()
  })
