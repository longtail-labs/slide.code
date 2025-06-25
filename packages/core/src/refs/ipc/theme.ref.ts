import { Effect, Stream } from 'effect'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import { ThemeSchema, type ThemeState } from '../../state.js'
import { nativeTheme } from 'electron'

/**
 * Initial state for the Theme ref
 */
export const initialThemeState: ThemeState = {
  current: 'system',
  effectiveTheme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
  timestamp: Date.now()
}

/**
 * ThemeRef service for tracking application theme state
 */
export class ThemeRef extends Effect.Service<ThemeRef>()('ThemeRef', {
  dependencies: [IPCRefService.Default],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[ThemeRef] 🎨 Creating ThemeRef')

    // Get the IPCRefService and create the ref
    const refService = yield* IPCRefService
    const ref = yield* refService.create('theme', initialThemeState, ThemeSchema, {
      persist: true,
      key: 'app-theme'
    })

    // Setup listener for system theme changes
    let themeUpdateListener: (() => void) | null = null

    setupThemeListener()

    /**
     * Set up listener for system theme changes
     */
    function setupThemeListener(): void {
      // Remove existing listener if any
      if (themeUpdateListener) {
        nativeTheme.off('updated', themeUpdateListener)
      }

      // Create and add new listener
      themeUpdateListener = () => {
        // Run the syncSystemTheme effect when system theme changes
        Effect.runPromise(syncSystemThemeInternal())
          .then(() => console.log('[ThemeRef] System theme change handled'))
          .catch((err) => console.error('[ThemeRef] Error syncing system theme:', err))
      }

      // Add the listener
      nativeTheme.on('updated', themeUpdateListener)
    }

    /**
     * Internal implementation of syncSystemTheme that doesn't depend on the service instance
     */
    function syncSystemThemeInternal() {
      return Effect.gen(function* () {
        const state = yield* ref.get()

        // Only update if the current theme is set to system
        if (state.current === 'system') {
          const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
          yield* ref.update((currentState: ThemeState) => ({
            ...currentState,
            effectiveTheme: systemTheme,
            timestamp: Date.now()
          }))
        }
      })
    }

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[ThemeRef] 🧹 Cleaning up ThemeRef')

        // Clean up theme listener
        if (themeUpdateListener) {
          nativeTheme.off('updated', themeUpdateListener)
          themeUpdateListener = null
        }

        yield* Effect.logInfo('[ThemeRef] 🧹 ThemeRef cleaned up successfully')
      })
    )

    // Return the ref API directly to match the previous interface
    return ref
  })
}) {}

/**
 * Live layer for ThemeRef
 */
export const ThemeRefLive = ThemeRef.Default

/**
 * Utility to set the current theme
 */
export const setTheme = (theme: 'dark' | 'light' | 'system') =>
  Effect.gen(function* () {
    const themeRef = yield* ThemeRef

    // Also set the native theme to match for consistent system appearance
    nativeTheme.themeSource = theme === 'system' ? 'system' : theme

    if (theme === 'system') {
      // Set the current theme to system and the effective theme to the system preference
      const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      yield* themeRef.update((state: ThemeState) => ({
        ...state,
        current: 'system',
        effectiveTheme: systemTheme,
        timestamp: Date.now()
      }))
    } else {
      // Set both current and effective theme to the selected theme
      yield* themeRef.update((state: ThemeState) => ({
        ...state,
        current: theme,
        effectiveTheme: theme,
        timestamp: Date.now()
      }))
    }
  })

/**
 * Utility to sync the theme with system changes
 * This can be called externally if needed, but
 * the ThemeRef service already listens for system changes
 */
export const syncSystemTheme = Effect.gen(function* () {
  const themeRef = yield* ThemeRef
  const state = yield* themeRef.get()

  // Only update if the current theme is set to system
  if (state.current === 'system') {
    const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    yield* themeRef.update((currentState: ThemeState) => ({
      ...currentState,
      effectiveTheme: systemTheme,
      timestamp: Date.now()
    }))
  }
})

export const getTheme = Effect.gen(function* () {
  const themeRef = yield* ThemeRef
  const state = yield* themeRef.get()
  return state.effectiveTheme
})

/**
 * Utility to listen for theme changes with a callback
 * @param callback Function that receives the new theme value ('dark' or 'light')
 * @returns Effect that manages the subscription
 *
 * @example
 * // In a component or service that needs to react to theme changes:
 * Effect.runPromise(
 *   onThemeChange((newTheme) => {
 *     console.log(`Theme changed to: ${newTheme}`);
 *     // Update UI or other theme-dependent elements
 *   })
 * );
 *
 * // To clean up the subscription when no longer needed:
 * Effect.runPromise(
 *   Effect.gen(function* () {
 *     // Start the subscription and get the fiber
 *     const fiber = yield* onThemeChange((theme) => console.log(`Theme: ${theme}`));
 *
 *     // Later, interrupt the subscription when done
 *     yield* Effect.delay(Effect.interrupt(fiber), 10000); // Stop after 10 seconds
 *   })
 * );
 */
export const onThemeChange = (callback: (theme: 'dark' | 'light') => void) =>
  Effect.gen(function* () {
    const themeRef = yield* ThemeRef

    // Get the subscription ref's changes stream
    const changes = themeRef.ref.changes

    // Map the stream to only emit when effectiveTheme changes
    const effectiveThemeChanges = Stream.map(changes, (state: ThemeState) => state.effectiveTheme)

    // We only care about distinct theme changes, not every state update
    const distinctThemeChanges = Stream.changes(effectiveThemeChanges)

    // Run the stream, executing the callback for each theme change
    const fiber = yield* Stream.runForEach(distinctThemeChanges, (theme) =>
      Effect.sync(() => callback(theme))
    ).pipe(Effect.fork)

    // Return the fiber so it can be interrupted if needed
    return fiber
  })

export const toggleTheme = Effect.gen(function* () {
  const themeRef = yield* ThemeRef
  const state = yield* themeRef.get()
  const newTheme = state.effectiveTheme === 'dark' ? 'light' : 'dark'
  yield* setTheme(newTheme)
})
