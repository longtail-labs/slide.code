import { Effect } from 'effect'
import { Notification } from 'electron'
import log from 'electron-log'

/**
 * Notification types with their corresponding configurations
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning'

/**
 * Configuration for a notification
 */
export interface NotificationConfig {
  type: NotificationType
  title: string
  body: string
  silent?: boolean
  icon?: string
  actions?: Array<{
    type: 'button'
    text: string
  }>
  onClick?: () => void
  onAction?: (actionIndex: number) => void
  onClose?: () => void
}

/**
 * Default notification configurations for different types
 */
const defaultConfigs: Record<NotificationType, Partial<NotificationConfig>> = {
  success: {
    silent: false,
    icon: undefined // Could add success icon path here
  },
  error: {
    silent: false,
    icon: undefined // Could add error icon path here
  },
  info: {
    silent: true,
    icon: undefined // Could add info icon path here
  },
  warning: {
    silent: false,
    icon: undefined // Could add warning icon path here
  }
}

// Store notifications to prevent garbage collection
const activeNotifications = new Map<string, Notification>()

/**
 * Show a native OS notification using Electron's Notification API
 * @param config - The notification configuration
 * @returns Effect that shows the notification
 */
export const showNotification = (config: NotificationConfig): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[Notification] Showing ${config.type} notification: ${config.title}`)

    // Check if notifications are supported
    if (!Notification.isSupported()) {
      yield* Effect.logWarning('[Notification] Native notifications not supported on this platform')
      return
    }

    // Merge with default config for the type
    const mergedConfig = { ...defaultConfigs[config.type], ...config }

    // Create the notification in a try-catch Effect
    yield* Effect.try({
      try: () => {
        console.log('[Notification] Creating notification with title:', mergedConfig.title)

        const notification = new Notification({
          title: mergedConfig.title,
          body: mergedConfig.body,
          silent: mergedConfig.silent,
          icon: mergedConfig.icon,
          actions: mergedConfig.actions
        })

        // Generate unique ID for this notification
        const notificationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Store notification to prevent garbage collection
        activeNotifications.set(notificationId, notification)
        console.log('[Notification] Stored notification with ID:', notificationId)

        // Set up event handlers BEFORE calling show()
        if (mergedConfig.onClick) {
          console.log('[Notification] Setting up click handler')
          notification.on('click', () => {
            console.log('[Notification] Click event fired!')
            mergedConfig.onClick!()
          })
        }

        if (mergedConfig.onAction) {
          console.log('[Notification] Setting up action handler')
          notification.on('action', (_, actionIndex) => {
            console.log('[Notification] Action event fired:', actionIndex)
            mergedConfig.onAction!(actionIndex)
          })
        }

        if (mergedConfig.onClose) {
          console.log('[Notification] Setting up close handler')
          notification.on('close', () => {
            console.log('[Notification] Close event fired')
            // Clean up stored notification
            activeNotifications.delete(notificationId)
            mergedConfig.onClose!()
          })
        } else {
          // Set up default close handler to clean up
          notification.on('close', () => {
            console.log('[Notification] Default close handler - cleaning up notification')
            activeNotifications.delete(notificationId)
          })
        }

        // Show the notification
        console.log('[Notification] Calling show() method')
        notification.show()
        console.log('[Notification] show() method called successfully')

        log.info(`[Notification] Successfully showed ${config.type} notification: ${config.title}`)
      },
      catch: (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.error(`[Notification] Failed to show notification: ${errorMessage}`)
        console.error('[Notification] Error details:', error)
        return new Error(`Failed to show notification: ${errorMessage}`)
      }
    })

    yield* Effect.logInfo(`[Notification] Successfully showed ${config.type} notification`)
  })

/**
 * Show a success notification
 * @param title - The notification title
 * @param body - The notification body
 * @param options - Additional options
 * @returns Effect that shows the success notification
 */
export const showSuccessNotification = (
  title: string,
  body: string,
  options?: Partial<NotificationConfig>
): Effect.Effect<void, Error> =>
  showNotification({
    type: 'success',
    title,
    body,
    ...options
  })

/**
 * Show an error notification
 * @param title - The notification title
 * @param body - The notification body
 * @param options - Additional options
 * @returns Effect that shows the error notification
 */
export const showErrorNotification = (
  title: string,
  body: string,
  options?: Partial<NotificationConfig>
): Effect.Effect<void, Error> =>
  showNotification({
    type: 'error',
    title,
    body,
    ...options
  })

/**
 * Show an info notification
 * @param title - The notification title
 * @param body - The notification body
 * @param options - Additional options
 * @returns Effect that shows the info notification
 */
export const showInfoNotification = (
  title: string,
  body: string,
  options?: Partial<NotificationConfig>
): Effect.Effect<void, Error> =>
  showNotification({
    type: 'info',
    title,
    body,
    ...options
  })

/**
 * Show a warning notification
 * @param title - The notification title
 * @param body - The notification body
 * @param options - Additional options
 * @returns Effect that shows the warning notification
 */
export const showWarningNotification = (
  title: string,
  body: string,
  options?: Partial<NotificationConfig>
): Effect.Effect<void, Error> =>
  showNotification({
    type: 'warning',
    title,
    body,
    ...options
  })

/**
 * Show a task completion notification
 * @param taskName - The name of the completed task
 * @param status - The completion status
 * @param options - Additional options
 * @returns Effect that shows the task completion notification
 */
export const showTaskCompletionNotification = (
  taskName: string,
  status: 'completed' | 'failed' | 'cancelled',
  options?: Partial<NotificationConfig>
): Effect.Effect<void, Error> => {
  const statusConfig = {
    completed: {
      type: 'success' as const,
      title: '✅ Task Completed',
      body: `${taskName} has been completed successfully!`
    },
    failed: {
      type: 'error' as const,
      title: '❌ Task Failed',
      body: `${taskName} has failed to complete.`
    },
    cancelled: {
      type: 'warning' as const,
      title: '⚠️ Task Cancelled',
      body: `${taskName} was cancelled.`
    }
  }

  const config = statusConfig[status]
  return showNotification({
    ...config,
    ...options
  })
}

/**
 * Check if notifications are supported and available
 * @returns Effect that resolves to true if notifications are supported
 */
export const isNotificationSupported = (): Effect.Effect<boolean> =>
  Effect.sync(() => {
    try {
      return Notification.isSupported()
    } catch (error) {
      log.warn('[Notification] Error checking notification support:', error)
      return false
    }
  })
