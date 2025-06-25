import React, { Suspense } from 'react'
import { useMatches, useMatch, createRootRouteWithContext } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { TanStackRouterDevtools, TanStackQueryDevtools } from '../routes/-components/DevTools.js'
import Layout from './-components/Layout'
import { AnimatedOutlet } from './-components/AnimatedOutlet.js'
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
    <Layout>
      <AnimatePresence mode="wait">
        <AnimatedOutlet key={nextMatch?.id || match.id} />
      </AnimatePresence>
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
        <TanStackQueryDevtools />
      </Suspense>
    </Layout>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})

// export const Route = createRootRoute({
//   component: () => {
//     const router = useRouter()

//     return (
//       <Layout>
//         <div className="p-6">
//           <AnimatePresence mode="wait">
//             <AnimatedOutlet key={router.state.location.pathname} />
//           </AnimatePresence>
//           <Suspense fallback={null}>
//             <TanStackRouterDevtools />
//           </Suspense>
//         </div>
//       </Layout>
//     )
//   }
// })

// export const Route = createRootRoute({
//   component: () => (
//     <Layout>
//       <div className="p-6">
//         <Outlet />
//         <Suspense fallback={null}>
//           <TanStackRouterDevtools />
//         </Suspense>
//       </div>
//     </Layout>
//   )
// })
