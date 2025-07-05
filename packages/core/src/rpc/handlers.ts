// handlers.ts
import type { Rpc } from '@effect/rpc'
import { Effect, Layer, Ref, Stream, Schedule, Option } from 'effect'
import { SlideRpcs, Project } from '@slide.code/schema/requests'
import { DatabaseService } from '../services/database.service.js'
import { PubSubClient } from '../services/pubsub.service.js'
import {
  createInvalidateQuery,
  createTaskStart,
  createTaskContinue,
  createTaskStop
} from '@slide.code/schema/messages'
import { createProjectListInvalidation, createTypedInvalidateQuery } from '@slide.code/schema'

import type { TaskInsert, SdkMessage } from '@slide.code/schema'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { getDefaultProjectsDir, getVibeDir } from '@slide.code/shared'
import { ensureDirectory, sanitizePathName, pathExists } from '../utils/filesystem.util.js'
import { GitRepoTag, makeGitRepo } from '../resources/GitRepo/git-repo.resource.js'
import { dialog, shell } from 'electron'
// import { ProjectRepository } from '@slide.code/db/repositories/projectRepository.js'

// Utility function to format database results for Drizzle
function toDrizzleResult(
  rows: Record<string, any> | Array<Record<string, any>> | null,
  method: 'all' | 'execute' | 'values' | 'run' | 'get'
): any[] | any {
  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    return method === 'get' ? null : []
  }

  // For 'get' method, return first row as array of values
  if (method === 'get') {
    const row = Array.isArray(rows) ? rows[0] : rows
    return row ? Object.values(row) : null
  }

  // For other methods, convert all rows to arrays
  return Array.isArray(rows) ? rows.map((row) => Object.values(row)) : [Object.values(rows)]
}

// ---------------------------------------------
// Imaginary Database
// ---------------------------------------------

// class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
//   effect: Effect.gen(function* () {
//     console.log('[USER-REPOSITORY] 🔧 Initializing user repository')
//     // const ref = yield* Ref.make<Array<User>>([
//     //   new User({ id: '1', name: 'Alice', timestamp: Date.now() }),
//     //   new User({ id: '2', name: 'Bob', timestamp: Date.now() })
//     // ])
//     console.log('[USER-REPOSITORY] 🔧 User repository initialized with 2 users')

//     return {
//       findMany: Effect.tap(ref.get, (users) => {
//         console.log('[USER-REPOSITORY] 🔧 Finding all users:', users)
//         return Effect.void
//       }),

//       findById: (id: string) =>
//         Ref.get(ref).pipe(
//           Effect.andThen((users) => {
//             console.log('[USER-REPOSITORY] 🔧 Finding user by id:', id)
//             const user = users.find((user) => user.id === id)

//             if (user) {
//               console.log('[USER-REPOSITORY] 🔧 User found:', user)
//               return Effect.succeed(user)
//             } else {
//               console.log('[USER-REPOSITORY] 🔧 User not found with id:', id)
//               return Effect.fail(`User not found: ${id}`)
//             }
//           })
//         ),

//       create: (name: string) =>
//         Effect.gen(function* () {
//           console.log('[USER-REPOSITORY] 🔧 Creating new user with name:', name)
//           const users = yield* Ref.get(ref)
//           const newUser = new User({ id: String(users.length + 1), name, timestamp: Date.now() })
//           yield* Ref.update(ref, (users) => [...users, newUser])
//           console.log('[USER-REPOSITORY] 🔧 New user created:', newUser)
//           return newUser
//         })
//     }
//   })
// }) {}

// class ProjectRepository extends Effect.Service<ProjectRepository>()('ProjectRepository', {
//   effect: Effect.gen(function* () {
//     const projects = yield* Ref.make<Array<Project>>([])

//     return {
//       find: (id: string) =>
//         Ref.get(projects).pipe(
//           Effect.map((ps) => Option.fromNullable(ps.find((p) => p.id === id)))
//         ),
//       add: (projectPath: string) =>
//         Effect.gen(function* () {
//           const name = path.basename(projectPath)
//           const id = projectPath // using path as id
//           const now = new Date()
//           const newProject = new Project({
//             id,
//             name,
//             path: projectPath,
//             createdAt: now,
//             updatedAt: now
//           })
//           yield* Ref.update(projects, (ps) => [...ps, newProject])
//           return newProject
//         })
//     }
//   })
// }) {}

// // Helper function to convert TaskModel to RPC Task
// const taskModelToRpcTask = (taskModel: TaskModel): Task =>
//   new Task({
//     id: taskModel.id,
//     name: taskModel.name,
//     projectId: taskModel.projectId,
//     useWorktree: taskModel.useWorktree,
//     status: taskModel.status,
//     branch: taskModel.branch,
//     stats: taskModel.stats,
//     sessionId: taskModel.sessionId,
//     model: taskModel.model,
//     createdAt: taskModel.createdAt,
//     updatedAt: taskModel.updatedAt
//   })

// ---------------------------------------------
// Consolidated RPC handlers
// ---------------------------------------------

export const SlideLive = SlideRpcs.toLayer(
  Effect.gen(function* () {
    console.log('[SLIDE-LIVE] 🔧 Creating Slide live layer with enhanced logging')
    // const userRepo = yield* UserRepository
    const dbService = yield* DatabaseService
    const pubsubClient = yield* PubSubClient

    // Helper function to recursively read files
    const readFilesRecursive = (dir: string): Stream.Stream<string, Error> =>
      Stream.fromIterableEffect(
        Effect.tryPromise({
          try: () => fs.readdir(dir, { withFileTypes: true }),
          catch: (e) => e as Error
        })
      ).pipe(
        Stream.flatMap((entry) => {
          const fullPath = path.join(dir, entry.name)
          return entry.isDirectory() ? readFilesRecursive(fullPath) : Stream.succeed(fullPath)
        })
      )

    return {
      // User handlers
      // UserList: () => {
      //   console.log('[RPC-HANDLER] 🔧 UserList called - returning user stream')
      //   const userStream = Stream.fromIterableEffect(userRepo.findMany)
      //   return userStream.pipe(
      //     Stream.tap((user) =>
      //       Effect.sync(() => {
      //         console.log('[RPC-HANDLER] 🔧 UserList streaming user:', user)
      //       })
      //     )
      //   )
      // },
      // UserById: ({ id }) => {
      //   console.log('[RPC-HANDLER] 🔧 UserById called with id:', id)
      //   return userRepo.findById(id).pipe(
      //     Effect.tap((user) =>
      //       Effect.sync(() => {
      //         console.log('[RPC-HANDLER] 🔧 UserById returning user:', user)
      //       })
      //     ),
      //     Effect.catchAll((error) =>
      //       Effect.gen(function* () {
      //         console.log('[RPC-HANDLER] ❌ UserById error:', error)
      //         return yield* Effect.fail(error)
      //       })
      //     )
      //   )
      // },
      // UserCreate: ({ name }) => {
      //   console.log('[RPC-HANDLER] 🔧 UserCreate called with name:', name)
      //   return userRepo.create(name).pipe(
      //     Effect.tap((user) =>
      //       Effect.sync(() => {
      //         console.log('[RPC-HANDLER] 🔧 UserCreate returning new user:', user)
      //       })
      //     )
      //   )
      // },

      // // Chat streaming handler
      // StreamChatMessages: ({ interval = 1000 }) => {
      //   console.log('[RPC-HANDLER] 🔧 StreamChatMessages called with interval:', interval)
      //   let counter = 0

      //   // Create a stream that emits a new message every specified interval (default: 1 second)
      //   return Stream.repeatEffect(
      //     Effect.sync(() => {
      //       counter++
      //       const message = new ChatMessage({
      //         id: `msg-${counter}`,
      //         text: `Message #${counter} at ${new Date().toLocaleTimeString()}`,
      //         timestamp: Date.now()
      //       })
      //       console.log('[RPC-HANDLER] 🔧 StreamChatMessages emitting message:', message)
      //       return message
      //     })
      //   ).pipe(Stream.schedule(Schedule.spaced(interval)))
      // },

      // // Task handlers
      // ListTasks: () => {
      //   console.log('[RPC-HANDLER] 🔧 ListTasks called')
      //   return Effect.sync(() => {
      //     const allTasks = tasks.find({}).fetch()
      //     console.log('[RPC-HANDLER] 🔧 ListTasks found tasks:', allTasks)
      //     return allTasks.map(taskModelToRpcTask)
      //   }).pipe(
      //     Effect.tap((tasks) => {
      //       console.log('[RPC-HANDLER] 🔧 ListTasks returning tasks:', tasks.length)
      //     })
      //   )
      // },
      // GetTask: ({ taskId }) => {
      //   console.log('[RPC-HANDLER] 🔧 GetTask called with id:', taskId)
      //   return Effect.sync(() => tasks.findOne({ id: taskId })).pipe(
      //     Effect.flatMap((taskModel) => {
      //       if (!taskModel) {
      //         return Effect.fail(`Task not found: ${taskId}`)
      //       }
      //       console.log('[RPC-HANDLER] 🔧 GetTask returning task:', taskModel)
      //       return Effect.succeed(taskModelToRpcTask(taskModel))
      //     })
      //   )
      // },
      // CreateTask: ({ name, projectId, useWorktree, branch }) => {
      //   console.log('[RPC-HANDLER] 🔧 CreateTask called with:', {
      //     name,
      //     projectId,
      //     useWorktree,
      //     branch
      //   })
      //   const taskData: TaskInsert = {
      //     name,
      //     projectId,
      //     useWorktree,
      //     status: 'waiting',
      //     branch
      //   }
      //   return Effect.sync(() => insertTask(tasks, taskData)).pipe(
      //     Effect.map(taskModelToRpcTask),
      //     Effect.tap((task) =>
      //       Effect.sync(() => {
      //         console.log('[RPC-HANDLER] 🔧 CreateTask returning new task:', task)
      //       })
      //     )
      //   )
      // },
      // UpdateTask: ({ taskId, name, projectId, useWorktree, status, branch }) => {
      //   console.log('[RPC-HANDLER] 🔧 UpdateTask called with:', {
      //     taskId,
      //     name,
      //     projectId,
      //     useWorktree,
      //     status,
      //     branch
      //   })
      //   return Effect.sync(() => {
      //     const currentTask = tasks.findOne({ id: taskId })
      //     if (!currentTask) {
      //       throw new Error(`Task not found: ${taskId}`)
      //     }

      //     const updateData: any = {}
      //     if (name !== undefined) updateData.name = name
      //     if (projectId !== undefined) updateData.projectId = projectId
      //     if (useWorktree !== undefined) updateData.useWorktree = useWorktree
      //     if (status !== undefined) updateData.status = status
      //     if (branch !== undefined) updateData.branch = branch

      //     tasks.updateOne({ id: taskId }, { $set: updateData })
      //     const updatedTask = tasks.findOne({ id: taskId })!
      //     return taskModelToRpcTask(updatedTask)
      //   }).pipe(
      //     Effect.tap((task) =>
      //       Effect.sync(() => {
      //         console.log('[RPC-HANDLER] 🔧 UpdateTask returning updated task:', task)
      //       })
      //     )
      //   )
      // },
      // DeleteTask: ({ taskId }) => {
      //   console.log('[RPC-HANDLER] 🔧 DeleteTask called with id:', taskId)
      //   return Effect.sync(() => {
      //     const result = tasks.removeOne({ id: taskId })
      //     console.log('[RPC-HANDLER] 🔧 DeleteTask result:', result)
      //     return result > 0
      //   })
      // },

      // File handlers
      GetFileDiff: ({ path }) =>
        Effect.succeed(`--- a/${path}\\n+++ b/${path}\\n... diff for ${path}`),
      GetFileContent: ({ path }) =>
        Effect.tryPromise({
          try: () => fs.readFile(path, 'utf-8'),
          catch: (e) => (e as Error).message
        }),
      FileState: ({ path }) => Effect.succeed('modified'),
      ProjectFiles: ({ projectId }) => Effect.succeed('test'),
      // projectRepo.find(projectId).pipe(
      //   Effect.flatMap(
      //     Option.match({
      //       onNone: () => Effect.fail(`Project with id ${projectId} not found`),
      //       onSome: (project) => Effect.succeed(readFilesRecursive(project.path))
      //     })
      //   ),
      //   Stream.unwrap,
      //   Stream.mapError((e) => (e instanceof Error ? e.message : String(e)))
      // ),
      // AddProject: ({ path: projectPath }) => {
      //   console.log('[RPC-HANDLER] 🔧 AddProject called with path:', projectPath)
      //   return Effect.sync(() => {
      //     const { projects } = dbService.collections
      //     const projectData = {
      //       name: path.basename(projectPath),
      //       path: projectPath
      //     }
      //     const projectModel = insertProject(projects, projectData)
      //     return new Project({
      //       id: projectModel.id,
      //       name: projectModel.name,
      //       path: projectModel.path,
      //       createdAt: projectModel.createdAt,
      //       updatedAt: projectModel.updatedAt
      //     })
      //   })
      // },
      // CreateProject: ({ name }) => {
      //   console.log('[RPC-HANDLER] 🔧 CreateProject called with name:', name)
      //   return Effect.sync(() => {
      //     const { projects } = dbService.collections
      //     // Create a default path in the vibe-dir projects folder
      //     const defaultProjectsDir = getDefaultProjectsDir()
      //     const projectPath = path.join(defaultProjectsDir, name)
      //     const projectData = {
      //       name: name,
      //       path: projectPath
      //     }
      //     const projectModel = insertProject(projects, projectData)
      //     return new Project({
      //       id: projectModel.id,
      //       name: projectModel.name,
      //       path: projectModel.path,
      //       createdAt: projectModel.createdAt,
      //       updatedAt: projectModel.updatedAt
      //     })
      //   })
      // },

      // Project operations
      AddProject: ({ path: projectPath }) => {
        console.log('[RPC-HANDLER] 🔧 AddProject called with path:', projectPath)
        return Effect.gen(function* () {
          // Use Node.js path.basename to extract project name properly
          const projectName = path.basename(projectPath)

          console.log('[RPC-HANDLER] 🔧 Extracted project name:', projectName)

          // Ensure the project directory is a git repository
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: projectPath,
                branchName: 'master',
                useWorktree: false,
                autoInit: true // Initialize git if not already present
              })

              console.log('[RPC-HANDLER] 🔧 Git repository ensured at:', projectPath)
            })
          )

          // Create the project in the database
          const projectData = {
            name: projectName,
            path: projectPath
          }

          const createdProject = yield* dbService.createProject(projectData)
          console.log('[RPC-HANDLER] 🔧 Project added to database:', createdProject.id)

          // Create and broadcast strongly-typed invalidation message
          const projectListQueryKey = createProjectListInvalidation()
          const invalidateMessage = createTypedInvalidateQuery(projectListQueryKey)
          yield* pubsubClient.publish(invalidateMessage)
          console.log('[RPC-HANDLER] 🔧 Broadcasted strongly-typed project invalidation message')

          // Convert to RPC Project format
          return new Project({
            id: createdProject.id,
            name: createdProject.name,
            path: createdProject.path,
            createdAt: new Date(createdProject.createdAt),
            updatedAt: new Date(createdProject.updatedAt)
          })
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ AddProject error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      SelectProjectDirectory: () => {
        console.log('[RPC-HANDLER] 📁 SelectProjectDirectory called')
        return Effect.tryPromise({
          try: async (): Promise<string | null> => {
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory'],
              title: 'Select Project Directory'
            })

            if (result.canceled || result.filePaths.length === 0) {
              console.log('[RPC-HANDLER] 📁 Directory selection cancelled')
              return null
            }

            const selectedPath = result.filePaths[0]
            if (!selectedPath) {
              console.log('[RPC-HANDLER] 📁 No directory path received')
              return null
            }

            console.log('[RPC-HANDLER] 📁 Directory selected:', selectedPath)
            return selectedPath
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ SelectProjectDirectory error:', errorMessage)
            return errorMessage
          }
        })
      },

      CreateProject: ({ name }) => {
        console.log('[RPC-HANDLER] 🔧 CreateProject called with name:', name)
        return Effect.gen(function* () {
          // Sanitize the project name for filesystem use
          const sanitizedName = sanitizePathName(name)

          // Get the default projects directory from vibe-dir
          const defaultProjectsDir = getVibeDir()
          const projectPath = path.join(defaultProjectsDir, sanitizedName)

          console.log('[RPC-HANDLER] 🔧 Creating project at path:', projectPath)

          // Check if a project with this name already exists
          const directoryExists = yield* pathExists(projectPath)
          if (directoryExists) {
            return yield* Effect.fail(
              `A project with the name '${name}' already exists at: ${projectPath}`
            )
          }

          // Ensure the directory exists
          yield* ensureDirectory(projectPath)

          // Initialize git repository in the directory
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: projectPath,
                branchName: 'master',
                useWorktree: false,
                autoInit: true
              })

              console.log('[RPC-HANDLER] 🔧 Git repository initialized at:', projectPath)
            })
          )

          // Create the project in the database
          const projectData = {
            name: name,
            path: projectPath
          }

          const createdProject = yield* dbService.createProject(projectData)
          console.log('[RPC-HANDLER] 🔧 Project created in database:', createdProject.id)

          // Create and broadcast strongly-typed invalidation message
          const projectListQueryKey = createProjectListInvalidation()
          const invalidateMessage = createTypedInvalidateQuery(projectListQueryKey)
          yield* pubsubClient.publish(invalidateMessage)
          console.log('[RPC-HANDLER] 🔧 Broadcasted strongly-typed project invalidation message')

          // Convert to RPC Project format
          return new Project({
            id: createdProject.id,
            name: createdProject.name,
            path: createdProject.path,
            createdAt: new Date(createdProject.createdAt),
            updatedAt: new Date(createdProject.updatedAt)
          })
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ CreateProject error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // Task operations
      StartTask: ({ projectId, prompt, useWorktree }) => {
        console.log('[RPC-HANDLER] 🔧 StartTask called with:', {
          projectId,
          prompt,
          useWorktree
        })
        return Effect.gen(function* () {
          // First, get the project from the database to get its path
          const project = yield* dbService.getProject(projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${projectId}`)
          }

          console.log('[RPC-HANDLER] 🔧 Project found:', project.path)

          // Create a task in the database
          const taskData = {
            name: prompt,
            projectId,
            useWorktree: useWorktree || false,
            status: 'running' as const,
            branch: useWorktree ? 'feature/claude-task' : undefined
          }

          console.log('TASK DATA', taskData)

          const createdTask = yield* dbService.createTask(taskData)
          console.log('[RPC-HANDLER] 🔧 Task created in database:', createdTask.id)

          // Publish TASK_START message for subscribers to handle
          const taskStartMessage = createTaskStart(createdTask.id)
          yield* pubsubClient.publish(taskStartMessage)
          console.log('[RPC-HANDLER] 🔧 Published TASK_START message for task:', createdTask.id)

          return createdTask.id
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ StartTask error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // Continue an existing task
      ContinueTask: ({ taskId, prompt, sessionId }) => {
        console.log('[RPC-HANDLER] 🔄 ContinueTask called with:', {
          taskId,
          prompt,
          sessionId
        })
        return Effect.gen(function* () {
          // Publish TASK_CONTINUE message for subscribers to handle
          const taskContinueMessage = createTaskContinue(taskId, prompt, sessionId)
          yield* pubsubClient.publish(taskContinueMessage)
          console.log('[RPC-HANDLER] 🔄 Published TASK_CONTINUE message for task:', taskId)

          return true
        }).pipe(
          Effect.catchAll((error) => {
            console.error('[RPC-HANDLER] ❌ ContinueTask error:', error)
            return Effect.fail(String(error))
          })
        )
      },

      // Get diff for a task
      GetTaskDiff: ({ taskId, options }) => {
        console.log('[RPC-HANDLER] 🔍 GetTaskDiff called with:', { taskId, options })
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          console.log('[RPC-HANDLER] 🔍 Getting diff for project:', project.path)

          // Initialize git repo and get diff
          const diff = yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false // Don't auto-init, assume repo exists
              })

              // Get the complete diff including untracked files
              const diffResult = yield* gitRepo.gitDiffIncludingUntracked()
              console.log('[RPC-HANDLER] 🔍 Complete diff retrieved, length:', diffResult.length)
              return diffResult
            })
          )

          return diff
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ GetTaskDiff error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // Task archive operations
      ArchiveTask: ({ taskId }) => {
        console.log('[RPC-HANDLER] 📦 ArchiveTask called with:', { taskId })
        return Effect.gen(function* () {
          yield* dbService.archiveTask(taskId)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ ArchiveTask error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      UnarchiveTask: ({ taskId }) => {
        console.log('[RPC-HANDLER] 📦 UnarchiveTask called with:', { taskId })
        return Effect.gen(function* () {
          yield* dbService.unarchiveTask(taskId)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ UnarchiveTask error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      StopTask: ({ taskId }) => {
        console.log('[RPC-HANDLER] 🛑 StopTask called with:', { taskId })
        return Effect.gen(function* () {
          // Publish a TASK_STOP message for the task listener to handle
          // The listener will find and cancel the running Claude Code agent
          const taskStopMessage = createTaskStop(taskId)
          yield* pubsubClient.publish(taskStopMessage)
          console.log('[RPC-HANDLER] 🛑 Published TASK_STOP message for task:', taskId)

          return true
        })
      },

      DiscardChanges: ({ taskId }) => {
        console.log('[RPC-HANDLER] 🗑️ DiscardChanges called with:', { taskId })
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          console.log('[RPC-HANDLER] 🗑️ Discarding changes for project:', project.path)

          // Initialize git repo and discard changes
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false
              })

              // Use the proper GitRepo method to discard all changes
              yield* gitRepo.discardAllChanges()

              console.log('[RPC-HANDLER] 🗑️ Changes discarded successfully')
            })
          )

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = String(error)
            console.error('[RPC-HANDLER] ❌ DiscardChanges error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // Git operations
      CommitTask: ({ taskId }) => {
        console.log('[RPC-HANDLER] 🔄 CommitTask called with:', { taskId })
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          console.log('[RPC-HANDLER] 🔄 Committing changes for project:', project.path)

          // Get the latest user prompt for the commit message
          const latestPrompt = yield* dbService.getLatestUserPromptForTask(taskId)
          let commitMessage = task.name // Default to task name

          if (latestPrompt && latestPrompt.event && latestPrompt.event.type === 'prompt') {
            // Extract the content from the prompt event
            const promptEvent = latestPrompt.event as any
            if (promptEvent.content) {
              commitMessage = promptEvent.content
              console.log('[RPC-HANDLER] 🔄 Using latest user prompt as commit message')
            }
          }

          console.log('[RPC-HANDLER] 🔄 Commit message:', commitMessage)

          // Initialize git repo and commit changes
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false
              })

              // Add all changes
              yield* gitRepo.add('.')

              // Use the latest user prompt as commit message, fallback to task name
              yield* gitRepo.commit(commitMessage)

              console.log('[RPC-HANDLER] 🔄 Changes committed successfully')
            })
          )

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ CommitTask error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // External application operations
      OpenInGitHubDesktop: ({ taskId }) => {
        console.log('[RPC-HANDLER] 🐙 OpenInGitHubDesktop called with:', { taskId })
        return Effect.gen(function* () {
          // Get task and project info
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Determine the path to open (worktree path or project path)
          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          // Open in GitHub Desktop using the github: URL scheme
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('open', ['-a', 'GitHub Desktop', pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', reject)
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  } else {
                    reject(new Error(`GitHub Desktop failed to open with exit code: ${code}`))
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open GitHub Desktop: ${error}`)
          })

          console.log('[RPC-HANDLER] 🐙 Opened in GitHub Desktop:', pathToOpen)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ OpenInGitHubDesktop error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInFinder: ({ taskId }) => {
        console.log('[RPC-HANDLER] 📁 OpenInFinder called with:', { taskId })
        return Effect.gen(function* () {
          // Get task and project info
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Determine the path to open (worktree path or project path)
          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          // Open in Finder
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('open', [pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', reject)
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  } else {
                    reject(new Error(`Finder failed to open with exit code: ${code}`))
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open Finder: ${error}`)
          })

          console.log('[RPC-HANDLER] 📁 Opened in Finder:', pathToOpen)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ OpenInFinder error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInTerminal: ({ taskId }) => {
        console.log('[RPC-HANDLER] 💻 OpenInTerminal called with:', { taskId })
        return Effect.gen(function* () {
          // Get task and project info
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Determine the path to open (worktree path or project path)
          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          // Try to open in iTerm first, then fallback to system Terminal
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                // Try iTerm first
                const child = spawn('open', ['-a', 'iTerm', pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', () => {
                  // Fallback to system Terminal
                  const fallbackChild = spawn('open', ['-a', 'Terminal', pathToOpen], {
                    stdio: 'ignore',
                    detached: true
                  })
                  fallbackChild.on('error', reject)
                  fallbackChild.on('exit', (code) => {
                    if (code === 0 || code === null) {
                      resolve()
                    } else {
                      reject(new Error(`Terminal failed to open with exit code: ${code}`))
                    }
                  })
                  fallbackChild.unref()
                })
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  }
                  // Don't reject here, let the error handler above handle iTerm failure
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open terminal: ${error}`)
          })

          console.log('[RPC-HANDLER] 💻 Opened in terminal:', pathToOpen)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ OpenInTerminal error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInEditor: ({ taskId }) => {
        console.log('[RPC-HANDLER] ✏️ OpenInEditor called with:', { taskId })
        return Effect.gen(function* () {
          // Get task and project info
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Determine the path to open (worktree path or project path)
          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          // Try to open in Cursor first, then fallback to VS Code
          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                // Try Cursor first
                const child = spawn('cursor', [pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', () => {
                  // Fallback to VS Code
                  const fallbackChild = spawn('code', [pathToOpen], {
                    stdio: 'ignore',
                    detached: true
                  })
                  fallbackChild.on('error', reject)
                  fallbackChild.on('exit', (code) => {
                    if (code === 0 || code === null) {
                      resolve()
                    } else {
                      reject(new Error(`Editor failed to open with exit code: ${code}`))
                    }
                  })
                  fallbackChild.unref()
                })
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  }
                  // Don't reject here, let the error handler above handle Cursor failure
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open editor: ${error}`)
          })

          console.log('[RPC-HANDLER] ✏️ Opened in editor:', pathToOpen)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ OpenInEditor error:', errorMessage)
            return Effect.fail(errorMessage)
          })
        )
      },

      // External operations
      OpenExternalLink: ({ url }) => {
        console.log('[RPC-HANDLER] 🔗 OpenExternalLink called with:', { url })
        return Effect.tryPromise({
          try: () => shell.openExternal(url),
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ OpenExternalLink error:', errorMessage)
            return errorMessage
          }
        }).pipe(
          Effect.tap(() => {
            console.log('[RPC-HANDLER] ✅ External link opened successfully:', url)
          }),
          Effect.map(() => true),
          Effect.catchAll((error) => {
            console.error('[RPC-HANDLER] ❌ Failed to open external link:', error)
            return Effect.fail(String(error))
          })
        )
      },

      // Database operations
      ExecuteQuery: ({ sql, params, method }) => {
        console.log('[RPC-HANDLER] 🔧 ExecuteQuery called with:', { sql, params, method })
        return Effect.tryPromise({
          try: async () => {
            // Get database service (we'll need to add a prepare method to it)
            const stmt = dbService.prepare(sql)
            const result = await stmt[method](...params)
            return { rows: toDrizzleResult(result, method) }
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[RPC-HANDLER] ❌ ExecuteQuery error:', errorMessage)
            return errorMessage
          }
        })
      }
    }
  })
).pipe(
  // Provide the repository layers
  // Layer.provide(UserRepository.Default),
  // Layer.provide(ProjectRepository.Default),
  Layer.provide(DatabaseService.Default),
  Layer.provide(PubSubClient.Default)
)
