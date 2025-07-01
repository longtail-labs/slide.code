import React, { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@slide.code/clients'
import { QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '@/components/ui/sidebar'
import { createRouter, createMemoryHistory } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { Spinner } from '@/routes/-components/Spinner'
import { RpcProvider } from '@slide.code/clients'
import { Toaster } from '@/components/ui/sonner'

console.log('AppGTG')

import '../assets/styles.css'

const history = createMemoryHistory()
const router = createRouter({
  routeTree,
  context: { queryClient },
  history,
  // defaultPreload: 'intent',
  defaultPendingComponent: () => (
    <div className={`p-2 text-2xl`}>
      <Spinner />
    </div>
  ),
  defaultPreloadStaleTime: 0
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// await router.load()

console.log('AppGTG2')

export function App() {
  useEffect(() => {
    console.log('AppGTG3')
    // document.documentElement.classList.remove('dark')
  }, [])

  return (
    <React.StrictMode>
      <RpcProvider>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
            <div>
              <RouterProvider router={router} />
            </div>
          </SidebarProvider>
        </QueryClientProvider>
      </RpcProvider>
      <Toaster />
    </React.StrictMode>
  )
}
