import { createFileRoute } from '@tanstack/react-router'
import { WorkingScreen } from '@/screens'
import { zodValidator } from '@tanstack/zod-adapter'

import { z } from 'zod'
import { taskQueryOptions } from '@/screens/Working/taskQueryOptions'

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
    // await queryClient.prefetchQuery(getTask)
    queryClient.ensureQueryData(taskQueryOptions(taskId))
  },
  component: WorkingScreen,
  validateSearch: zodValidator(workingSearchSchema)
})
