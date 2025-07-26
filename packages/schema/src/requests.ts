// request.ts
import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema } from 'effect'
import { FileCommentSchema, FileAttachmentSchema } from './chatMessageSchema.js'

// Define a project schema
export class Project extends Schema.Class<Project>('Project')({
  id: Schema.String,
  name: Schema.String,
  path: Schema.String,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}) {}

// Consolidated RPC group for all Slide operations
export class SlideRpcs extends RpcGroup.make(
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
  Rpc.make('CreateProject', {
    success: Project,
    error: Schema.String,
    payload: { name: Schema.String }
  }),
  Rpc.make('AddProject', {
    success: Project,
    error: Schema.String,
    payload: { path: Schema.String }
  }),
  Rpc.make('SelectProjectDirectory', {
    success: Schema.Union(Schema.String, Schema.Null), // Return directory path or null if cancelled
    error: Schema.String
  }),

  Rpc.make('SelectFiles', {
    success: Schema.Union(Schema.Array(FileAttachmentSchema), Schema.Null), // Return file attachments or null if cancelled
    error: Schema.String
  }),
  Rpc.make('StartTask', {
    success: Schema.String, // Return task ID
    error: Schema.String,
    payload: {
      projectId: Schema.String,
      prompt: Schema.String,
      useWorktree: Schema.optional(Schema.Boolean),
      model: Schema.optional(Schema.String),
      permissionMode: Schema.optional(Schema.String),
      attachments: Schema.optional(Schema.Array(FileAttachmentSchema))
    }
  }),
  Rpc.make('ContinueTask', {
    success: Schema.Boolean, // Return success
    error: Schema.String,
    payload: {
      taskId: Schema.String,
      prompt: Schema.String,
      sessionId: Schema.optional(Schema.String),
      model: Schema.optional(Schema.String),
      permissionMode: Schema.optional(Schema.String),
      fileComments: Schema.optional(Schema.Array(FileCommentSchema)),
      attachments: Schema.optional(Schema.Array(FileAttachmentSchema))
    }
  }),
  Rpc.make('GetTaskDiff', {
    success: Schema.String, // Return diff as string
    error: Schema.String,
    payload: {
      taskId: Schema.String,
      options: Schema.optional(Schema.Array(Schema.String))
    }
  }),
  // Task operations
  Rpc.make('ArchiveTask', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('UnarchiveTask', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('StopTask', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('DiscardChanges', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('CommitTask', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  // External application operations
  Rpc.make('OpenInGitHubDesktop', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('OpenInFinder', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('OpenInTerminal', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('OpenInEditor', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: { taskId: Schema.String }
  }),
  Rpc.make('OpenExternalLink', {
    success: Schema.Boolean,
    error: Schema.String,
    payload: {
      url: Schema.String
    }
  }),

  // Database operations
  Rpc.make('ExecuteQuery', {
    success: Schema.Struct({
      rows: Schema.Array(Schema.Any)
    }),
    error: Schema.String,
    payload: {
      sql: Schema.String,
      params: Schema.Array(Schema.Any),
      method: Schema.Union(
        Schema.Literal('all'),
        Schema.Literal('execute'),
        Schema.Literal('values'),
        Schema.Literal('run'),
        Schema.Literal('get')
      )
    }
  }),

  // System operations
  Rpc.make('GetWebviewPreloadPath', {
    success: Schema.String,
    error: Schema.String
  })
) {}
