import React from 'react'
import { motion } from 'framer-motion'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ChatSidebar } from './components/ChatSidebar'
import { CenterPanel } from './components/CenterPanel'
import { PromptBox } from './components/PromptBox'

const WorkingScreen = () => {
  // Animation variants
  const variants = {
    initial: { y: -50, opacity: 0, scale: 1.2 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.1 }
    },
    exit: {
      y: 50,
      opacity: 0,
      scale: 1.2,
      transition: { duration: 0.1 }
    }
  }

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden bg-background relative select-text"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <ChatSidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          <div className="relative h-full w-full">
            <CenterPanel />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* PromptBox positioned to center across entire screen */}
      <PromptBox />
    </motion.div>
  )
}

export default WorkingScreen
