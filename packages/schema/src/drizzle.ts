import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import type { ChatMessageEvent } from './chatMessageSchema.js'
import { messageSubtypes, taskStatuses, messageTypes } from './chatMessageSchema.js'
import { v4 as uuidv4 } from 'uuid'

export const projects = sqliteTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  path: text('path').notNull(),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull()
    .$onUpdate(() => new Date().toISOString())
})

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks)
}))

export const tasks = sqliteTable('tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status', { enum: taskStatuses }).default('pending').notNull(),
  needsReview: integer('needs_review', { mode: 'boolean' }).default(true),
  archived: integer('archived', { mode: 'boolean' }).default(false),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull()
    .$onUpdate(() => new Date().toISOString())
})

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  chatMessages: many(chatMessages)
}))

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: messageTypes
  }).notNull(),
  subtype: text('subtype', { enum: messageSubtypes }),
  event: text('event', { mode: 'json' }).$type<ChatMessageEvent>().notNull(),
  sessionId: text('session_id'),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull()
})

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  task: one(tasks, {
    fields: [chatMessages.taskId],
    references: [tasks.id]
  })
}))
