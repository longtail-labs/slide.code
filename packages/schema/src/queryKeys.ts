import { Schema } from 'effect'

// Define literal types for different query categories
export const QueryCategory = Schema.Literal('projects', 'tasks', 'users', 'files', 'chatMessages')

// Define literal types for query operations
export const QueryOperation = Schema.Literal('list', 'detail', 'all')

// Define base query key schemas
export const BaseQueryKey = Schema.Union(
  // Projects queries
  Schema.Tuple(Schema.Literal('projects')),
  Schema.Tuple(Schema.Literal('projects'), Schema.Literal('list')),
  Schema.Tuple(Schema.Literal('projects'), Schema.Literal('detail'), Schema.String),

  // Tasks queries
  Schema.Tuple(Schema.Literal('tasks')),
  Schema.Tuple(Schema.Literal('tasks'), Schema.Literal('list')),
  Schema.Tuple(Schema.Literal('tasks'), Schema.Literal('detail'), Schema.String),
  Schema.Tuple(Schema.Literal('tasks'), Schema.Literal('project'), Schema.String),

  // Users queries
  Schema.Tuple(Schema.Literal('users')),
  Schema.Tuple(Schema.Literal('users'), Schema.Literal('list')),
  Schema.Tuple(Schema.Literal('users'), Schema.Literal('detail'), Schema.String),

  // Files queries
  Schema.Tuple(Schema.Literal('files')),
  Schema.Tuple(Schema.Literal('files'), Schema.Literal('project'), Schema.String),
  Schema.Tuple(Schema.Literal('files'), Schema.Literal('diff'), Schema.String),
  Schema.Tuple(Schema.Literal('files'), Schema.Literal('content'), Schema.String),

  // Chat messages queries
  Schema.Tuple(Schema.Literal('chatMessages')),
  Schema.Tuple(Schema.Literal('chatMessages'), Schema.Literal('task'), Schema.String),
  Schema.Tuple(Schema.Literal('chatMessages'), Schema.Literal('detail'), Schema.String)
)

// Type helpers for query keys
export type QueryKeyType = Schema.Schema.Type<typeof BaseQueryKey>

// Specific query key builders with strong typing
export const ProjectQueryKeys = {
  all: () => ['projects'] as const,
  lists: () => ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const
}

export const TaskQueryKeys = {
  all: () => ['tasks'] as const,
  lists: () => ['tasks', 'list'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  project: (projectId: string) => ['tasks', 'project', projectId] as const
}

export const UserQueryKeys = {
  all: () => ['users'] as const,
  lists: () => ['users', 'list'] as const,
  detail: (id: string) => ['users', 'detail', id] as const
}

export const FileQueryKeys = {
  all: () => ['files'] as const,
  project: (projectId: string) => ['files', 'project', projectId] as const,
  diff: (filePath: string) => ['files', 'diff', filePath] as const,
  content: (filePath: string) => ['files', 'content', filePath] as const
}

export const ChatMessageQueryKeys = {
  all: () => ['chatMessages'] as const,
  task: (taskId: string) => ['chatMessages', 'task', taskId] as const,
  detail: (id: string) => ['chatMessages', 'detail', id] as const
}

// Validate query key function
export const validateQueryKey = (queryKey: unknown): queryKey is QueryKeyType => {
  return Schema.is(BaseQueryKey)(queryKey)
}

// Encode query key to ensure it matches our schema
export const encodeQueryKey = (queryKey: QueryKeyType): QueryKeyType => {
  return Schema.encodeSync(BaseQueryKey)(queryKey)
}

// Decode query key from unknown
export const decodeQueryKey = (queryKey: unknown): QueryKeyType => {
  return Schema.decodeUnknownSync(BaseQueryKey)(queryKey)
}

// Type-safe invalidation message creators
export const createProjectsInvalidation = () => {
  return ProjectQueryKeys.all()
}

export const createProjectListInvalidation = () => {
  return ProjectQueryKeys.lists()
}

export const createProjectDetailInvalidation = (projectId: string) => {
  return ProjectQueryKeys.detail(projectId)
}

export const createTasksInvalidation = () => {
  return TaskQueryKeys.all()
}

export const createTaskListInvalidation = () => {
  return TaskQueryKeys.lists()
}

export const createTaskDetailInvalidation = (taskId: string) => {
  return TaskQueryKeys.detail(taskId)
}

export const createTaskProjectInvalidation = (projectId: string) => {
  return TaskQueryKeys.project(projectId)
}

export const createUsersInvalidation = () => {
  return UserQueryKeys.all()
}

export const createUserListInvalidation = () => {
  return UserQueryKeys.lists()
}

export const createUserDetailInvalidation = (userId: string) => {
  return UserQueryKeys.detail(userId)
}

export const createFilesInvalidation = () => {
  return FileQueryKeys.all()
}

export const createFileProjectInvalidation = (projectId: string) => {
  return FileQueryKeys.project(projectId)
}

export const createChatMessagesInvalidation = () => {
  return ChatMessageQueryKeys.all()
}

export const createChatMessageTaskInvalidation = (taskId: string) => {
  return ChatMessageQueryKeys.task(taskId)
}

export const createChatMessageDetailInvalidation = (messageId: string) => {
  return ChatMessageQueryKeys.detail(messageId)
}

// Helper to create invalidation message with proper typing
export const createTypedInvalidateQuery = (queryKey: QueryKeyType) => {
  // Validate the query key matches our schema
  const validatedKey = encodeQueryKey(queryKey)

  return {
    _tag: 'InvalidateQuery' as const,
    queryKey: validatedKey,
    timestamp: Date.now()
  }
}
