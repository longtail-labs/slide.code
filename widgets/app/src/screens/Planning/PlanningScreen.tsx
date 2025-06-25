import React from 'react'
import { motion } from 'framer-motion'
import { ActionBar } from '@/modules'

const PlanningMode: React.FC = () => {
  const variants = {
    initial: { scale: 0.95, opacity: 0.5 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.1 } },
    exit: { scale: 0.95, opacity: 0, transition: { duration: 0.1 } }
  }

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden bg-background"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <main className="flex-1 overflow-y-auto pt-8">
        <ActionBar />
      </main>
    </motion.div>
  )
}

export default PlanningMode
