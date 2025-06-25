import React from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@slide.code/clients'
import { QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '@/components/ui/sidebar'
import { createRouter, createMemoryHistory } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { Spinner } from '@/routes/-components/Spinner'
import { RpcProvider } from '@slide.code/clients'

const history = createMemoryHistory()
const router = createRouter({
  routeTree,
  context: { queryClient },
  history,
  defaultPreload: 'intent',
  defaultPendingComponent: () => (
    <div className={`p-2 text-2xl`}>
      <Spinner />
    </div>
  ),
  defaultPreloadStaleTime: 0
})

await router.load()

export function App() {
  // useEffect(() => {
  //   document.documentElement.classList.remove('dark')
  // }, [])

  return (
    <React.StrictMode>
      <RpcProvider>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
            <RouterProvider router={router} />
          </SidebarProvider>
        </QueryClientProvider>
      </RpcProvider>
    </React.StrictMode>
  )
}
