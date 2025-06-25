// import { Effect, Layer, Scope, Cause, Stream, Chunk } from 'effect'
// import { Protocol } from '@effect/rpc/RpcClient'
// import * as RpcSerialization from '@effect/rpc/RpcSerialization'
// import type { FromClientEncoded, FromServerEncoded } from '@effect/rpc/RpcMessage'
// import { ipcMain, ipcRenderer, BrowserWindow } from 'electron'
// import { constVoid } from 'effect/Function'

// // Create a promise that never resolves
// const neverPromise = new Promise<never>(() => {})

// // IPC channels for RPC communication
// const RPC_CHANNELS = {
//   REQUEST: 'rpc:request',
//   RESPONSE: 'rpc:response',
//   STREAM_CHUNK: 'rpc:stream:chunk',
//   STREAM_END: 'rpc:stream:end',
//   ERROR: 'rpc:error'
// }

// /**
//  * Creates a Protocol implementation for the main process
//  * This handles receiving requests from renderer processes and sending responses back
//  */
// export const makeProtocolElectronMain = (
//   mainWindow: BrowserWindow
// ): Effect.Effect<Protocol['Type'], never, Scope.Scope | RpcSerialization.RpcSerialization> =>
//   Protocol.make((write) => {
//     return Effect.gen(function* () {
//       const serialization = yield* RpcSerialization.RpcSerialization
//       const scope = yield* Effect.scope

//       let parser = serialization.unsafeMake()

//       // Track active subscriptions
//       const subscriptions = new Map<string, Effect.Effect<void>>()

//       // Set up handler for incoming requests from renderer
//       const requestHandler = (
//         event: Electron.IpcMainEvent,
//         { id, request }: { id: string; request: any }
//       ) => {
//         try {
//           const decoded = parser.decode(request)

//           // Make sure we have a valid request
//           if (!Array.isArray(decoded) || decoded.length === 0 || decoded[0]._tag !== 'Request') {
//             return
//           }

//           const clientRequest = decoded[0] as FromClientEncoded

//           // Pass the request to the RPC system
//           Effect.runFork(write(clientRequest as unknown as FromServerEncoded))
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       }

//       // Handle interruption requests
//       const interruptHandler = (
//         _event: Electron.IpcMainEvent,
//         { requestId }: { requestId: string }
//       ) => {
//         const subscription = subscriptions.get(requestId)
//         if (subscription) {
//           Effect.runFork(subscription)
//           subscriptions.delete(requestId)
//         }
//       }

//       // Register IPC handlers
//       ipcMain.on(RPC_CHANNELS.REQUEST, requestHandler)
//       ipcMain.on('rpc:interrupt', interruptHandler)

//       // Cleanup when scope closes
//       yield* Effect.addFinalizer(() =>
//         Effect.sync(() => {
//           ipcMain.removeListener(RPC_CHANNELS.REQUEST, requestHandler)
//           ipcMain.removeListener('rpc:interrupt', interruptHandler)

//           // Clean up any active subscriptions
//           subscriptions.forEach((interrupt) => {
//             Effect.runFork(interrupt)
//           })
//           subscriptions.clear()
//         })
//       )

//       // Implement run method for processing server responses
//       const run = (
//         responseHandler: (data: FromServerEncoded) => Effect.Effect<void, never, never>
//       ) => {
//         return Effect.tryPromise({
//           try: () => neverPromise,
//           catch: () => 'Never should resolve' as never
//         })
//       }

//       // Function to send requests to renderer
//       const send = (
//         request: FromClientEncoded,
//         transferables?: readonly Transferable[]
//       ): Effect.Effect<void> => {
//         if (!serialization.supportsBigInt) transformBigInt(request)

//         return Effect.sync(() => {
//           const encoded = parser.encode(request)

//           if (request._tag === 'Request') {
//             mainWindow.webContents.send(RPC_CHANNELS.REQUEST, {
//               id: request.id,
//               request: encoded
//             })
//           } else if (request._tag === 'Interrupt') {
//             mainWindow.webContents.send('rpc:interrupt', {
//               requestId: request.requestId
//             })
//           } else if (request._tag === 'Ack') {
//             mainWindow.webContents.send('rpc:ack', {
//               requestId: request.requestId
//             })
//           }
//         })
//       }

//       // Function to handle server responses
//       const handleResponse = (message: FromServerEncoded): Effect.Effect<void> => {
//         if (!serialization.supportsBigInt && 'requestId' in message) {
//           transformBigInt(message)
//         }

//         return Effect.sync(() => {
//           const encoded = parser.encode(message)

//           if (message._tag === 'Exit') {
//             // Signal the end of a stream
//             mainWindow.webContents.send(RPC_CHANNELS.STREAM_END, {
//               requestId: message.requestId,
//               response: encoded
//             })
//           } else if (message._tag === 'Chunk') {
//             // Send a chunk of stream data
//             mainWindow.webContents.send(RPC_CHANNELS.STREAM_CHUNK, {
//               requestId: message.requestId,
//               response: encoded
//             })
//           } else if (message._tag === 'Defect') {
//             // Send an error response
//             mainWindow.webContents.send(RPC_CHANNELS.ERROR, {
//               response: encoded
//             })
//           } else {
//             // Send a regular response
//             mainWindow.webContents.send(RPC_CHANNELS.RESPONSE, {
//               response: encoded
//             })
//           }
//         })
//       }

//       return {
//         run,
//         send,
//         supportsAck: true,
//         supportsTransferables: false
//       }
//     })
//   })

// /**
//  * Creates a Protocol implementation for the renderer process
//  * This handles sending requests to the main process and receiving responses
//  */
// export const makeProtocolElectronRenderer = (): Effect.Effect<
//   Protocol['Type'],
//   never,
//   Scope.Scope | RpcSerialization.RpcSerialization
// > =>
//   Protocol.make((write) => {
//     return Effect.gen(function* () {
//       const serialization = yield* RpcSerialization.RpcSerialization
//       const scope = yield* Effect.scope

//       let parser = serialization.unsafeMake()

//       // Set up handlers for different types of responses
//       const responseHandler = (
//         _event: Electron.IpcRendererEvent,
//         { response }: { response: any }
//       ) => {
//         try {
//           const responseData = parser.decode(response)

//           if (!Array.isArray(responseData) || responseData.length === 0) {
//             return
//           }

//           // Process all responses in the array
//           let i = 0
//           Effect.runFork(
//             Effect.whileLoop({
//               while: () => i < responseData.length,
//               body: () => write(responseData[i++] as FromServerEncoded),
//               step: constVoid
//             })
//           )
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       }

//       // Handler for stream chunks
//       const streamChunkHandler = (
//         _event: Electron.IpcRendererEvent,
//         { requestId, response }: { requestId: string; response: any }
//       ) => {
//         try {
//           const responseData = parser.decode(response)

//           if (!Array.isArray(responseData) || responseData.length === 0) {
//             return
//           }

//           // Process all chunks
//           let i = 0
//           Effect.runFork(
//             Effect.whileLoop({
//               while: () => i < responseData.length,
//               body: () =>
//                 write({
//                   _tag: 'Chunk',
//                   requestId,
//                   values: [responseData[i++]]
//                 } as FromServerEncoded),
//               step: constVoid
//             })
//           )
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       }

//       // Handler for stream end
//       const streamEndHandler = (
//         _event: Electron.IpcRendererEvent,
//         { requestId, response }: { requestId: string; response: any }
//       ) => {
//         try {
//           const responseData = parser.decode(response)

//           if (!Array.isArray(responseData) || responseData.length === 0) {
//             return
//           }

//           // Signal stream completion
//           Effect.runFork(
//             write({
//               _tag: 'Exit',
//               requestId,
//               exit: { _tag: 'Success', value: undefined }
//             } as FromServerEncoded)
//           )
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       }

//       // Handler for errors
//       const errorHandler = (_event: Electron.IpcRendererEvent, { response }: { response: any }) => {
//         try {
//           const responseData = parser.decode(response)

//           if (!Array.isArray(responseData) || responseData.length === 0) {
//             return
//           }

//           // Process all errors
//           let i = 0
//           Effect.runFork(
//             Effect.whileLoop({
//               while: () => i < responseData.length,
//               body: () => write(responseData[i++] as FromServerEncoded),
//               step: constVoid
//             })
//           )
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       }

//       // Register IPC handlers
//       ipcRenderer.on(RPC_CHANNELS.RESPONSE, responseHandler)
//       ipcRenderer.on(RPC_CHANNELS.STREAM_CHUNK, streamChunkHandler)
//       ipcRenderer.on(RPC_CHANNELS.STREAM_END, streamEndHandler)
//       ipcRenderer.on(RPC_CHANNELS.ERROR, errorHandler)

//       // Cleanup when scope closes
//       yield* Effect.addFinalizer(() =>
//         Effect.sync(() => {
//           ipcRenderer.removeListener(RPC_CHANNELS.RESPONSE, responseHandler)
//           ipcRenderer.removeListener(RPC_CHANNELS.STREAM_CHUNK, streamChunkHandler)
//           ipcRenderer.removeListener(RPC_CHANNELS.STREAM_END, streamEndHandler)
//           ipcRenderer.removeListener(RPC_CHANNELS.ERROR, errorHandler)
//         })
//       )

//       // Implement run method to process server responses
//       const run = (
//         responseHandler: (data: FromServerEncoded) => Effect.Effect<void, never, never>
//       ) => {
//         return Effect.tryPromise({
//           try: () => neverPromise,
//           catch: () => 'Never should resolve' as never
//         })
//       }

//       // Function to send requests to main process
//       const send = (
//         message: FromClientEncoded,
//         transferables?: readonly Transferable[]
//       ): Effect.Effect<void> => {
//         if (!serialization.supportsBigInt) transformBigInt(message)

//         return Effect.sync(() => {
//           const encoded = parser.encode(message)

//           if (message._tag === 'Request') {
//             ipcRenderer.send(RPC_CHANNELS.REQUEST, {
//               id: message.id,
//               request: encoded
//             })
//           } else if (message._tag === 'Interrupt') {
//             ipcRenderer.send('rpc:interrupt', {
//               requestId: message.requestId
//             })
//           } else if (message._tag === 'Ack') {
//             ipcRenderer.send('rpc:ack', {
//               requestId: message.requestId
//             })
//           }
//         })
//       }

//       return {
//         run,
//         send,
//         supportsAck: true,
//         supportsTransferables: false
//       }
//     })
//   })

// /**
//  * Layer for the main process protocol
//  */
// export const layerProtocolElectronMain = (
//   mainWindow: BrowserWindow
// ): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization> =>
//   Layer.scoped(Protocol, makeProtocolElectronMain(mainWindow))

// /**
//  * Layer for the renderer process protocol
//  */
// export const layerProtocolElectronRenderer: Layer.Layer<
//   Protocol,
//   never,
//   RpcSerialization.RpcSerialization
// > = Layer.scoped(Protocol, makeProtocolElectronRenderer())

// // Helper for transforming BigInt values in requests
// const transformBigInt = (request: FromClientEncoded | FromServerEncoded) => {
//   if (request._tag === 'Request') {
//     ;(request as any).id = request.id.toString()
//   } else if ('requestId' in request) {
//     ;(request as any).requestId = request.requestId.toString()
//   }
// }
