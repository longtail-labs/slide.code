import { Effect } from 'effect'
import { v4 as uuidv4 } from 'uuid'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import { UserStateSchema, type UserState } from '@slide.code/schema'
import { ElectronStoreUtil } from '../../utils/electron-store.util.js'
/**
 * Initial state for the User ref
 * Generated with default values that will be replaced on initialization
 */
export const initialUserState: UserState = {
  userId: '',
  installationDate: 0,
  subscribed: false,
  lastSubscriptionCheck: 0,
  claudeCode: {
    executablePath: null,
    lastDetected: null,
    stats: { totalRequests: 0, totalCost: 0, lastUsed: null }
  },
  vibeDirectory: ''
}

/**
 * Errors that can be thrown by the User ref
 */
export class UserRefError extends Error {
  readonly _tag = 'UserRefError'

  constructor(message: string) {
    super(message)
    this.name = 'UserRefError'
  }
}

/**
 * UserRef service for tracking user identity and subscription status
 */
export class UserRef extends Effect.Service<UserRef>()('UserRef', {
  dependencies: [IPCRefService.Default],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[UserRef] 👤 Creating UserRef')

    // Get the IPCRefService and create the ref
    const refService = yield* IPCRefService

    // Check if we already have a user ID in storage
    const existingUserData = ElectronStoreUtil.get('user-data')

    console.log('[UserRef] existingUserData', existingUserData)

    // Initialize the user state
    let userState = initialUserState

    if (existingUserData) {
      try {
        // Use existing user data directly since claudeCode is now optional
        yield* Effect.logInfo('[UserRef] Using existing user data')
        userState = existingUserData as UserState
      } catch (error) {
        yield* Effect.logWarning(`[UserRef] Error loading existing user data: ${error}`)
        // Will create new user data below
      }
    }

    // If no valid user ID exists, create one
    if (!userState.userId) {
      const userId = uuidv4()
      yield* Effect.logInfo('[UserRef] Generating new user ID', { userId })
      userState = {
        ...userState,
        userId,
        installationDate: Date.now(),
        lastSubscriptionCheck: Date.now()
      }
    }

    // Create the ref with persistence
    const ref = yield* refService.create('user', userState, UserStateSchema, {
      persist: true,
      key: 'user-data'
    })

    /**
     * Update subscription status
     */
    const updateSubscriptionStatus = (subscribed: boolean) =>
      Effect.gen(function* () {
        console.log('[UserRef] updateSubscriptionStatus', subscribed)
        yield* ref.update((state) => ({
          ...state,
          subscribed,
          lastSubscriptionCheck: Date.now()
        }))
        return true
      })

    /**
     * Update the vibe directory path
     */
    const updateVibeDirectory = (vibeDirectory: string) =>
      Effect.gen(function* () {
        console.log('[UserRef] updateVibeDirectory', vibeDirectory)
        yield* ref.update((state) => ({
          ...state,
          vibeDirectory
        }))
        return true
      })

    /**
     * Update Claude Code executable path
     */
    const updateClaudeCodeExecutablePath = (executablePath: string | null) =>
      Effect.gen(function* () {
        console.log('[UserRef] updateClaudeCodeExecutablePath', executablePath)
        yield* ref.update((state) => ({
          ...state,
          claudeCode: {
            executablePath,
            lastDetected: executablePath ? Date.now() : null,
            stats: state.claudeCode?.stats || {
              totalRequests: 0,
              totalCost: 0,
              lastUsed: null
            }
          }
        }))
        return true
      })

    /**
     * Update Claude Code usage stats
     */
    const updateClaudeCodeStats = (stats: { requests?: number; cost?: number }) =>
      Effect.gen(function* () {
        console.log('[UserRef] updateClaudeCodeStats', stats)
        yield* ref.update((state) => {
          const currentClaudeCode = state.claudeCode || {
            executablePath: null,
            lastDetected: null,
            stats: { totalRequests: 0, totalCost: 0, lastUsed: null }
          }

          return {
            ...state,
            claudeCode: {
              ...currentClaudeCode,
              stats: {
                totalRequests: currentClaudeCode.stats.totalRequests + (stats.requests || 0),
                totalCost: currentClaudeCode.stats.totalCost + (stats.cost || 0),
                lastUsed: Date.now()
              }
            }
          }
        })
        return true
      })

    /**
     * Get Claude Code configuration
     */
    const getClaudeCodeConfig = Effect.gen(function* () {
      const state = yield* ref.get()
      return (
        state.claudeCode || {
          executablePath: null,
          lastDetected: null,
          stats: { totalRequests: 0, totalCost: 0, lastUsed: null }
        }
      )
    })

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[UserRef] 🧹 Cleaning up UserRef')
        yield* Effect.logInfo('[UserRef] 🧹 UserRef cleaned up successfully')
      })
    )

    // Return the service API
    return {
      ref,
      updateSubscriptionStatus,
      updateVibeDirectory,
      updateClaudeCodeExecutablePath,
      updateClaudeCodeStats,
      getClaudeCodeConfig
    }
  })
}) {}

/**
 * Live layer for UserRef
 */
export const UserRefLive = UserRef.Default

/**
 * Get the user ref from the service
 */
export const getUserRef = Effect.gen(function* () {
  const userRef = yield* UserRef
  return userRef.ref
})

/**
 * Get the user ID
 */
export const getUserId = Effect.gen(function* () {
  const userRef = yield* UserRef
  const state = yield* userRef.ref.get()
  console.log('[DEBUGSTRIPE] getUserId', state)
  return state.userId
})

/**
 * Get the installation date
 */
export const getInstallationDate = Effect.gen(function* () {
  const userRef = yield* UserRef
  const state = yield* userRef.ref.get()
  return state.installationDate
})

/**
 * Check if the user is subscribed
 */
export const isUserSubscribed = Effect.gen(function* () {
  const userRef = yield* UserRef
  const state = yield* userRef.ref.get()
  return state.subscribed
})

/**
 * Update subscription status (exposed for direct invocation)
 */
export const updateSubscriptionStatus = (subscribed: boolean) =>
  Effect.gen(function* () {
    const userRef = yield* UserRef
    return yield* userRef.updateSubscriptionStatus(subscribed)
  })

/**
 * Update the vibe directory path (exposed for direct invocation)
 */
export const updateVibeDirectory = (vibeDirectory: string) =>
  Effect.gen(function* () {
    const userRef = yield* UserRef
    return yield* userRef.updateVibeDirectory(vibeDirectory)
  })

/**
 * Update Claude Code executable path (exposed for direct invocation)
 */
export const updateClaudeCodeExecutablePath = (executablePath: string | null) =>
  Effect.gen(function* () {
    const userRef = yield* UserRef
    return yield* userRef.updateClaudeCodeExecutablePath(executablePath)
  })

/**
 * Update Claude Code usage stats (exposed for direct invocation)
 */
export const updateClaudeCodeStats = (stats: { requests?: number; cost?: number }) =>
  Effect.gen(function* () {
    const userRef = yield* UserRef
    return yield* userRef.updateClaudeCodeStats(stats)
  })

/**
 * Get Claude Code configuration (exposed for direct invocation)
 */
export const getClaudeCodeConfig = () =>
  Effect.gen(function* () {
    const userRef = yield* UserRef
    return yield* userRef.getClaudeCodeConfig
  })

/**
 * Get Claude Code executable path
 */
export const getClaudeCodeExecutablePath = Effect.gen(function* () {
  const config = yield* getClaudeCodeConfig()
  return config.executablePath
})
