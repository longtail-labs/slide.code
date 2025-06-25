// import { Effect, Layer, Scope, Cause } from 'effect'
// import { Protocol } from '@effect/rpc/RpcClient'
// import * as RpcSerialization from '@effect/rpc/RpcSerialization'
// import type { FromClientEncoded, FromServerEncoded } from '@effect/rpc/RpcMessage'
// import { constVoid } from 'effect/Function'

// // Custom error class for renderer protocol
// export class RendererProtocolError extends Error {
//   readonly _tag = 'RendererProtocolError'
// }

// /**
//  * Creates a Protocol implementation for the renderer process
//  * This handles sending requests to the main process and receiving responses
//  */
// export const makeProtocolElectronRenderer = (): Effect.Effect<
//   Protocol['Type'],
//   RendererProtocolError,
//   Scope.Scope | RpcSerialization.RpcSerialization
// > =>
//   Protocol.make((write) => {
//     // Check if the bridge is available
//     if (typeof window === 'undefined' || !window.electronRpc) {
//       return Effect.fail(
//         new RendererProtocolError(
//           'electronRpc bridge is not available. Make sure the preload script is properly configured.'
//         )
//       )
//     }

//     return Effect.gen(function* () {
//       const serialization = yield* RpcSerialization.RpcSerialization
//       const scope = yield* Effect.scope

//       let parser = serialization.unsafeMake()

//       // Set up message handler using the context bridge
//       const cleanup = window.electronRpc.onMessage((data: any) => {
//         console.log('[IPCEFFECT RENDERER] Received message:', data)
//         try {
//           // Handle different message types
//           if (typeof data === 'object' && data !== null) {
//             // Regular response
//             if (!data._tag) {
//               const responseData = parser.decode(data)
//               if (Array.isArray(responseData) && responseData.length > 0) {
//                 let i = 0
//                 Effect.runFork(
//                   Effect.whileLoop({
//                     while: () => i < responseData.length,
//                     body: () => write(responseData[i++] as FromServerEncoded),
//                     step: constVoid
//                   })
//                 )
//               }
//             }
//             // Chunk or Exit message
//             else if (data._tag === 'Chunk' || data._tag === 'Exit') {
//               const responseData = parser.decode(data.response)
//               if (Array.isArray(responseData) && responseData.length > 0) {
//                 if (data._tag === 'Exit') {
//                   Effect.runFork(
//                     write({
//                       _tag: 'Exit',
//                       requestId: data.requestId,
//                       exit: { _tag: 'Success', value: undefined }
//                     } as FromServerEncoded)
//                   )
//                 } else {
//                   let i = 0
//                   Effect.runFork(
//                     Effect.whileLoop({
//                       while: () => i < responseData.length,
//                       body: () =>
//                         write({
//                           _tag: 'Chunk',
//                           requestId: data.requestId,
//                           values: [responseData[i++]]
//                         } as FromServerEncoded),
//                       step: constVoid
//                     })
//                   )
//                 }
//               }
//             }
//           }
//         } catch (defect) {
//           Effect.runFork(write({ _tag: 'Defect', defect } as FromServerEncoded))
//         }
//       })

//       // Cleanup when scope closes
//       yield* Effect.addFinalizer(() =>
//         Effect.sync(() => {
//           cleanup()
//         })
//       )

//       // Implement run method to process server responses
//       const run = (
//         responseHandler: (data: FromServerEncoded) => Effect.Effect<void, never, never>
//       ) => {
//         console.log('[IPCEFFECT RENDERER] Running')
//         return Effect.tryPromise({
//           try: () => new Promise<never>(() => {}), // A promise that never resolves
//           catch: () => 'Never should resolve' as never
//         })
//       }

//       // Function to send requests to renderer
//       const send = (
//         request: FromClientEncoded,
//         transferables?: readonly Transferable[]
//       ): Effect.Effect<void> => {
//         if (!serialization.supportsBigInt) transformBigInt(request)

//         console.log(
//           `[RPC-RENDERER] Sending request:`,
//           request._tag,
//           'id' in request ? request.id : 'no-id'
//         )

//         return Effect.sync(() => {
//           const encoded = parser.encode(request)
//           console.log(`[RPC-RENDERER] Encoded request, sending to main process`)

//           if (typeof window === 'undefined' || !window.electronRpc) {
//             console.error('[RPC-RENDERER] electronRpc bridge is not available')
//             return
//           }

//           if (request._tag === 'Request') {
//             window.electronRpc.send(request)
//           } else if (request._tag === 'Interrupt') {
//             window.electronRpc.interrupt(request.requestId.toString())
//           }
//           // Ack messages are not supported in the current bridge
//         })
//       }

//       return {
//         run,
//         send,
//         supportsAck: false, // Set to false since the bridge doesn't support it
//         supportsTransferables: false
//       }
//     })
//   })

// /**
//  * Layer for the renderer process protocol
//  */
// export const layerProtocolElectronRenderer: Layer.Layer<
//   Protocol,
//   RendererProtocolError,
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
