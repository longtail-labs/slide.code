// request.ts
import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema } from 'effect'

// Define a user with an ID and name
// export class User extends Schema.Class<User>('User')({
//   id: Schema.String, // User's ID as a string
//   name: Schema.String, // User's name as a string
//   timestamp: Schema.Number
// }) {}

// Define a chat message schema
// export class ChatMessage extends Schema.Class<ChatMessage>('ChatMessage')({
//   id: Schema.String,
//   text: Schema.String,
//   timestamp: Schema.Number
// }) {}

// Define a project schema
export class Project extends Schema.Class<Project>('Project')({
  id: Schema.String,
  name: Schema.String,
  path: Schema.String,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}) {}

// // Define a task schema - matches database Task schema
// export class Task extends Schema.Class<Task>('Task')({
//   id: Schema.String,
//   name: Schema.String,
//   projectId: Schema.String,
//   useWorktree: Schema.optional(Schema.Boolean),
//   status: Schema.Union(
//     Schema.Literal('waiting'),
//     Schema.Literal('working'),
//     Schema.Literal('burner'),
//     Schema.Literal('archived'),
//     Schema.Literal('completed')
//   ),
//   branch: Schema.optional(Schema.String),
//   stats: Schema.optional(
//     Schema.Struct({
//       additions: Schema.Number,
//       deletions: Schema.Number
//     })
//   ),
//   sessionId: Schema.optional(Schema.String),
//   model: Schema.optional(Schema.String),
//   createdAt: Schema.DateFromSelf,
//   updatedAt: Schema.DateFromSelf
// }) {}

// Consolidated RPC group for all Slide operations
export class SlideRpcs extends RpcGroup.make(
  // User operations
  // Rpc.make('UserList', {
  //   success: User,
  //   stream: true
  // }),
  // Rpc.make('UserById', {
  //   success: User,
  //   error: Schema.String,
  //   payload: {
  //     id: Schema.String
  //   }
  // }),
  // Rpc.make('UserCreate', {
  //   success: User,
  //   payload: {
  //     name: Schema.String
  //   }
  // }),

  // // Chat streaming example
  // Rpc.make('StreamChatMessages', {
  //   success: ChatMessage,
  //   stream: true,
  //   payload: {
  //     interval: Schema.optional(Schema.Number)
  //   }
  // }),

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
  // Task operations
  // Rpc.make('ListTasks', {
  //   success: Schema.Array(Task),
  //   error: Schema.String
  // }),
  // Rpc.make('GetTask', {
  //   success: Task,
  //   error: Schema.String,
  //   payload: { taskId: Schema.String }
  // }),
  // Rpc.make('CreateTask', {
  //   success: Task,
  //   error: Schema.String,
  //   payload: {
  //     name: Schema.String,
  //     projectId: Schema.String,
  //     useWorktree: Schema.optional(Schema.Boolean),
  //     branch: Schema.optional(Schema.String)
  //   }
  // }),
  // Rpc.make('UpdateTask', {
  //   success: Task,
  //   error: Schema.String,
  //   payload: {
  //     taskId: Schema.String,
  //     name: Schema.optional(Schema.String),
  //     projectId: Schema.optional(Schema.String),
  //     useWorktree: Schema.optional(Schema.Boolean),
  //     status: Schema.optional(
  //       Schema.Union(
  //         Schema.Literal('waiting'),
  //         Schema.Literal('working'),
  //         Schema.Literal('burner'),
  //         Schema.Literal('archived'),
  //         Schema.Literal('completed')
  //       )
  //     ),
  //     branch: Schema.optional(Schema.String)
  //   }
  // }),
  // Rpc.make('DeleteTask', {
  //   success: Schema.Boolean,
  //   error: Schema.String,
  //   payload: { taskId: Schema.String }
  // }),
  // Rpc.make('AddProject', {
  //   success: Project,
  //   error: Schema.String,
  //   payload: { path: Schema.String }
  // }),
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
  Rpc.make('StartTask', {
    success: Schema.String, // Return task ID
    error: Schema.String,
    payload: {
      projectId: Schema.String,
      prompt: Schema.String,
      useWorktree: Schema.optional(Schema.Boolean)
    }
  }),
  Rpc.make('ContinueTask', {
    success: Schema.Boolean, // Return success
    error: Schema.String,
    payload: {
      taskId: Schema.String,
      prompt: Schema.String,
      sessionId: Schema.optional(Schema.String)
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
  // Rpc.make('ListProjects', {
  //   success: Schema.Array(Project),
  //   error: Schema.String
  // }),
  // Rpc.make('GetProject', {
  //   success: Project,
  //   error: Schema.String,
  //   payload: { projectId: Schema.String }
  // }),
  // Rpc.make('UpdateProject', {
  //   success: Project,
  //   error: Schema.String,
  //   payload: {
  //     projectId: Schema.String,
  //     name: Schema.optional(Schema.String),
  //     path: Schema.optional(Schema.String)
  //   }
  // }),
  // Rpc.make('DeleteProject', {
  //   success: Schema.Boolean,
  //   error: Schema.String,
  //   payload: { projectId: Schema.String }
  // }),

  // External operations
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
  })
) {}

// // request.ts
// import { Rpc, RpcGroup } from '@effect/rpc'
// import { Schema } from 'effect'

// // Define a user with an ID and name
// export class User extends Schema.Class<User>('User')({
//   id: Schema.String, // User's ID as a string
//   name: Schema.String // User's name as a string
// }) {}

// // Define a chat message schema
// export class ChatMessage extends Schema.Class<ChatMessage>('ChatMessage')({
//   id: Schema.String,
//   text: Schema.String,
//   timestamp: Schema.Number
// }) {}

// // Consolidated RPC group for all Slide operations
// export class SlideRpcs extends RpcGroup.make(
//   // User operations
//   Rpc.make('UserList', {
//     success: User,
//     stream: true
//   }),
//   Rpc.make('UserById', {
//     success: User,
//     error: Schema.String,
//     payload: {
//       id: Schema.String
//     }
//   }),
//   Rpc.make('UserCreate', {
//     success: User,
//     payload: {
//       name: Schema.String
//     }
//   }),

//   // Chat streaming example
//   Rpc.make('StreamChatMessages', {
//     success: ChatMessage,
//     stream: true,
//     payload: {
//       interval: Schema.optional(Schema.Number)
//     }
//   })
// ) {}
