import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Task,
  tasks,
  TaskInsert,
  QueryKeys,
  TaskWithMessages,
  TaskWithProject
} from '@slide.code/schema'
import { db } from '../../drizzle/index.js'
import { eq, desc } from 'drizzle-orm'
import { useRpc } from '../../rpc/provider.js'
import type { TaskStatusType } from '@slide.code/schema'

// Standalone query function for getting task with messages (can be used in hooks and route loaders)
export const getTaskWithMessages = async (taskId: string): Promise<TaskWithMessages> => {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      chatMessages: {
        orderBy: (chatMessages, { asc }) => [asc(chatMessages.createdAt)]
      }
    }
  })
  if (!task) {
    throw new Error(`Task with id ${taskId} not found`)
  }
  return task as TaskWithMessages
}

// Mark a task as reviewed by the user (sets needsReview to false)
export const markTaskReviewed = async (taskId: string): Promise<void> => {
  const isTaskReviewed = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    columns: {
      needsReview: true
    }
  })
  if (isTaskReviewed?.needsReview) {
    await db.update(tasks).set({ needsReview: false }).where(eq(tasks.id, taskId))
  }
}

// Hook to list all tasks (excludes archived by default)
export const useTasks = (includeArchived = false) => {
  return useQuery<TaskWithProject[], Error>({
    queryKey: [...QueryKeys.tasks(), 'includeArchived', includeArchived],
    queryFn: async () => {
      const result = await db.query.tasks.findMany({
        where: includeArchived ? undefined : eq(tasks.archived, false),
        orderBy: [desc(tasks.updatedAt)],
        with: {
          project: true
        }
      })
      return result
    }
  })
}

// Hook to list only archived tasks
export const useArchivedTasks = () => {
  return useQuery<TaskWithProject[], Error>({
    queryKey: [...QueryKeys.tasks(), 'archived'],
    queryFn: async () => {
      const result = await db.query.tasks.findMany({
        where: eq(tasks.archived, true),
        orderBy: [desc(tasks.updatedAt)],
        with: {
          project: true
        }
      })
      return result
    }
  })
}

// Hook to get a specific task
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: QueryKeys.task(taskId),
    queryFn: async () => {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      })
      if (!task) {
        throw new Error(`Task with id ${taskId} not found`)
      }
      return task
    },
    enabled: !!taskId
  })
}

// Hook to get a specific task with all its chat messages
export const useTaskWithMessages = (taskId: string) => {
  return useQuery<TaskWithMessages, Error>({
    queryKey: [...QueryKeys.task(taskId), 'withMessages'],
    queryFn: () => getTaskWithMessages(taskId),
    enabled: !!taskId
  })
}

// Hook to create a new task
export const useCreateTask = () => {
  const queryClient = useQueryClient()

  return useMutation<
    Task,
    Error,
    { name: string; projectId: string; useWorktree?: boolean; branch?: string }
  >({
    mutationFn: async (taskData: {
      name: string
      projectId: string
      useWorktree?: boolean
      branch?: string
    }) => {
      const insertData: TaskInsert = {
        ...taskData,
        status: 'pending' // Default status
      }
      const [newTask] = await db.insert(tasks).values(insertData).returning()
      return newTask
    },
    onSuccess: async () => {
      // Invalidate and refetch tasks list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error creating task:', error)
    }
  })
}

// Hook to update a task
export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateData: {
      taskId: string
      name?: string
      projectId?: string
      useWorktree?: boolean
      status?: TaskStatusType
      branch?: string
    }) => {
      const { taskId, ...updates } = updateData
      const [updatedTask] = await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.id, taskId))
        .returning()
      return updatedTask
    },
    onSuccess: async (updatedTask) => {
      // Update the specific task in cache
      queryClient.setQueryData(QueryKeys.task(updatedTask.id), updatedTask)

      // Invalidate tasks list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error updating task:', error)
    }
  })
}

// Hook to delete a task
export const useDeleteTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      await db.delete(tasks).where(eq(tasks.id, taskId))
      return taskId
    },
    onSuccess: async (deletedTaskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QueryKeys.task(deletedTaskId) })

      // Invalidate tasks list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error deleting task:', error)
    }
  })
}

// Hook to archive a task
export const useArchiveTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.ArchiveTask({ taskId })
      })
      return success
    },
    onSuccess: async (_, taskId) => {
      // Invalidate the task detail and tasks list to show updated status
      await queryClient.invalidateQueries({ queryKey: QueryKeys.task(taskId) })
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error archiving task:', error)
    }
  })
}

// Hook to unarchive a task
export const useUnarchiveTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.UnarchiveTask({ taskId })
      })
      return success
    },
    onSuccess: async (_, taskId) => {
      // Invalidate the task detail and tasks list to show updated status
      await queryClient.invalidateQueries({ queryKey: QueryKeys.task(taskId) })
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error unarchiving task:', error)
    }
  })
}

// Hook to start a task with Claude Code agent
export const useStartTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<
    string,
    Error,
    {
      projectId: string
      prompt: string
      useWorktree?: boolean
      model?: string
      permissionMode?: string
      attachments?: readonly {
        readonly fileName: string
        readonly mimeType: string
        readonly base64Data: string
        readonly size: number
        readonly fileType?: 'image' | 'document' | 'text' | 'code' | 'other'
      }[]
    }
  >({
    mutationFn: async (taskData: {
      projectId: string
      prompt: string
      useWorktree?: boolean
      model?: string
      permissionMode?: string
      attachments?: readonly {
        readonly fileName: string
        readonly mimeType: string
        readonly base64Data: string
        readonly size: number
        readonly fileType?: 'image' | 'document' | 'text' | 'code' | 'other'
      }[]
    }) => {
      const taskId = await runRpcProgram((client) => {
        return client.StartTask(taskData)
      })
      return taskId
    },
    onSuccess: async () => {
      // Invalidate and refetch tasks list to show the new task
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error starting task:', error)
    }
  })
}

// Hook to continue a task with Claude Code agent
export const useContinueTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<
    boolean,
    Error,
    {
      taskId: string
      prompt: string
      sessionId?: string
      model?: string
      permissionMode?: string
      fileComments?: readonly {
        readonly filePath: string
        readonly comment: string
        readonly lineNumber?: number
      }[]
      attachments?: readonly {
        readonly fileName: string
        readonly mimeType: string
        readonly base64Data: string
        readonly size: number
        readonly fileType?: 'image' | 'document' | 'text' | 'code' | 'other'
      }[]
    }
  >({
    mutationFn: async (taskData: {
      taskId: string
      prompt: string
      sessionId?: string
      model?: string
      permissionMode?: string
      fileComments?: readonly {
        readonly filePath: string
        readonly comment: string
        readonly lineNumber?: number
      }[]
      attachments?: readonly {
        readonly fileName: string
        readonly mimeType: string
        readonly base64Data: string
        readonly size: number
        readonly fileType?: 'image' | 'document' | 'text' | 'code' | 'other'
      }[]
    }) => {
      const result = await runRpcProgram((client) => {
        return client.ContinueTask(taskData)
      })
      return result
    },
    onSuccess: async (result, variables) => {
      if (result) {
        // Invalidate the task query to show new activity immediately (covers withMessages too)
        await queryClient.invalidateQueries({
          queryKey: QueryKeys.task(variables.taskId)
        })
      }
      // Also invalidate the tasks list in case status changed
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error continuing task:', error)
    }
  })
}

// Helper function to group tasks by status
export const groupTasksByStatus = (tasks: TaskWithProject[]) => {
  const grouped = tasks.reduce(
    (groups, task) => {
      const status = task.status
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(task)
      return groups
    },
    {} as Record<string, TaskWithProject[]>
  )

  // Sort each group by most recently updated first
  Object.keys(grouped).forEach((status) => {
    grouped[status].sort((a, b) => {
      const dateA = new Date(a.updatedAt)
      const dateB = new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
  })

  return grouped
}

// Hook to get diff for a task
export const useTaskDiff = (taskId: string, options?: string[]) => {
  const { runRpcProgram } = useRpc()

  return useQuery<string, Error>({
    queryKey: [...QueryKeys.task(taskId), 'diff', ...(options || [])],
    queryFn: async () => {
      const diff = await runRpcProgram((client) => {
        return client.GetTaskDiff({ taskId, options })
      })
      return diff
    },
    enabled: !!taskId
  })
}

// Hook to commit a task's changes
export const useCommitTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.CommitTask({ taskId })
      })
      return success
    },
    onSuccess: async (_, taskId) => {
      // Invalidate the task query since changes are now committed (covers diff too)
      await queryClient.invalidateQueries({ queryKey: QueryKeys.task(taskId) })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error committing task:', error)
    }
  })
}

// Hook to stop a running task
export const useStopTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.StopTask({ taskId })
      })
      return success
    },
    onSuccess: async (_, taskId) => {
      // Invalidate the task detail and tasks list to show updated status (task invalidation covers withMessages)
      await queryClient.invalidateQueries({ queryKey: QueryKeys.task(taskId) })
      await queryClient.invalidateQueries({ queryKey: QueryKeys.tasks() })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error stopping task:', error)
    }
  })
}

// Hook to discard changes for a task
export const useDiscardChanges = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.DiscardChanges({ taskId })
      })
      return success
    },
    onSuccess: async (_, taskId) => {
      // Invalidate the task query since changes are now discarded (covers diff too)
      await queryClient.invalidateQueries({ queryKey: QueryKeys.task(taskId) })
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error discarding changes:', error)
    }
  })
}

// Hook to open task in GitHub Desktop
export const useOpenInGitHubDesktop = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.OpenInGitHubDesktop({ taskId })
      })
      return success
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error opening in GitHub Desktop:', error)
    }
  })
}

// Hook to open task in Finder
export const useOpenInFinder = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.OpenInFinder({ taskId })
      })
      return success
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error opening in Finder:', error)
    }
  })
}

// Hook to open task in Terminal
export const useOpenInTerminal = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.OpenInTerminal({ taskId })
      })
      return success
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error opening in Terminal:', error)
    }
  })
}

// Hook to open task in Editor
export const useOpenInEditor = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (taskId: string) => {
      const success = await runRpcProgram((client) => {
        return client.OpenInEditor({ taskId })
      })
      return success
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error opening in Editor:', error)
    }
  })
}

// Helper function to get task statistics
export const getTaskStats = (tasks: Task[]) => {
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    stopped: tasks.filter((t) => t.status === 'stopped').length
  }
}
