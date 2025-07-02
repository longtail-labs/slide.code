import React, { useState, useMemo, useEffect } from 'react'
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
import { useUserRef, useTasks, useArchivedTasks, groupTasksByStatus } from '@slide.code/clients'
import type { TaskWithProject as RpcTask } from '@slide.code/schema'
import { getRelativeTimeString } from '@/lib/util'

type Task = {
  id: string
  title: string
  date: string
  projectId: string
  projectName: string
  projectPath: string
  branch?: string
  stats: { additions: number; deletions: number } | null
  status: string | null
  statusColor: 'green' | 'purple' | 'red' | null
}

const mapRpcTaskToViewTask = (rpcTask: RpcTask): Task => ({
  id: rpcTask.id,
  title: rpcTask.name,
  date: getRelativeTimeString(new Date(rpcTask.updatedAt)),
  projectId: rpcTask.projectId,
  projectName: rpcTask.project?.name ?? 'Unknown Project',
  projectPath: rpcTask.project?.path ?? '',
  branch: rpcTask.branch ?? undefined,
  stats: rpcTask.stats
    ? { additions: rpcTask.stats.additions, deletions: rpcTask.stats.deletions }
    : null,
  status: rpcTask.status, // This will be like 'pending', 'running', 'completed', etc.
  // This is a simple mapping, you might want more complex logic
  statusColor:
    rpcTask.status === 'completed' ? 'purple' : rpcTask.status === 'failed' ? 'red' : null
})

const StatusBadge = ({
  status,
  color
}: {
  status: string | null
  color: 'green' | 'purple' | 'red' | null
}) => {
  if (!status) return null

  const colorClasses = {
    green: 'text-green-600 bg-green-50 border border-green-200',
    purple: 'text-purple-600 bg-purple-50 border border-purple-200',
    red: 'text-red-600 bg-red-50 border border-red-200'
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
    const fakeObjectId = 'object-' + Date.now()

    navigate({
      to: '/working/$taskId',
      params: { taskId: task.id },
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
          <div className="flex flex-col">
            <span className="font-medium">{task.projectName}</span>
            <span className="text-xs text-gray-400 font-mono truncate max-w-xs">
              {task.projectPath}
            </span>
          </div>
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
        {task.status && (
          <div className="flex flex-col items-end">
            <StatusBadge status={task.status} color={task.statusColor as any} />
            <span className="text-xs text-gray-400 mt-1">{task.date}</span>
          </div>
        )}
        {!task.status && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400">{task.date}</span>
          </div>
        )}
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
  console.log(`TASK GROUP "${title}":`, tasks, `Length: ${tasks.length}`)
  if (tasks.length === 0) return null
  const isWaiting = title === 'Pending' || title === 'Needs Review'
  const isWorking = title === 'Running'
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
  const { data: rpcTasks, isLoading, error } = useTasks(false) // Don't include archived
  const {
    data: archivedTasks,
    isLoading: isLoadingArchived,
    error: archivedError
  } = useArchivedTasks()

  console.log('RPCTASKS', rpcTasks)
  console.log('ARCHIVED TASKS', archivedTasks)

  const { pending, running, completed, failed, stopped, needsReview } = useMemo(() => {
    const tasks = Array.isArray(rpcTasks) ? rpcTasks : []
    const grouped = groupTasksByStatus(tasks)

    // Filter tasks that need review using the needsReview field
    const allTasks = Object.values(grouped).flat()
    const needsReviewTasks = allTasks.filter((task) => task.needsReview).map(mapRpcTaskToViewTask)

    // Remove tasks that need review from their original status groups
    const filterNeedsReview = (tasks: any[]) =>
      tasks.filter((task) => !task.needsReview).map(mapRpcTaskToViewTask)

    return {
      pending: filterNeedsReview(grouped.pending || []),
      running: filterNeedsReview(grouped.running || []),
      completed: filterNeedsReview(grouped.completed || []),
      failed: filterNeedsReview(grouped.failed || []),
      stopped: filterNeedsReview(grouped.stopped || []),
      needsReview: needsReviewTasks
    }
  }, [rpcTasks])

  const archivedTasksForView = useMemo(() => {
    const mapped = Array.isArray(archivedTasks) ? archivedTasks.map(mapRpcTaskToViewTask) : []
    console.log('ARCHIVED TASKS FOR VIEW:', mapped)
    return mapped
  }, [archivedTasks])

  // Debug archive tab state
  useEffect(() => {
    console.log('ARCHIVE TAB RENDER STATE:', {
      isLoadingArchived,
      archivedError,
      archivedTasksForView: archivedTasksForView.length,
      archivedTasks: archivedTasks?.length
    })
  }, [isLoadingArchived, archivedError, archivedTasksForView, archivedTasks])

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
      <Tabs defaultValue="tasks" className="w-full flex flex-col">
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

            <div className="flex justify-start">
              <div className="p-2">
                <TabsList>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="archive">Archive</TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-4xl mx-auto w-full">
            <TabsContent value="tasks" className="mt-0">
              {isLoading && <div className="px-4 py-8 text-center">Loading tasks...</div>}
              {error && (
                <div className="px-4 py-8 text-center text-red-500">
                  Error loading tasks: {error.message}
                </div>
              )}
              {!isLoading && !error && (
                <div className="space-y-0">
                  <TaskGroup title="Needs Review" tasks={needsReview} />
                  <TaskGroup title="Running" tasks={running} />
                  <TaskGroup title="Pending" tasks={pending} />
                  <TaskGroup title="Completed" tasks={completed} />
                  <TaskGroup title="Failed" tasks={failed} />
                  <TaskGroup title="Stopped" tasks={stopped} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="archive" className="mt-0">
              {isLoadingArchived && (
                <div className="px-4 py-8 text-center">Loading archived tasks...</div>
              )}
              {archivedError && (
                <div className="px-4 py-8 text-center text-red-500">
                  Error loading archived tasks: {archivedError.message}
                </div>
              )}
              {!isLoadingArchived && !archivedError && (
                <div className="space-y-0">
                  <TaskGroup title="Archived" tasks={archivedTasksForView} />
                  {archivedTasksForView.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No archived tasks found.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </main>
      </Tabs>
    </motion.div>
  )
}

export default PlanningScreen
