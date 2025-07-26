import ElectronStore from 'electron-store'
import { Effect } from 'effect'

// Create a singleton instance of ElectronStore
const store = new ElectronStore()

/**
 * Interface for stored token data
 */
export interface TokenData {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  profile?: Record<string, any> | null
  entitlements?: string[]
}

/**
 * Utility functions for working with Electron Store
 */
export const ElectronStoreUtil = {
  /**
   * Get a value from the store
   */
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    return store.get(key, defaultValue) as T | undefined
  },

  /**
   * Set a value in the store
   */
  set: <T>(key: string, value: T): void => {
    store.set(key, value)
  },

  /**
   * Delete a value from the store
   */
  delete: (key: string): void => {
    store.delete(key)
  },

  /**
   * Check if a key exists in the store
   */
  has: (key: string): boolean => {
    return store.has(key)
  },

  /**
   * Clear the entire store
   */
  clear: (): void => {
    store.clear()
  },

  /**
   * Store tokens in the Electron Store
   */
  storeTokens: (key: string, accessToken: string, refreshToken?: string, expiresIn?: number) =>
    Effect.sync(() => {
      const tokensData: TokenData = {
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
        profile: null
      }

      store.set(key, tokensData)
      return true
    }),

  /**
   * Load tokens from the Electron Store
   */
  loadTokens: (key: string) =>
    Effect.sync(() => {
      if (!store.has(key)) {
        return null
      }

      const tokensData = store.get(key) as TokenData | undefined

      if (!tokensData) {
        return null
      }

      return tokensData
    })
}

// Export the store instance directly for advanced use cases
export const electronStore = store
