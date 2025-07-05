import React, { Suspense } from 'react'
import { useMatches, useMatch, createRootRouteWithContext } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from './-components/Layout'
import { AnimatedOutlet } from './-components/AnimatedOutlet'
import { GameWebviewManager } from '@/components/GameWebviewManager'
import { WatchWebviewManager } from '@/components/WatchWebviewManager'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
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
          <AnimatePresence mode="wait">
            <AnimatedOutlet key={nextMatch?.id || match.id} />
          </AnimatePresence>
          <Suspense fallback={null}>
            <TanStackRouterDevtools />
            <ReactQueryDevtools buttonPosition="bottom-right" />
          </Suspense>
        </Layout>
      </WatchWebviewManager>
    </GameWebviewManager>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})
