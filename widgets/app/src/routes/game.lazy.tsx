import { createLazyFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { GameControls } from '@/components/GameControls'

const GameScreen = () => {
  return (
    <motion.div
      className="relative h-full w-full bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* The webview is now managed by GameWebviewManager and will be shown/hidden automatically */}
      {/* Game controls overlay */}
      <GameControls />
    </motion.div>
  )
}

export const Route = createLazyFileRoute('/game')({
  component: GameScreen
})
