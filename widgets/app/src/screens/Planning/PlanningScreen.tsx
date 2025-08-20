import React, { useState, useMemo, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { ActionBar } from '@/modules'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  IconPlayerPlayFilled,
  IconSettings,
  IconBrandGithub,
  IconBrandDiscord,
  IconMoon,
  IconSun,
  IconAlertCircle,
  IconLoader2,
  IconFolder,
  IconArchive,
  IconPuzzle
} from '@tabler/icons-react'
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { McpSidebar } from '@/components/McpSidebar/McpSidebar'
import {
  useUserRef,
  useClaudeExecutable,
  useClaudeStats,
  useTasks,
  useArchivedTasks,
  groupTasksByStatus,
  useAppReadyRef,
  useOpenExternalLink,
  useOpenGitHubLink,
  useOpenDiscordLink,
  useOpenDocumentationLink,
  useArchiveTask
} from '@slide.code/clients'
import type { TaskWithProject as RpcTask, DailyUsage, SessionUsage } from '@slide.code/schema'
import { getRelativeTimeString } from '@/lib/util'

// Simple theme hook for single renderer app
const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)

    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  // Apply theme on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [theme])

  return { theme, setTheme, toggleTheme }
}

// Header Navigation Component
const HeaderNavigation = ({
  onSettingsClick,
  onMcpClick
}: {
  onSettingsClick: () => void
  onMcpClick: () => void
}) => {
  const { theme, toggleTheme } = useTheme()
  const { mutate: openExternalLink } = useOpenExternalLink()
  const { openRepository } = useOpenGitHubLink()
  const { openInvite } = useOpenDiscordLink()

  const handleExternalLink = (url: string) => {
    openExternalLink(url)
  }

  return (
    <>
      {/* MCP Button - Top Left */}
      <div className="fixed top-4 left-12 z-20">
        <Button
          variant="ghost"
          size="sm"
          className="h-12 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={onMcpClick}
          title="MCP Servers"
        >
          <IconPuzzle size={28} className="text-gray-700 dark:text-gray-300 mr-3" />
          <span className="text-gray-700 dark:text-gray-300 font-bold text-lg">MCP</span>
        </Button>
      </div>

      {/* Navigation Menu - Top Right */}
      <div className="fixed top-4 right-4 z-20">
        <NavigationMenu>
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => openRepository('longtailLABS', 'slide.code')}
                title="GitHub"
              >
                <IconBrandGithub
                  size={32}
                  className="text-gray-700 dark:text-gray-300"
                  stroke={2.5}
                />
              </Button>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => openInvite('vZvkNmwQ7f')}
                title="Discord"
              >
                <IconBrandDiscord
                  size={32}
                  className="text-gray-700 dark:text-gray-300"
                  stroke={2.5}
                />
              </Button>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? (
                  <IconMoon size={32} className="text-gray-700 dark:text-gray-300" stroke={2.5} />
                ) : (
                  <IconSun size={32} className="text-gray-700 dark:text-gray-300" stroke={2.5} />
                )}
              </Button>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={onSettingsClick}
                title="Settings"
              >
                <IconSettings size={32} className="text-gray-700 dark:text-gray-300" stroke={2.5} />
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </>
  )
}

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
  const archiveTask = useArchiveTask()

  const handleTaskClick = () => {
    navigate({
      to: '/working/$taskId',
      params: { taskId: task.id }
    })
  }

  const handleArchive = () => {
    archiveTask.mutate(task.id, {
      onSuccess: () => {
        // Task will be removed from the list automatically due to data refetch
      }
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`group flex justify-between items-center px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer relative ${
            isSelected
              ? 'bg-orange-50/80 dark:bg-orange-900/20 shadow-sm'
              : isWaiting
                ? 'bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100/90 dark:hover:bg-orange-800/30'
                : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
          }`}
          onClick={handleTaskClick}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className={`font-medium text-base leading-tight line-clamp-6 ${isSelected ? 'text-[#CB661C] dark:text-orange-200' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {task.title}
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <div className="flex flex-col">
                <span className="font-bold text-[#CB661C] dark:text-orange-200 text-sm">
                  {task.projectName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-xs">
                  {task.projectPath}
                </span>
              </div>
              {task.branch && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="truncate max-w-xs font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
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
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{task.date}</span>
              </div>
            )}
            {!task.status && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 dark:text-gray-500">{task.date}</span>
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
                  <div className="relative w-16 h-px mt-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleTaskClick}>
          <IconFolder size={16} className="mr-2" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={handleArchive} disabled={archiveTask.isPending}>
          <IconArchive size={16} className="mr-2" />
          Archive
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

const TaskGroup = ({ title, tasks }: { title: string; tasks: Task[] }) => {
  console.log(`TASK GROUP "${title}":`, tasks, `Length: ${tasks.length}`)
  if (tasks.length === 0) return null
  const isWaiting = title === 'Pending' || title === 'Needs Review'
  const isWorking = title === 'Running'
  return (
    <div className="mb-6">
      <h2 className="sticky top-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-2 z-10">
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
  const navigate = useNavigate()
  const { openInvite } = useOpenDiscordLink()
  const { openRepository } = useOpenGitHubLink()

  // App ready state checking
  const [appReady, setAppReady] = useAppReadyRef()

  const { data: rpcTasks, isLoading, error } = useTasks(false) // Don't include archived
  const {
    data: archivedTasks,
    isLoading: isLoadingArchived,
    error: archivedError
  } = useArchivedTasks()

  console.log('RPCTASKS', rpcTasks)
  console.log('ARCHIVED TASKS', archivedTasks)

  // Log app ready state changes
  useEffect(() => {
    console.log('[PLANNING-SCREEN] 📊 App Ready state changed:', {
      isReady: appReady?.isReady,
      error: appReady?.error,
      errorDetails: appReady?.errorDetails,
      timestamp: appReady?.timestamp,
      fullState: appReady
    })
  }, [appReady])

  const { pending, running, completed, failed, needsReview } = useMemo(() => {
    const tasks = Array.isArray(rpcTasks) ? rpcTasks : []
    const grouped = groupTasksByStatus(tasks)

    // Filter tasks that need review using the needsReview field
    const allTasks = Object.values(grouped).flat()
    const needsReviewTasks = allTasks.filter((task) => task.needsReview).map(mapRpcTaskToViewTask)

    // Remove tasks that need review from their original status groups
    const filterNeedsReview = (tasks: any[]) =>
      tasks.filter((task) => !task.needsReview).map(mapRpcTaskToViewTask)

    // Merge stopped tasks into completed since they're essentially completed work
    const completedRpcTasks = [...(grouped.completed || []), ...(grouped.stopped || [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    const completedTasks = filterNeedsReview(completedRpcTasks)

    return {
      pending: filterNeedsReview(grouped.pending || []),
      running: filterNeedsReview(grouped.running || []),
      completed: completedTasks,
      failed: filterNeedsReview(grouped.failed || []),
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

  // Claude Code configuration hooks
  const { executablePath, lastDetected, updateExecutablePath } = useClaudeExecutable()
  const { stats } = useClaudeStats()

  // Settings sheet state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [claudeExecutablePath, setClaudeExecutablePath] = useState('')

  // MCP sidebar state
  const [isMcpSidebarOpen, setIsMcpSidebarOpen] = useState(false)

  // Update local state when executable path changes
  React.useEffect(() => {
    if (executablePath) {
      setClaudeExecutablePath(executablePath)
    }
  }, [executablePath])

  const variants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } }
  }

  // Handle saving Claude Code settings
  const handleSaveSettings = () => {
    updateExecutablePath(claudeExecutablePath || null)
    setIsSettingsOpen(false)
  }

  // Handle task start navigation
  const handleTaskStart = (taskId: string) => {
    console.log('Navigating to task:', taskId)
    navigate({
      to: '/working/$taskId',
      params: { taskId }
    })
  }

  // Show loading state while app is initializing
  if (!appReady?.isReady && !appReady?.error) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="text-center space-y-4">
          <IconLoader2 size={48} className="mx-auto animate-spin text-[#CB661C]" />
          <div>
            <h2 className="text-2xl font-semibold mb-2">Starting SlideCode...</h2>
            <p className="text-gray-600 dark:text-gray-400">Initializing services and database</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Show error state if app failed to initialize
  if (appReady?.error) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-8"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <IconAlertCircle className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription className="mt-2">
              SlideCode failed to initialize properly. Please check the logs for more details.
              <br />
              <br />
              <strong>Error:</strong> {appReady.errorDetails || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => window.location.reload()} variant="outline" className="mr-2">
              Retry
            </Button>
            <Button onClick={() => openInvite('vZvkNmwQ7f')} variant="ghost">
              Report Issue
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Main application content - only render when app is ready
  return (
    <motion.div
      className="flex flex-col h-full w-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-recursive transition-colors"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header Navigation */}
      <HeaderNavigation
        onSettingsClick={() => setIsSettingsOpen(true)}
        onMcpClick={() => setIsMcpSidebarOpen(true)}
      />

      {/* MCP Sidebar */}
      <McpSidebar isOpen={isMcpSidebarOpen} onClose={() => setIsMcpSidebarOpen(false)} />

      {/* Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Path to the Claude Code executable. Leave empty to use system PATH.
              </p>
              {lastDetected && (
                <p className="text-xs text-gray-400">
                  Last detected: {new Date(lastDetected).toLocaleString()}
                </p>
              )}
            </div>

            {stats && (
              <div className="grid gap-4">
                <div>
                  <Label className="text-base font-semibold">Claude Code Usage</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Usage statistics from your Claude Code sessions
                  </p>
                </div>

                {/* Cost and Total Tokens */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      ${stats.totalCost.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.tokenTotals?.totalTokens.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
                  </div>
                </div>

                {/* Token Breakdown - Input/Output */}
                {stats.tokenTotals && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Token Breakdown</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                          {stats.tokenTotals.inputTokens.toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">Input Tokens</div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                          {stats.tokenTotals.outputTokens.toLocaleString()}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Output Tokens
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sync Status */}
                {stats.lastSyncTime && (
                  <div className="text-xs text-gray-400 pt-2 border-t">
                    Last synced: {new Date(stats.lastSyncTime).toLocaleString()}
                  </div>
                )}

                {/* Credit */}
                <div className="text-xs text-gray-400 pt-2 border-t flex items-center gap-1">
                  <span>Powered by</span>
                  <button
                    onClick={() => openRepository('ryoppippi', 'ccusage')}
                    className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                  >
                    ccusage
                  </button>
                </div>
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

      <Tabs defaultValue="tasks" className="w-full flex flex-col h-full">
        {/* Sticky Header with Input and Tabs */}
        <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a] transition-colors">
          <div className="max-w-4xl mx-auto w-full px-8 py-8">
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <h1 className="text-4xl text-gray-900 dark:text-gray-100 vibe-time-header transition-colors">
                  <span className="text-[#CB661C]">Vibe time?</span>
                </h1>
              </div>
            </div>

            <div className="mb-6">
              <ActionBar onTaskStart={handleTaskStart} />
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
        <main className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full">
            <TabsContent value="tasks" className="mt-0 h-full overflow-y-auto pb-24">
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="archive" className="mt-0 h-full overflow-y-auto pb-24">
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
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
