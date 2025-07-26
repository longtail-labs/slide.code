import { createFileRoute } from '@tanstack/react-router'
import { WorkingScreen } from '@/screens'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'
import { getTaskWithMessages, markTaskReviewed } from '@slide.code/clients'
import { QueryKeys } from '@slide.code/schema'

// Define the search params schema
export const workingSearchSchema = z.object({
  openObjectIds: z.array(z.string()).default([]),
  activeObjectId: z.string().optional().nullable()
})

export const Route = createFileRoute('/working/$taskId')({
  // beforeLoad: ({ params: { taskId } }) => {
  //   console.log('Task id in beforeLoad', taskId)
  //   return {
  //     getTask: { queryKey: ['task', taskId], queryFn: () => getTaskById(taskId) }
  //   }
  // },
  loader: async ({ params: { taskId }, context: { queryClient } }) => {
    console.log('Task id in loader', taskId)
    await markTaskReviewed(taskId)

    // Prefetch the task with messages using the same query key and function as useTaskWithMessages
    const taskWithMessagesQueryKey = [...QueryKeys.task(taskId), 'withMessages']

    await queryClient.prefetchQuery({
      queryKey: taskWithMessagesQueryKey,
      queryFn: () => getTaskWithMessages(taskId),
      staleTime: 1000 * 30 // 30 seconds
    })
  },
  component: WorkingScreen,
  validateSearch: zodValidator(workingSearchSchema)
})
