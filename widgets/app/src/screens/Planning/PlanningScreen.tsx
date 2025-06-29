import React, { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { ActionBar } from '@/modules'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconPlayerPlayFilled, IconSettings } from '@tabler/icons-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { useTaskToasts } from '@/hooks'
import { useUserRef } from '@slide.code/clients'

type Task = {
  title: string
  date: string
  repo: string
  branch?: string
  stats: { additions: number; deletions: number } | null
  status: string | null
  statusColor: 'green' | 'purple' | null
}

const allTasks: {
  waiting: Task[]
  working: Task[]
  burner: Task[]
} = {
  waiting: [
    {
      title: 'Add drag-and-drop image support',
      date: 'May 18',
      repo: 'longtail-labs/hitSlop',
      branch: 'codex/add-drag-and-drop-image-support-hscfs4',
      stats: { additions: 157, deletions: 2 },
      status: 'Open',
      statusColor: 'green'
    }
  ],
  working: [
    {
      title: 'Update README with new features',
      date: 'May 22',
      repo: 'longtail-labs/hitSlop',
      stats: { additions: 29, deletions: 31 },
      status: null,
      statusColor: null
    },
    {
      title: 'Implement SAP with minimal XML markup',
      date: 'May 17',
      repo: 'longtail-labs/ClarifyUI',
      stats: { additions: 127, deletions: 0 },
      status: null,
      statusColor: null
    }
  ],
  burner: [
    {
      title: 'Fix eslint issues and run build',
      date: 'May 18',
      repo: 'longtail-labs/hitSlop',
      stats: null,
      status: null,
      statusColor: null
    },
    {
      title: 'Explore repo for UI rendering with XML',
      date: 'May 17',
      repo: 'longtail-labs/xwidget',
      stats: null,
      status: null,
      statusColor: null
    }
  ]
}

const archivedTasks: Task[] = [
  {
    title: "Update app title to 'hitSlop - Cursor'",
    date: 'May 18',
    repo: 'longtail-labs/hitSlop',
    stats: { additions: 2, deletions: 2 },
    status: 'Merged',
    statusColor: 'purple'
  },
  {
    title: 'Create MVP for input form markup in AI chats',
    date: 'May 16',
    repo: 'longtail-labs/ClarifyUI',
    stats: { additions: 143, deletions: 0 },
    status: null,
    statusColor: null
  }
]

const StatusBadge = ({
  status,
  color
}: {
  status: string | null
  color: 'green' | 'purple' | null
}) => {
  if (!status) return null

  const colorClasses = {
    green: 'text-green-600 bg-green-50 border border-green-200',
    purple: 'text-purple-600 bg-purple-50 border border-purple-200'
  }

  return (
    <div
      className={`text-xs px-2 py-0.5 font-medium rounded-full flex items-center gap-x-2 ${
        color ? colorClasses[color] : ''
      }`}
    >
      {status}
    </div>
  )
}

const WorkingIndicator = () => (
  <motion.div
    className="h-px bg-sky-400"
    style={{ width: '30%' }}
    animate={{ x: ['0%', '233%'] }}
    transition={{
      duration: 1.2,
      repeat: Infinity,
      repeatType: 'mirror',
      ease: 'easeInOut'
    }}
  />
)

const TaskListItem = ({
  task,
  isSelected,
  isWaiting,
  isWorking
}: {
  task: Task
  isSelected?: boolean
  isWaiting?: boolean
  isWorking?: boolean
}) => {
  const navigate = useNavigate()

  const handleTaskClick = () => {
    // Generate a fake task ID based on the task title
    const taskId =
      task.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50) +
      '-' +
      Date.now()

    const fakeObjectId = 'object-' + Date.now()

    navigate({
      to: '/working/$taskId',
      params: { taskId },
      search: { openObjectIds: [fakeObjectId], activeObjectId: fakeObjectId }
    })
  }

  return (
    <div
      className={`group flex justify-between items-center px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer relative ${
        isSelected
          ? 'bg-blue-50/80 shadow-sm'
          : isWaiting
            ? 'bg-orange-50/80 hover:bg-orange-100/90'
            : 'hover:bg-gray-50/80'
      }`}
      onClick={handleTaskClick}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`font-medium text-base leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
        >
          {task.title}
        </span>
        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
          <span>{task.date}</span>
          <span className="text-gray-300">·</span>
          <span className="font-medium">{task.repo}</span>
          {task.branch && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate max-w-xs font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {task.branch}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4 ml-4">
        {task.status && <StatusBadge status={task.status} color={task.statusColor as any} />}
        {(task.stats || isWorking) && (
          <div className="flex flex-col items-end">
            {task.stats && (
              <div className="flex space-x-3 text-sm font-mono">
                <span className="text-emerald-600 font-bold">+{task.stats.additions}</span>
                <span className="text-red-500 font-bold">-{task.stats.deletions}</span>
              </div>
            )}
            {isWorking && (
              <div className="relative w-16 h-px mt-1.5 bg-gray-200 rounded-full overflow-hidden">
                <WorkingIndicator />
              </div>
            )}
          </div>
        )}

        {/* Play button that appears on hover */}
        <Button
          size="sm"
          className="h-8 w-8 rounded-full p-0 bg-black hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation()
            handleTaskClick()
          }}
        >
          <IconPlayerPlayFilled size={16} className="text-white" />
        </Button>
      </div>
    </div>
  )
}

const TaskGroup = ({ title, tasks }: { title: string; tasks: Task[] }) => {
  if (tasks.length === 0) return null
  const isWaiting = title === 'Waiting for Review'
  const isWorking = title === 'Working'
  return (
    <div className="mb-6">
      <h2 className="sticky top-0 bg-white/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-2 z-10">
        {title}
      </h2>
      <div className="space-y-1 px-4">
        {tasks.map((task, index) => (
          <TaskListItem key={index} task={task} isWaiting={isWaiting} isWorking={isWorking} />
        ))}
      </div>
    </div>
  )
}

const PlanningScreen: React.FC = () => {
  const { showTaskCompletedToast, showTaskFailedToast, showTaskStartedToast } = useTaskToasts()

  // User ref for accessing Claude Code configuration
  const [userState, setUserState, updateUserState] = useUserRef()

  // Settings sheet state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [claudeExecutablePath, setClaudeExecutablePath] = useState('')

  // Update local state when user state changes
  React.useEffect(() => {
    if (userState?.claudeCode.executablePath) {
      setClaudeExecutablePath(userState.claudeCode.executablePath)
    }
  }, [userState?.claudeCode.executablePath])

  const variants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } }
  }

  // Handle saving Claude Code settings
  const handleSaveSettings = () => {
    if (userState) {
      updateUserState((state) => ({
        ...state,
        claudeCode: {
          ...state.claudeCode,
          executablePath: claudeExecutablePath || null,
          lastDetected: claudeExecutablePath ? Date.now() : state.claudeCode.lastDetected
        }
      }))
      setIsSettingsOpen(false)
    }
  }

  // Demo function to test toast functionality
  const handleDemoToasts = () => {
    const sampleTask = {
      title: 'Add drag-and-drop image support',
      date: 'May 18',
      repo: 'longtail-labs/hitSlop',
      branch: 'codex/add-drag-and-drop-image-support-hscfs4',
      stats: { additions: 157, deletions: 2 },
      status: 'Open',
      statusColor: 'green' as const
    }

    // Show different types of toasts
    setTimeout(() => showTaskStartedToast(sampleTask), 500)
    setTimeout(() => showTaskCompletedToast(sampleTask), 3000)
    setTimeout(() => showTaskFailedToast(sampleTask, 'Network timeout'), 6000)
  }

  return (
    <motion.div
      className="flex flex-col h-full w-full bg-white text-gray-900 font-recursive"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Settings Button - Positioned at top right of page */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed top-4 right-4 h-12 w-12 p-0 z-20 hover:bg-gray-100 transition-colors"
          >
            <IconSettings size={50} className="text-gray-700 font-bold" strokeWidth={2.5} />
          </Button>
        </SheetTrigger>

        <SheetContent>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Configure your Claude Code integration and other preferences.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="claude-path">Claude Code Executable Path</Label>
              <Input
                id="claude-path"
                placeholder="/usr/local/bin/claude"
                value={claudeExecutablePath}
                onChange={(e) => setClaudeExecutablePath(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Path to the Claude Code executable. Leave empty to use system PATH.
              </p>
              {userState?.claudeCode.lastDetected && (
                <p className="text-xs text-gray-400">
                  Last detected: {new Date(userState.claudeCode.lastDetected).toLocaleString()}
                </p>
              )}
            </div>

            {userState?.claudeCode.stats && (
              <div className="grid gap-3">
                <Label>Usage Statistics</Label>
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {userState.claudeCode.stats.totalRequests}
                    </div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${userState.claudeCode.stats.totalCost.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                </div>
                {userState.claudeCode.stats.lastUsed && (
                  <p className="text-xs text-gray-400">
                    Last used: {new Date(userState.claudeCode.stats.lastUsed).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button onClick={handleSaveSettings}>Save changes</Button>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sticky Header with Input and Tabs */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="max-w-4xl mx-auto w-full px-8 py-8">
          <div className="flex items-center justify-center mb-8">
            <div className="text-center">
              <h1 className="text-4xl text-gray-900 vibe-time-header">Vibe time?</h1>
            </div>
          </div>

          <div className="mb-6">
            <ActionBar />
          </div>

          {/* Demo Toast Button */}
          <div className="mb-4 flex justify-center gap-2">
            <Button onClick={handleDemoToasts} variant="outline" size="sm">
              Demo Task Toasts
            </Button>
            <Button
              onClick={() =>
                showTaskCompletedToast({
                  title: 'Update README with new features',
                  date: 'May 22',
                  repo: 'longtail-labs/hitSlop',
                  stats: { additions: 29, deletions: 31 }
                })
              }
              variant="outline"
              size="sm"
            >
              Show Completed
            </Button>
          </div>

          <div className="flex justify-start">
            <Tabs defaultValue="tasks">
              <div className="p-2">
                <TabsList>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="archive">Archive</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto w-full">
          <Tabs defaultValue="tasks" className="w-full">
            <TabsContent value="tasks" className="mt-0">
              <div className="space-y-0">
                <TaskGroup title="Waiting for Review" tasks={allTasks.waiting} />
                <TaskGroup title="Working" tasks={allTasks.working} />
                <TaskGroup title="Burner" tasks={allTasks.burner} />
              </div>
            </TabsContent>

            <TabsContent value="archive" className="mt-0">
              <div className="space-y-2 px-4 pt-4">
                {archivedTasks.map((task, index) => (
                  <TaskListItem key={index} task={task} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </motion.div>
  )
}

export default PlanningScreen
