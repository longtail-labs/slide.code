import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

// Re-exporting from other modules
export * from './messages.js'
export * from './chatMessageSchema.js' // This will be cleaned up next
export * from './queryKeys.js'
export * from './state.js'
export * from './requests.js'
export * from './client.js'

// Drizzle table definitions and relations
import {
  projects,
  tasks,
  chatMessages,
  projectsRelations,
  tasksRelations,
  chatMessagesRelations
} from './drizzle.js'

// Schema generation utility
import { createSelectSchema, createInsertSchema } from './drizzle-effect-schema.js'

// The complete drizzle schema object
export const schema = {
  projects,
  tasks,
  chatMessages,
  projectsRelations,
  tasksRelations,
  chatMessagesRelations
} as const

export { projects, tasks, chatMessages } from './drizzle.js'

export type DrizzleSchema = typeof schema

// Project Types - using both Drizzle and Effect Schema approaches
export type Project = InferSelectModel<typeof projects>
export type ProjectInsert = InferInsertModel<typeof projects>

// Effect Schema versions for validation
export const ProjectSchema = createSelectSchema(projects)
export const ProjectInsertSchema = createInsertSchema(projects)

// Task Types - using both Drizzle and Effect Schema approaches
export type Task = InferSelectModel<typeof tasks>
export type TaskInsert = InferInsertModel<typeof tasks>

// Effect Schema versions for validation
export const TaskSchema = createSelectSchema(tasks)
export const TaskInsertSchema = createInsertSchema(tasks)

// Chat Message Types - using both Drizzle and Effect Schema approaches
export type ChatMessage = InferSelectModel<typeof chatMessages>
export type ChatMessageInsert = InferInsertModel<typeof chatMessages>

// Effect Schema versions for validation
export const ChatMessageSchema = createSelectSchema(chatMessages)
export const ChatMessageInsertSchema = createInsertSchema(chatMessages)

// Composite types with relations
export type TaskWithMessages = Task & {
  chatMessages: ChatMessage[]
}

export type TaskWithProject = Task & {
  project: Project
}

export type TaskWithProjectAndMessages = Task & {
  project: Project
  chatMessages: ChatMessage[]
}

export type ChatMessageWithTask = ChatMessage & {
  task: Task
}
