// import { Effect, Layer, Scope, Cause, Option } from 'effect'
// import { Protocol } from '@effect/rpc/RpcClient'
// import * as RpcSerialization from '@effect/rpc/RpcSerialization'
// import type { FromClientEncoded, FromServerEncoded } from '@effect/rpc/RpcMessage'
// import { ipcMain, BrowserWindow } from 'electron'
// import type { WebContents } from 'electron'
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

// // Global registry of active windows
// const activeWindows = new Set<BrowserWindow>()
// const webContentsIdToWindow = new Map<number, BrowserWindow>()

// /**
//  * Register a window with the RPC system
//  */
// export const registerWindow = (window: BrowserWindow): void => {
//   // Skip if already registered
//   if (activeWindows.has(window)) return

//   // Add to active windows set
//   activeWindows.add(window)
//   webContentsIdToWindow.set(window.webContents.id, window)

//   // Setup cleanup when window is closed
//   window.on('closed', () => {
//     activeWindows.delete(window)
//     webContentsIdToWindow.delete(window.webContents.id)
//   })

//   console.log(`[RPC] Registered window with id ${window.webContents.id}`)
// }

// /**
//  * Unregister a window from the RPC system
//  */
// export const unregisterWindow = (window: BrowserWindow): void => {
//   activeWindows.delete(window)
//   webContentsIdToWindow.delete(window.webContents.id)
//   console.log(`[RPC] Unregistered window with id ${window.webContents.id}`)
// }

// /**
//  * Creates a Protocol implementation for the main process
//  * This handles receiving requests from multiple renderer processes and sending responses back
//  */
// export const makeProtocolElectronMain = (): Effect.Effect<
//   Protocol['Type'],
//   never,
//   Scope.Scope | RpcSerialization.RpcSerialization
// > =>
//   Protocol.make((write) => {
//     return Effect.gen(function* () {
//       console.log('[IPCEFFECT] Making protocol for main process')
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
//         console.log('[RPC-MAIN] Received request:', { id, request })
//         try {
//           console.log(`[RPC-MAIN] Received request from webContents id ${event.sender.id}:`, {
//             id,
//             request
//           })

//           // The request should already be encoded from the renderer
//           // We need to ensure request is properly decoded
//           let clientRequest

//           try {
//             // First try to decode if request is already encoded
//             const decoded = parser.decode(request)

//             // Make sure we have a valid request format (array with Request object)
//             if (Array.isArray(decoded) && decoded.length > 0 && decoded[0]._tag === 'Request') {
//               clientRequest = decoded[0] as FromClientEncoded
//             } else {
//               // If decode failed, check if request is already a valid object
//               if (typeof request === 'object' && request._tag === 'Request') {
//                 clientRequest = request as FromClientEncoded
//               } else {
//                 console.error('[RPC-MAIN] Invalid request format:', request)
//                 return
//               }
//             }
//           } catch (decodeError) {
//             console.error('[RPC-MAIN] Error decoding request:', decodeError)

//             // As a fallback, check if request is already a request object
//             if (typeof request === 'object' && request._tag === 'Request') {
//               clientRequest = request as FromClientEncoded
//             } else {
//               console.error('[RPC-MAIN] Cannot process request, invalid format')
//               return
//             }
//           }

//           console.log(
//             `[RPC-MAIN] Processing request:`,
//             clientRequest._tag,
//             'id' in clientRequest ? clientRequest.id : 'no-id'
//           )

//           // Store the sender for later use
//           const senderWebContents = event.sender

//           // Extract request ID in a type-safe way
//           let requestId = id // Default to using the id from the event
//           if (clientRequest._tag === 'Request' && 'id' in clientRequest) {
//             requestId = String(clientRequest.id)
//           }

//           // Make sure the request has the _tag property set to Request
//           if (clientRequest._tag === 'Request') {
//             // Store request info for later
//             const sender = event.sender
//             const reqId = requestId

//             // Pass the request directly to the real RPC system
//             console.log('[RPC-MAIN] Passing request to RPC system for processing')

//             // We directly call the provided write function with the request
//             // This passes it to the RPC system which will then call the handlers
//             Effect.runPromise(write(clientRequest as unknown as FromServerEncoded))
//               .then(() => {
//                 console.log('[RPC-MAIN] Request forwarded to RPC system successfully')
//               })
//               .catch((error) => {
//                 console.error('[RPC-MAIN] Error forwarding request to RPC system:', error)

//                 // Send error back to renderer
//                 if (sender && !sender.isDestroyed()) {
//                   try {
//                     sender.send(RPC_CHANNELS.ERROR, {
//                       response: {
//                         _tag: 'Error',
//                         requestId: reqId,
//                         error: String(error)
//                       }
//                     })
//                   } catch (err) {
//                     console.error('[RPC-MAIN] Error sending error response:', err)
//                   }
//                 }
//               })
//           } else {
//             console.error('[RPC-MAIN] Not a Request type:', clientRequest._tag)
//           }
//         } catch (defect) {
//           console.error('[RPC-MAIN] Error handling request:', defect)
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

//       const wtfHandler = (e: any) => {
//         console.log('[RPC-MAIN] WTF:', e)
//       }

//       // Register IPC handlers
//       ipcMain.on(RPC_CHANNELS.REQUEST, requestHandler)
//       // ipcMain.on(RPC_CHANNELS.REQUEST, wtfHandler)
//       ipcMain.on('rpc:interrupt', interruptHandler)

//       // Cleanup when scope closes
//       // yield* Effect.addFinalizer(() =>
//       //   Effect.sync(() => {
//       //     ipcMain.removeListener(RPC_CHANNELS.REQUEST, requestHandler)
//       //     ipcMain.removeListener('rpc:interrupt', interruptHandler)

//       //     // Clean up any active subscriptions
//       //     subscriptions.forEach((interrupt) => {
//       //       Effect.runFork(interrupt)
//       //     })
//       //     subscriptions.clear()
//       //   })
//       // )

//       // Implement run method for processing server responses
//       const run = (
//         responseHandler: (data: FromServerEncoded) => Effect.Effect<void, never, never>
//       ) => {
//         console.log('[RPC-MAIN] Setting up run handler for processing responses')

//         // Since we're in the main process, we don't need to register any event listeners
//         // We'll just return a never-resolving promise and handle responses in the handler directly

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

//           // Get a valid window
//           const windows = Array.from(activeWindows)
//           if (windows.length === 0) {
//             console.warn('[RPC] No windows registered for sending messages')
//             return
//           }

//           // Try to get the focused window, or use the first one
//           const focusedWindow = BrowserWindow.getFocusedWindow()
//           const targetWindow =
//             focusedWindow && !focusedWindow.isDestroyed() ? focusedWindow : windows[0]

//           if (!targetWindow || targetWindow.isDestroyed()) {
//             console.warn('[RPC] No valid window found to send message')
//             return
//           }

//           console.log(`[RPC] Sending message to window id ${targetWindow.id}`)

//           if (request._tag === 'Request') {
//             targetWindow.webContents.send(RPC_CHANNELS.REQUEST, {
//               id: request.id,
//               request: encoded
//             })
//           } else if (request._tag === 'Interrupt') {
//             targetWindow.webContents.send('rpc:interrupt', {
//               requestId: request.requestId
//             })
//           } else if (request._tag === 'Ack') {
//             targetWindow.webContents.send('rpc:ack', {
//               requestId: request.requestId
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
// export const layerProtocolElectronMain: Layer.Layer<
//   Protocol,
//   never,
//   RpcSerialization.RpcSerialization
// > = Layer.scoped(Protocol, makeProtocolElectronMain()).pipe(
//   Layer.provide(RpcSerialization.layerNdjson)
// )

// // Helper for transforming BigInt values in requests
// const transformBigInt = (request: FromClientEncoded | FromServerEncoded) => {
//   if (request._tag === 'Request') {
//     ;(request as any).id = request.id.toString()
//   } else if ('requestId' in request) {
//     ;(request as any).requestId = request.requestId.toString()
//   }
// }
