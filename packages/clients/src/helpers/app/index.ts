import { useIPCRef } from '../../ipcref/hooks.js'
import { AppReadySchema, type AppReadyState } from '@slide.code/schema/state'
import { useQuery } from '@tanstack/react-query'
import { useRpc } from '../../rpc/provider.js'

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

/**
 * Hook for accessing the current task ID
 * Returns the current task ID or null if none is set
 */
export function useCurrentTaskId() {
  const [appReady] = useAppReadyRef()
  return appReady?.currentTaskId || null
}

// Hook to get the webview preload script path
export const useWebviewPreloadPath = () => {
  const { runRpcProgram } = useRpc()

  return useQuery<string, Error>({
    queryKey: ['webview-preload-path'],
    queryFn: async () => {
      console.log('[APP-HELPERS] 🔍 Starting webview preload path query...')
      try {
        const path = await runRpcProgram((client) => {
          console.log('[APP-HELPERS] 🔍 Calling GetWebviewPreloadPath RPC...')
          return client.GetWebviewPreloadPath()
        })
        console.log('[APP-HELPERS] ✅ WEBVIEW-PRELOAD-PATH:', path)
        return path
      } catch (error) {
        console.error('[APP-HELPERS] ❌ Error getting webview preload path:', error)
        throw error
      }
    },
    staleTime: Infinity, // Path doesn't change during app session
    gcTime: Infinity, // Keep in cache for entire session
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Always refetch on mount for debugging
  })
}
