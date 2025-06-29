import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

export type TaskToastData = {
  title: string
  date: string
  repo: string
  branch?: string
  stats?: { additions: number; deletions: number }
  status?: string
  statusColor?: 'green' | 'purple'
}

/**
 * Hook for showing task-related toast notifications with navigation
 *
 * @example
 * ```tsx
 * const { showTaskCompletedToast, showTaskFailedToast, showTaskStartedToast } = useTaskToasts()
 *
 * // Show a task completion toast with Review button
 * showTaskCompletedToast({
 *   title: 'Add drag-and-drop image support',
 *   date: 'May 18',
 *   repo: 'longtail-labs/hitSlop',
 *   branch: 'feature/drag-drop',
 *   stats: { additions: 157, deletions: 2 }
 * })
 *
 * // Show a task failure toast
 * showTaskFailedToast(taskData, 'Network timeout error')
 *
 * // Show a task started toast
 * showTaskStartedToast(taskData)
 * ```
 */
export const useTaskToasts = () => {
  const navigate = useNavigate()

  /**
   * Shows a success toast when a task is completed
   * Includes a "Review" button that navigates to the task
   */
  const showTaskCompletedToast = useCallback(
    (task: TaskToastData) => {
      // Generate a fake task ID based on the task title (similar to PlanningScreen logic)
      const taskId =
        task.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50) +
        '-' +
        Date.now()

      const fakeObjectId = 'object-' + Date.now()

      const description = [
        task.repo,
        task.branch && `Branch: ${task.branch}`,
        task.stats && `+${task.stats.additions} -${task.stats.deletions}`
      ]
        .filter(Boolean)
        .join(' • ')

      toast.success(task.title, {
        description,
        duration: 8000, // Show longer for user to see
        action: {
          label: 'Review',
          onClick: () => {
            navigate({
              to: '/working/$taskId',
              params: { taskId },
              search: { openObjectIds: [fakeObjectId], activeObjectId: fakeObjectId }
            })
          }
        }
      })
    },
    [navigate]
  )

  /**
   * Shows an error toast when a task fails
   */
  const showTaskFailedToast = useCallback((task: TaskToastData, error?: string) => {
    const description = [
      task.repo,
      error && `Error: ${error}`,
      task.branch && `Branch: ${task.branch}`
    ]
      .filter(Boolean)
      .join(' • ')

    toast.error(`Failed: ${task.title}`, {
      description,
      duration: 10000 // Show longer for errors
    })
  }, [])

  /**
   * Shows an info toast when a task is started
   */
  const showTaskStartedToast = useCallback((task: TaskToastData) => {
    const description = [task.repo, task.branch && `Branch: ${task.branch}`]
      .filter(Boolean)
      .join(' • ')

    toast.info(`Started: ${task.title}`, {
      description,
      duration: 4000
    })
  }, [])

  return {
    showTaskCompletedToast,
    showTaskFailedToast,
    showTaskStartedToast
  }
}
