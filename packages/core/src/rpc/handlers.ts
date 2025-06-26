// handlers.ts
import type { Rpc } from '@effect/rpc'
import { Effect, Layer, Ref, Stream, Schedule } from 'effect'
import { User, SlideRpcs, ChatMessage } from './requests.js'
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

// ---------------------------------------------
// Consolidated RPC handlers
// ---------------------------------------------

export const SlideLive = SlideRpcs.toLayer(
  Effect.gen(function* () {
    console.log('[SLIDE-LIVE] 🔧 Creating Slide live layer with enhanced logging')
    const userRepo = yield* UserRepository

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
      }
    }
  })
).pipe(
  // Provide the repository layers
  Layer.provide(UserRepository.Default)
)
