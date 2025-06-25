// Simplified task query options with fake data
export const taskQueryOptions = (taskId: string) => ({
  queryKey: ['task', taskId],
  queryFn: () =>
    Promise.resolve({
      id: taskId,
      name: 'Sample Task',
      emoji: '📝',
      taskObjects: [
        {
          id: 'taskObject-1',
          rank: '1',
          object: {
            id: 'object-1',
            name: 'Sample Website',
            url: 'https://example.com',
            type: 'link',
            emoji: '🔗'
          }
        },
        {
          id: 'taskObject-2',
          rank: '2',
          object: {
            id: 'object-2',
            name: 'Another Link',
            url: 'https://github.com',
            type: 'link',
            emoji: '💻'
          }
        }
      ]
    })
})
