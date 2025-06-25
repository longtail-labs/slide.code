import { useIPCRef } from '../../ipcref/hooks.js'
import { UpdateSchema, type UpdateState } from '@slide.code/schema/state'
import { PubsubClient } from '../../pubsub/index.js'
import { createCheckForUpdates, createShowUpdateDialog } from '@slide.code/schema/messages'

/**
 * Hook for using the update ref
 *
 * @example
 * const [updateState] = useUpdateRef()
 *
 * // Access update info
 * console.log(updateState?.currentVersion)
 * console.log(updateState?.isUpdateAvailable)
 */
export function useUpdateRef() {
  return useIPCRef<UpdateState>('update', UpdateSchema)
}

/**
 * Hook for accessing update information
 * Returns current version, update availability, and functions to check for updates
 */
export function useUpdate() {
  const [updateState] = useUpdateRef()
  const pubsub = PubsubClient.getInstance()

  // Function to check for updates (sends a message via pubsub)
  const checkForUpdates = () => {
    pubsub.publish(createCheckForUpdates())
  }

  // Function to show the update dialog (sends a message via pubsub)
  const showUpdateDialog = (checkForUpdates = true) => {
    pubsub.publish(createShowUpdateDialog(checkForUpdates))
  }

  return {
    currentVersion: updateState?.currentVersion || '',
    latestVersion: updateState?.latestVersion || null,
    isUpdateAvailable: updateState?.isUpdateAvailable || false,
    isCheckingForUpdates: updateState?.isCheckingForUpdates || false,
    updateError: updateState?.updateError || null,
    lastChecked: updateState?.lastChecked || 0,
    checkForUpdates,
    showUpdateDialog
  }
}
