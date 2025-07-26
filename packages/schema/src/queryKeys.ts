// Simple query keys for basic invalidation patterns
export const QueryKeys = {
  // All tasks
  tasks: () => ['tasks'],

  // Specific task by ID (also invalidates task with messages)
  task: (id: string) => ['tasks', id],

  // All projects
  projects: () => ['projects'],

  // Specific project by ID
  project: (id: string) => ['projects', id]
}

// Type helpers
export type QueryKey = ReturnType<(typeof QueryKeys)[keyof typeof QueryKeys]>

// Simple invalidation helpers
export const createTasksInvalidation = () => QueryKeys.tasks()
export const createTaskInvalidation = (taskId: string) => QueryKeys.task(taskId)
export const createProjectsInvalidation = () => QueryKeys.projects()
export const createProjectInvalidation = (projectId: string) => QueryKeys.project(projectId)
