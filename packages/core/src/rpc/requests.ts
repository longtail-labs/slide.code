// request.ts
import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema } from 'effect'

// Define a user with an ID and name
export class User extends Schema.Class<User>('User')({
  id: Schema.String, // User's ID as a string
  name: Schema.String // User's name as a string
}) {}

// Define a chat message schema
export class ChatMessage extends Schema.Class<ChatMessage>('ChatMessage')({
  id: Schema.String,
  text: Schema.String,
  timestamp: Schema.Number
}) {}

// Define a project schema
export class Project extends Schema.Class<Project>('Project')({
  id: Schema.String,
  name: Schema.String,
  path: Schema.String
}) {}

// Define a task schema
export class Task extends Schema.Class<Task>('Task')({
  id: Schema.String,
  title: Schema.String,
  projectId: Schema.optional(Schema.String),
  status: Schema.String
}) {}

// Consolidated RPC group for all Slide operations
export class SlideRpcs extends RpcGroup.make(
  // User operations
  Rpc.make('UserList', {
    success: User,
    stream: true
  }),
  Rpc.make('UserById', {
    success: User,
    error: Schema.String,
    payload: {
      id: Schema.String
    }
  }),
  Rpc.make('UserCreate', {
    success: User,
    payload: {
      name: Schema.String
    }
  }),

  // Chat streaming example
  Rpc.make('StreamChatMessages', {
    success: ChatMessage,
    stream: true,
    payload: {
      interval: Schema.optional(Schema.Number)
    }
  }),

  // New RPCs
  Rpc.make('GetFileDiff', {
    success: Schema.String,
    error: Schema.String,
    payload: { path: Schema.String }
  }),
  Rpc.make('GetFileContent', {
    success: Schema.String,
    error: Schema.String,
    payload: { path: Schema.String }
  }),
  Rpc.make('FileState', {
    success: Schema.String,
    error: Schema.String,
    payload: { path: Schema.String }
  }),
  Rpc.make('ProjectFiles', {
    success: Schema.String, // path
    stream: true,
    error: Schema.String,
    payload: { projectId: Schema.String }
  }),
  Rpc.make('CreateTask', {
    success: Task,
    error: Schema.String,
    payload: {
      initialPrompt: Schema.String,
      withWorkTree: Schema.Boolean,
      projectId: Schema.optional(Schema.String)
    }
  }),
  Rpc.make('WorkOnTask', {
    success: Task,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('ArchiveTask', {
    success: Task,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('AddProject', {
    success: Project,
    error: Schema.String,
    payload: { path: Schema.String }
  })
) {}
