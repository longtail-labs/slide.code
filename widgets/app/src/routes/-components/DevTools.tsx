import React from 'react'

export const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      }))
    )

export const TanStackQueryDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import('@tanstack/react-query-devtools').then((res) => ({
        default: res.ReactQueryDevtools
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      }))
    )
