import React, { Suspense } from 'react'
import { useMatches, useMatch, createRootRouteWithContext } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from './-components/Layout'
import { AnimatedOutlet } from './-components/AnimatedOutlet'
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
        <ReactQueryDevtools buttonPosition="bottom-right" />
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
