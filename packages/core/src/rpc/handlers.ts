// handlers.ts
import type { Rpc } from '@effect/rpc'
import { Effect, Layer, Ref, Stream, Schedule, Option } from 'effect'
import { User, SlideRpcs, ChatMessage, Project, Task } from './requests.js'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as crypto from 'node:crypto'
// ---------------------------------------------
// Imaginary Database
// ---------------------------------------------

class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
  effect: Effect.gen(function* () {
    console.log('[USER-REPOSITORY] 🔧 Initializing user repository')
    const ref = yield* Ref.make<Array<User>>([
      new User({ id: '1', name: 'Alice' }),
      new User({ id: '2', name: 'Bob' })
    ])
    console.log('[USER-REPOSITORY] 🔧 User repository initialized with 2 users')

    return {
      findMany: Effect.tap(ref.get, (users) => {
        console.log('[USER-REPOSITORY] 🔧 Finding all users:', users)
        return Effect.void
      }),

      findById: (id: string) =>
        Ref.get(ref).pipe(
          Effect.andThen((users) => {
            console.log('[USER-REPOSITORY] 🔧 Finding user by id:', id)
            const user = users.find((user) => user.id === id)

            if (user) {
              console.log('[USER-REPOSITORY] 🔧 User found:', user)
              return Effect.succeed(user)
            } else {
              console.log('[USER-REPOSITORY] 🔧 User not found with id:', id)
              return Effect.fail(`User not found: ${id}`)
            }
          })
        ),

      create: (name: string) =>
        Effect.gen(function* () {
          console.log('[USER-REPOSITORY] 🔧 Creating new user with name:', name)
          const users = yield* Ref.get(ref)
          const newUser = new User({ id: String(users.length + 1), name })
          yield* Ref.update(ref, (users) => [...users, newUser])
          console.log('[USER-REPOSITORY] 🔧 New user created:', newUser)
          return newUser
        })
    }
  })
}) {}

class ProjectRepository extends Effect.Service<ProjectRepository>()('ProjectRepository', {
  effect: Effect.gen(function* () {
    const projects = yield* Ref.make<Array<Project>>([])

    return {
      find: (id: string) =>
        Ref.get(projects).pipe(
          Effect.map((ps) => Option.fromNullable(ps.find((p) => p.id === id)))
        ),
      add: (projectPath: string) =>
        Effect.gen(function* () {
          const name = path.basename(projectPath)
          const id = projectPath // using path as id
          const newProject = new Project({ id, name, path: projectPath })
          yield* Ref.update(projects, (ps) => [...ps, newProject])
          return newProject
        })
    }
  })
}) {}

class TaskRepository extends Effect.Service<TaskRepository>()('TaskRepository', {
  effect: Effect.gen(function* () {
    const tasks = yield* Ref.make<Array<Task>>([])

    return {
      find: (id: string) =>
        Ref.get(tasks).pipe(Effect.map((ts) => Option.fromNullable(ts.find((t) => t.id === id)))),
      create: (title: string, projectId?: string) =>
        Effect.gen(function* () {
          const newTask = new Task({
            id: crypto.randomUUID(),
            title,
            projectId,
            status: 'working'
          })
          yield* Ref.update(tasks, (ts) => [...ts, newTask])
          return newTask
        }),
      updateStatus: (id: string, status: string) =>
        Ref.get(tasks).pipe(
          Effect.flatMap((currentTasks) => {
            const task = currentTasks.find((t) => t.id === id)
            if (!task) {
              return Effect.fail(`Task with id ${id} not found`)
            }
            const updatedTask = new Task({
              id: task.id,
              title: task.title,
              projectId: task.projectId,
              status
            })
            const updatedTasks = currentTasks.map((t) => (t.id === id ? updatedTask : t))
            return Ref.set(tasks, updatedTasks).pipe(Effect.as(updatedTask))
          })
        )
    }
  })
}) {}

// ---------------------------------------------
// Consolidated RPC handlers
// ---------------------------------------------

export const SlideLive = SlideRpcs.toLayer(
  Effect.gen(function* () {
    console.log('[SLIDE-LIVE] 🔧 Creating Slide live layer with enhanced logging')
    const userRepo = yield* UserRepository
    const projectRepo = yield* ProjectRepository
    const taskRepo = yield* TaskRepository

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
      UserList: () => {
        console.log('[RPC-HANDLER] 🔧 UserList called - returning user stream')
        const userStream = Stream.fromIterableEffect(userRepo.findMany)
        return userStream.pipe(
          Stream.tap((user) =>
            Effect.sync(() => {
              console.log('[RPC-HANDLER] 🔧 UserList streaming user:', user)
            })
          )
        )
      },
      UserById: ({ id }) => {
        console.log('[RPC-HANDLER] 🔧 UserById called with id:', id)
        return userRepo.findById(id).pipe(
          Effect.tap((user) =>
            Effect.sync(() => {
              console.log('[RPC-HANDLER] 🔧 UserById returning user:', user)
            })
          ),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              console.log('[RPC-HANDLER] ❌ UserById error:', error)
              return yield* Effect.fail(error)
            })
          )
        )
      },
      UserCreate: ({ name }) => {
        console.log('[RPC-HANDLER] 🔧 UserCreate called with name:', name)
        return userRepo.create(name).pipe(
          Effect.tap((user) =>
            Effect.sync(() => {
              console.log('[RPC-HANDLER] 🔧 UserCreate returning new user:', user)
            })
          )
        )
      },

      // Chat streaming handler
      StreamChatMessages: ({ interval = 1000 }) => {
        console.log('[RPC-HANDLER] 🔧 StreamChatMessages called with interval:', interval)
        let counter = 0

        // Create a stream that emits a new message every specified interval (default: 1 second)
        return Stream.repeatEffect(
          Effect.sync(() => {
            counter++
            const message = new ChatMessage({
              id: `msg-${counter}`,
              text: `Message #${counter} at ${new Date().toLocaleTimeString()}`,
              timestamp: Date.now()
            })
            console.log('[RPC-HANDLER] 🔧 StreamChatMessages emitting message:', message)
            return message
          })
        ).pipe(Stream.schedule(Schedule.spaced(interval)))
      },

      // New handlers
      GetFileDiff: ({ path }) =>
        Effect.succeed(`--- a/${path}\\n+++ b/${path}\\n... diff for ${path}`),
      GetFileContent: ({ path }) =>
        Effect.tryPromise({
          try: () => fs.readFile(path, 'utf-8'),
          catch: (e) => (e as Error).message
        }),
      FileState: ({ path }) => Effect.succeed('modified'),
      ProjectFiles: ({ projectId }) =>
        projectRepo.find(projectId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(`Project with id ${projectId} not found`),
              onSome: (project) => Effect.succeed(readFilesRecursive(project.path))
            })
          ),
          Stream.unwrap,
          Stream.mapError((e) => (e instanceof Error ? e.message : String(e)))
        ),
      CreateTask: ({ initialPrompt, projectId }) => taskRepo.create(initialPrompt, projectId),
      WorkOnTask: ({ taskId }) => taskRepo.updateStatus(taskId, 'working'),
      ArchiveTask: ({ taskId }) => taskRepo.updateStatus(taskId, 'archived'),
      AddProject: ({ path }) => projectRepo.add(path)
    }
  })
).pipe(
  // Provide the repository layers
  Layer.provide(UserRepository.Default),
  Layer.provide(ProjectRepository.Default),
  Layer.provide(TaskRepository.Default)
)
