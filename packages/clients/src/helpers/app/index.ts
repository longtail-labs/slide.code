import { useIPCRef } from '../../ipcref/hooks.js'
import { AppReadySchema, type AppReadyState } from '@slide.code/schema/state'

/**
 * Hook for using the app-ready ref
 *
 * @example
 * const [appReady] = useAppReadyRef()
 *
 * if (appReady?.isReady) {
 *   return <YourApp />
 * }
 *
 * if (appReady?.error) {
 *   return <ErrorDisplay error={appReady.error} />
 * }
 *
 * return <LoadingScreen />
 */
export function useAppReadyRef() {
  return useIPCRef<AppReadyState>('app-ready', AppReadySchema)
}

/**
 * Hook for detecting when the app is ready
 * Returns true if the app is ready, false otherwise
 */
export function useAppReady() {
  const [appReady] = useAppReadyRef()
  return appReady?.isReady || false
}
