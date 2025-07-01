import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Task, tasks, TaskInsert, TaskQueryKeys, TaskWithMessages } from '@slide.code/schema'
import { db } from '../../drizzle/index.js'
import { eq, desc } from 'drizzle-orm'
import { useRpc } from '../../rpc/provider.js'
import type { TaskStatusType } from '@slide.code/schema'
// import { createInvalidateQuery } from '@slide.code/schema/messages'
// import { PubsubClient } from '../../pubsub/index.js'

// Re-export the strongly typed query keys from schema package
// export { TaskQueryKeys } from '@slide.code/schema'

// Helper to get the pubsub client
// const getPubsub = () => PubsubClient.getInstance()

// Standalone query function for getting task with messages (can be used in hooks and route loaders)
export const getTaskWithMessages = async (taskId: string): Promise<TaskWithMessages> => {
  console.log('[TASK-HELPERS] 📋 Fetching task with messages:', taskId)
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
  console.log(
    '[TASK-HELPERS] 📋 Task with messages fetched:',
    task.name,
    `(${task.chatMessages.length} messages)`
  )
  return task as TaskWithMessages
}

// Mark a task as accessed by the user (updates lastAccessedAt)
export const markTaskAccessed = async (taskId: string): Promise<void> => {
  console.log('[TASK-HELPERS] 👁️ Marking task as accessed:', taskId)
  await db
    .update(tasks)
    .set({ lastAccessedAt: new Date().toISOString() })
    .where(eq(tasks.id, taskId))
  console.log('[TASK-HELPERS] ✅ Task marked as accessed:', taskId)
}

// Hook to list all tasks
export const useTasks = () => {
  return useQuery<Task[], Error>({
    queryKey: TaskQueryKeys.lists(),
    queryFn: async () => {
      console.log('[TASK-HELPERS] 📋 Fetching all tasks')
      const result = await db.query.tasks.findMany({
        orderBy: [desc(tasks.updatedAt)]
      })
      console.log('[TASK-HELPERS] 📋 Tasks fetched:', result)
      return result
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  })
}

// Hook to get a specific task
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: TaskQueryKeys.detail(taskId),
    queryFn: async () => {
      console.log('[TASK-HELPERS] 📋 Fetching task:', taskId)
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      })
      if (!task) {
        throw new Error(`Task with id ${taskId} not found`)
      }
      console.log('[TASK-HELPERS] 📋 Task fetched:', task.name)
      return task
    },
    enabled: !!taskId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  })
}

// Hook to get a specific task with all its chat messages
export const useTaskWithMessages = (taskId: string) => {
  return useQuery<TaskWithMessages, Error>({
    queryKey: [...TaskQueryKeys.detail(taskId), 'withMessages'],
    queryFn: () => getTaskWithMessages(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 30, // 30 seconds - shorter for real-time updates
    gcTime: 1000 * 60 * 10 // 10 minutes
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
      console.log('[TASK-HELPERS] ➕ Creating task:', taskData.name)
      const insertData: TaskInsert = {
        ...taskData,
        status: 'pending' // Default status
      }
      const [newTask] = await db.insert(tasks).values(insertData).returning()
      console.log('[TASK-HELPERS] ➕ Task created:', newTask.id)
      return newTask
    },
    onSuccess: async (newTask) => {
      console.log('[TASK-HELPERS] ✅ Task creation completed and cache invalidated', newTask)
      // Invalidate and refetch tasks list
      await queryClient.invalidateQueries({ queryKey: TaskQueryKeys.lists() })

      // Broadcast invalidation to other processes
      // await pubsub.publish(createInvalidateQuery(taskQueryKeys.lists()))

      console.log('[TASK-HELPERS] ✅ Task creation completed and cache invalidated')
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
      console.log('[TASK-HELPERS] ✏️ Updating task:', updateData.taskId)
      const { taskId, ...updates } = updateData
      const [updatedTask] = await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.id, taskId))
        .returning()
      console.log('[TASK-HELPERS] ✏️ Task updated:', updatedTask.id)
      return updatedTask
    },
    onSuccess: async (updatedTask) => {
      // Update the specific task in cache
      queryClient.setQueryData(TaskQueryKeys.detail(updatedTask.id), updatedTask)

      // Invalidate tasks list
      await queryClient.invalidateQueries({ queryKey: TaskQueryKeys.lists() })

      console.log('[TASK-HELPERS] ✅ Task update completed and cache invalidated')
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
      console.log('[TASK-HELPERS] 🗑️ Deleting task:', taskId)
      await db.delete(tasks).where(eq(tasks.id, taskId))
      console.log('[TASK-HELPERS] 🗑️ Task deleted:', taskId)
      return taskId
    },
    onSuccess: async (deletedTaskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: TaskQueryKeys.detail(deletedTaskId) })

      // Invalidate tasks list
      await queryClient.invalidateQueries({ queryKey: TaskQueryKeys.lists() })

      console.log('[TASK-HELPERS] ✅ Task deletion completed and cache invalidated')
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error deleting task:', error)
    }
  })
}

// Hook to start a task with Claude Code agent
export const useStartTask = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<string, Error, { projectId: string; prompt: string; useWorktree?: boolean }>({
    mutationFn: async (taskData: { projectId: string; prompt: string; useWorktree?: boolean }) => {
      console.log('[TASK-HELPERS] 🚀 Starting task:', taskData.prompt)
      const taskId = await runRpcProgram((client) => {
        return client.StartTask(taskData)
      })
      console.log('[TASK-HELPERS] 🚀 Task started:', taskId)
      return taskId
    },
    onSuccess: async (taskId) => {
      console.log('[TASK-HELPERS] ✅ Task start completed', taskId)
      // Invalidate and refetch tasks list to show the new task
      await queryClient.invalidateQueries({ queryKey: TaskQueryKeys.lists() })

      console.log('[TASK-HELPERS] ✅ Task start completed and cache invalidated')
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

  return useMutation<boolean, Error, { taskId: string; prompt: string; sessionId?: string }>({
    mutationFn: async (continueData: { taskId: string; prompt: string; sessionId?: string }) => {
      console.log(
        '[TASK-HELPERS] ▶️ Continuing task:',
        continueData.taskId,
        'with prompt:',
        continueData.prompt
      )
      const success = await runRpcProgram((client) => {
        return client.ContinueTask(continueData)
      })
      console.log('[TASK-HELPERS] ▶️ Task continue sent:', success)
      return success
    },
    onSuccess: async (success, variables) => {
      console.log('[TASK-HELPERS] ✅ Task continue completed', variables.taskId, success)
      // Invalidate the task with messages query to show new activity immediately
      await queryClient.invalidateQueries({
        queryKey: [...TaskQueryKeys.detail(variables.taskId), 'withMessages']
      })
      // Also invalidate the tasks list in case status changed
      await queryClient.invalidateQueries({ queryKey: TaskQueryKeys.lists() })

      console.log('[TASK-HELPERS] ✅ Task continue completed and cache invalidated')
    },
    onError: (error) => {
      console.error('[TASK-HELPERS] ❌ Error continuing task:', error)
    }
  })
}

// Helper function to group tasks by status
export const groupTasksByStatus = (tasks: Task[]) => {
  const grouped = tasks.reduce(
    (groups, task) => {
      const status = task.status
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(task)
      return groups
    },
    {} as Record<string, Task[]>
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
    queryKey: [...TaskQueryKeys.detail(taskId), 'diff', ...(options || [])],
    queryFn: async () => {
      console.log('[TASK-HELPERS] 🔍 Fetching diff for task:', taskId)
      const diff = await runRpcProgram((client) => {
        return client.GetTaskDiff({ taskId, options })
      })
      console.log('[TASK-HELPERS] 🔍 Diff fetched, length:', diff.length)
      return diff
    },
    enabled: !!taskId,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5 // 5 minutes
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
