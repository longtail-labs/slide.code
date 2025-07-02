import React, { createContext, useContext, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from '@tanstack/react-router'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ChatSidebar } from './components/ChatSidebar'
import { CenterPanel } from './components/CenterPanel'
import { PromptBox } from './components/PromptBox'
import { useTaskWithMessages, useUserRef } from '@slide.code/clients'
import type { TaskWithMessages } from '@slide.code/schema'

// Context for sharing working screen state
interface WorkingScreenContextType {
  task: TaskWithMessages
  commentsCount: number
  setCommentsCount: (count: number) => void
}

const WorkingScreenContext = createContext<WorkingScreenContextType | null>(null)

export const useWorkingScreenContext = () => {
  const context = useContext(WorkingScreenContext)
  if (!context) {
    throw new Error('useWorkingScreenContext must be used within WorkingScreenProvider')
  }
  return context
}

const WorkingScreenProvider = ({
  children,
  task
}: {
  children: React.ReactNode
  task: TaskWithMessages
}) => {
  const [commentsCount, setCommentsCount] = useState(0)

  return (
    <WorkingScreenContext.Provider value={{ task, commentsCount, setCommentsCount }}>
      {children}
    </WorkingScreenContext.Provider>
  )
}

const WorkingScreen = () => {
  const { taskId } = useParams({ from: '/working/$taskId' })
  const { data: task, isLoading, error } = useTaskWithMessages(taskId)
  const [userState, setUserState, updateUserState] = useUserRef()

  console.log('WorkingScreen TASK', task, isLoading, error)

  // Set current task ID when component mounts and clear when unmounts
  useEffect(() => {
    if (taskId) {
      console.log('[WorkingScreen] Setting current task ID:', taskId)
      updateUserState((state) => ({
        ...state,
        currentTaskId: taskId
      }))
    }

    // Cleanup function to clear current task ID when component unmounts
    return () => {
      console.log('[WorkingScreen] Clearing current task ID')
      updateUserState((state) => ({
        ...state,
        currentTaskId: null
      }))
    }
  }, [taskId, updateUserState])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-lg">Loading task...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-lg text-red-500">Error loading task: {error.message}</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-lg">Task not found</div>
      </div>
    )
  }

  return (
    <WorkingScreenProvider task={task}>
      <motion.div
        className="flex flex-col h-full w-full overflow-hidden bg-background relative select-text"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <ResizablePanelGroup direction="horizontal" className="flex-grow">
          <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
            <ChatSidebar task={task} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <div className="relative h-full w-full">
              <CenterPanel task={task} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* PromptBox is now absolutely positioned */}
        <PromptBox task={task} />
      </motion.div>
    </WorkingScreenProvider>
  )
}

export default WorkingScreen
