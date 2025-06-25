import { Effect } from 'effect'
import { v4 as uuidv4 } from 'uuid'
import { UserStateSchema, type UserState } from '../state.js'
import { makePersistedRef, type PersistedRef } from '../resources/persisted-ref.resource.js'

/**
 * Initial state for the User ref
 * Generated with default values that will be replaced on initialization
 */
export const initialUserState: UserState = {
  userId: '',
  installationDate: 0,
  subscribed: false,
  lastSubscriptionCheck: 0
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
 * UserRef service for tracking user identity and subscription status using PersistedRef
 */
export class UserRef extends Effect.Service<UserRef>()('UserRef', {
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[UserRef] 👤 Creating UserRef')

    // Create the persisted ref directly
    const ref = yield* makePersistedRef('user', initialUserState, UserStateSchema, {
      persist: true,
      key: 'user-data'
    })

    // Initialize user data if needed
    yield* initializeUserData(ref)

    /**
     * Update subscription status
     */
    const updateSubscriptionStatus = (subscribed: boolean) =>
      Effect.gen(function* () {
        yield* ref.update((state) => ({
          ...state,
          subscribed,
          lastSubscriptionCheck: Date.now()
        }))
        return true
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
      updateSubscriptionStatus
    }
  })
}) {}

/**
 * Helper function to initialize user data if needed
 */
const initializeUserData = (ref: PersistedRef<UserState>) =>
  Effect.gen(function* () {
    const state = yield* ref.get()

    // If no valid user ID exists, create one
    if (!state.userId) {
      const userId = uuidv4()
      yield* Effect.logInfo('[UserRef] Generating new user ID', { userId })
      yield* ref.update((currentState) => ({
        ...currentState,
        userId,
        installationDate: Date.now(),
        lastSubscriptionCheck: Date.now()
      }))
    }
  })

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
