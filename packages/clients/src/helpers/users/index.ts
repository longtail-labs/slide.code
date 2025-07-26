import { useIPCRef } from '../../ipcref/hooks.js'
import { UserStateSchema, type UserState } from '@slide.code/schema'

/**
 * Hook for accessing the user ref state
 * Returns user state for basic user configuration
 *
 * @example
 * const [userState, setUserState, updateUserState] = useUserRef()
 *
 * // Access user info
 * console.log(userState?.userId)
 *
 * // Update user settings
 * updateUserState((state) => ({
 *   ...state,
 *   subscribed: true
 * }))
 */
export function useUserRef() {
  return useIPCRef<UserState>('user', UserStateSchema)
}

/**
 * Hook for managing user subscription status
 */
export function useUserSubscription() {
  const [userState, , updateUserState] = useUserRef()

  const subscribed = userState?.subscribed || false
  const lastSubscriptionCheck = userState?.lastSubscriptionCheck || 0

  const updateSubscriptionStatus = (subscribed: boolean) => {
    updateUserState((state) => ({
      ...state,
      subscribed,
      lastSubscriptionCheck: Date.now()
    }))
  }

  return {
    subscribed,
    lastSubscriptionCheck,
    updateSubscriptionStatus
  }
}

/**
 * Hook for managing vibe directory setting
 */
export function useVibeDirectory() {
  const [userState, , updateUserState] = useUserRef()

  const vibeDirectory = userState?.vibeDirectory || undefined

  const updateVibeDirectory = (directory: string | undefined) => {
    updateUserState((state) => ({
      ...state,
      vibeDirectory: directory
    }))
  }

  return {
    vibeDirectory,
    updateVibeDirectory
  }
}
