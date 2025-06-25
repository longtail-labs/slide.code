// import { Effect, Stream, Layer } from 'effect'
// import { Protocol } from '@effect/rpc/RpcClient'
// import * as RpcSerialization from '@effect/rpc/RpcSerialization'
// import type { FromClientEncoded, FromServerEncoded } from '@effect/rpc/RpcMessage'
// import { AppInfo, User } from './requests.js'

// // Create a promise that never resolves
// const neverPromise = new Promise<never>(() => {})

// /**
//  * Simple bridge interface that mirrors the window.electronRpc global
//  */
// interface ElectronRpcBridge {
//   send: (data: unknown) => void
//   onMessage: (callback: (data: unknown) => void) => () => void
//   interrupt: (requestId: string) => void
// }

// /**
//  * Creates a Protocol implementation for the renderer process
//  * using the exposed electronRpc bridge from the preload script
//  */
// export const createProtocolBridge = (bridge: ElectronRpcBridge): Protocol['Type'] => {
//   return {
//     run: (responseHandler) => {
//       // Set up message handler
//       bridge.onMessage((data) => {
//         Effect.runSync(responseHandler(data as FromServerEncoded))
//       })

//       // Return an effect that never completes
//       return Effect.tryPromise({
//         try: () => neverPromise,
//         catch: () => 'Never should resolve' as never
//       })
//     },

//     send: (request) => {
//       return Effect.sync(() => {
//         bridge.send(request)
//       })
//     },

//     supportsAck: true,
//     supportsTransferables: false
//   }
// }

// /**
//  * Layer for the electronRpc bridge protocol
//  */
// export const layerProtocolElectronBridge = Layer.sync(Protocol, () => {
//   if (typeof window === 'undefined' || !window.electronRpc) {
//     throw new Error('electronRpc bridge not available')
//   }

//   return createProtocolBridge(window.electronRpc)
// })

// /**
//  * Simple client API for common operations
//  */
// export class SystemClient {
//   /**
//    * Set the window title
//    */
//   static setWindowTitle = (title: string): Effect.Effect<void, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         console.log(`Setting window title to: ${title}`)
//       },
//       catch: (error) => `Failed to set window title: ${String(error)}`
//     })

//   /**
//    * Show the update dialog
//    */
//   static showUpdateDialog = (checkForUpdates: boolean = true): Effect.Effect<boolean, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         console.log(`Showing update dialog (checkForUpdates: ${checkForUpdates})`)
//         return true
//       },
//       catch: (error) => `Failed to show update dialog: ${String(error)}`
//     })

//   /**
//    * Get app info
//    */
//   static getAppInfo = (includeVersion: boolean = true): Effect.Effect<AppInfo, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         return {
//           version: includeVersion ? '1.0.0' : '',
//           appName: 'Polka',
//           platform: 'darwin',
//           arch: 'arm64'
//         }
//       },
//       catch: (error) => `Failed to get app info: ${String(error)}`
//     })

//   /**
//    * Quit the application
//    */
//   static quit = (force: boolean = false): Effect.Effect<boolean, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         console.log(`Quitting app (force: ${force})`)
//         return true
//       },
//       catch: (error) => `Failed to quit app: ${String(error)}`
//     })
// }

// /**
//  * User client API for user operations
//  */
// export class UserClient {
//   /**
//    * Get all users as a stream
//    */
//   static getAllUsers = (): Stream.Stream<User, string> =>
//     Stream.fromEffect(
//       Effect.tryPromise({
//         try: async () => {
//           // Simulate RPC call for now
//           return [
//             { id: '1', name: 'Alice' },
//             { id: '2', name: 'Bob' },
//             { id: '3', name: 'Charlie' }
//           ]
//         },
//         catch: (error) => `Failed to get users: ${String(error)}`
//       })
//     ).pipe(Stream.flatMap(Stream.fromIterable))

//   /**
//    * Get a user by ID
//    */
//   static getUserById = (id: string): Effect.Effect<User, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         if (id === '1') return { id: '1', name: 'Alice' }
//         if (id === '2') return { id: '2', name: 'Bob' }
//         if (id === '3') return { id: '3', name: 'Charlie' }
//         throw new Error(`User not found: ${id}`)
//       },
//       catch: (error) => `Failed to get user: ${String(error)}`
//     })

//   /**
//    * Create a new user
//    */
//   static createUser = (name: string): Effect.Effect<User, string> =>
//     Effect.tryPromise({
//       try: async () => {
//         // Simulate RPC call for now
//         return { id: '4', name }
//       },
//       catch: (error) => `Failed to create user: ${String(error)}`
//     })
// }
