// import { Effect, pipe } from 'effect'
// import { DefaultLoggerLayer } from '../logger.js'
// import { encoreClient, createAuthedEncoreClient } from '../clients/index.js'
// import { getUserId, UserRef, UserRefLive } from '../refs/user.ref.js'

// /**
//  * Errors that can be thrown by the API service
//  */
// export class APIServiceError extends Error {
//   readonly _tag = 'APIServiceError'

//   constructor(message: string) {
//     super(message)
//     this.name = 'APIServiceError'
//   }
// }

// /**
//  * APIService for handling API requests with user identity
//  */
// export class APIService extends Effect.Service<APIService>()('APIService', {
//   dependencies: [DefaultLoggerLayer, UserRefLive],
//   scoped: Effect.gen(function* () {
//     yield* Effect.logInfo('🌐 APIService started')

//     /**
//      * Get authenticated API client using userId from local storage
//      */
//     const getAuthClient = Effect.gen(function* () {
//       // Get userId from storage directly
//       const userId = yield* getUserId

//       if (userId) {
//         console.log('Creating authenticated API client with userId:', userId)
//         return createAuthedEncoreClient(`userId:${userId}`)
//       } else {
//         console.log('No userId available, using unauthenticated client')
//         return encoreClient
//       }
//     })

//     /**
//      * Execute a request with the authenticated client
//      */
//     const executeRequest = <T>(
//       request: (client: typeof encoreClient) => Promise<T>
//     ): Effect.Effect<T, Error, UserRef> => // <-- fix is here
//       pipe(
//         getAuthClient,
//         Effect.flatMap((client) =>
//           Effect.tryPromise({
//             try: () => request(client),
//             catch: (error) => (error instanceof Error ? error : new APIServiceError(String(error)))
//           })
//         )
//       )

//     // API methods
//     const getEmojiForTask = (taskName: string) =>
//       executeRequest((client) => client.ai.emojiForTask({ taskName })).pipe(
//         // Add fallback for this specific method
//         Effect.catchAll((error) =>
//           Effect.flatMap(Effect.logWarning(`Failed to get emoji for task: ${error}`), () =>
//             Effect.succeed({ emoji: '📝' })
//           )
//         )
//       )

//     // Register a finalizer for cleanup
//     yield* Effect.addFinalizer(() => Effect.logInfo('🌐 Cleaning up APIService resources'))

//     // Return the service API
//     return {
//       executeRequest,
//       getEmojiForTask
//     }
//   })
// }) {}
