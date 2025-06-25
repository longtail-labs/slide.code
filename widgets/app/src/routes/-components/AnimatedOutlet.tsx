import { forwardRef, useContext, useRef } from 'react'
import { Outlet, getRouterContext } from '@tanstack/react-router'
import { motion, useIsPresent } from 'framer-motion'
import { cloneDeep } from 'lodash'

export const AnimatedOutlet = forwardRef<HTMLDivElement>((_, ref) => {
  const RouterContext = getRouterContext()
  const routerContext = useContext(RouterContext)
  const renderedContext = useRef(routerContext)
  const isPresent = useIsPresent()

  if (isPresent) {
    renderedContext.current = cloneDeep(routerContext)
  }

  return (
    <motion.div ref={ref} className="flex h-full w-full overflow-hidden bg-background">
      <RouterContext.Provider value={renderedContext.current}>
        <Outlet />
      </RouterContext.Provider>
    </motion.div>
  )
})

AnimatedOutlet.displayName = 'AnimatedOutlet'
