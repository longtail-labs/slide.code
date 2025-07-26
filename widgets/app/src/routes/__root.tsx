import React, { Suspense } from 'react'
import {
  useMatches,
  useMatch,
  createRootRouteWithContext,
  useNavigate
} from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from './-components/Layout'
import { AnimatedOutlet } from './-components/AnimatedOutlet'
import { GameWebviewManager } from '@/components/GameWebviewManager'
import { WatchWebviewManager } from '@/components/WatchWebviewManager'
import { useAppReadyRef } from '@slide.code/clients'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

/**
 * Global navigation listener component
 * Watches for currentTaskId changes and navigates to the task when set
 */
function GlobalNavigationListener() {
  const [appReadyState, , updateAppReadyState] = useAppReadyRef()
  const navigate = useNavigate()

  React.useEffect(() => {
    // Only navigate if we have a currentTaskId
    if (appReadyState?.currentTaskId) {
      const taskId = appReadyState.currentTaskId

      console.log('[GlobalNavigationListener] Navigating to task:', taskId)

      // Navigate to the task
      navigate({
        to: '/working/$taskId',
        params: { taskId }
      })
        .then(() => {
          console.log('[GlobalNavigationListener] Navigation successful')
        })
        .catch((error) => {
          console.error('[GlobalNavigationListener] Navigation failed:', error)

          // Clear the currentTaskId even if navigation fails to prevent loops
          updateAppReadyState((state) => ({
            ...state,
            currentTaskId: null
          }))
        })
    }
  }, [appReadyState?.currentTaskId, navigate, updateAppReadyState])

  return null // This component doesn't render anything
}

const RootComponent = () => {
  const matches = useMatches()
  const match = useMatch({ strict: false })
  const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1
  const nextMatch = matches[nextMatchIndex]

  return (
    <GameWebviewManager>
      <WatchWebviewManager>
        <Layout>
          <GlobalNavigationListener />
          <AnimatePresence mode="wait">
            <AnimatedOutlet key={nextMatch?.id || match.id} />
          </AnimatePresence>
          {/* <Suspense fallback={null}>
            <TanStackRouterDevtools />
            <ReactQueryDevtools buttonPosition="bottom-right" />
          </Suspense> */}
        </Layout>
      </WatchWebviewManager>
    </GameWebviewManager>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})
