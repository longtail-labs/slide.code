// import { Effect, Layer, Stream } from 'effect'
// import { PubSubClient } from '../services/pubsub.service.js'
// import { Message } from '../messages.js'
// import type { MessageType } from '../messages.js'
// import { logger } from '@polka/shared/logger/main'

// /**
//  * Base class for creating message subscribers using Effect streams
//  */
// export abstract class StreamSubscriber<T extends MessageType> {
//   protected abstract readonly messageType: T
//   protected abstract readonly moduleName: string

//   /**
//    * Handler for processing messages of the specified type
//    */
//   protected abstract handleMessage(message: Message): Effect.Effect<unknown>

//   /**
//    * Create a Layer that sets up the subscriber
//    */
//   public makeLayer() {
//     const messageName = this.messageType
//     const moduleName = this.moduleName

//     const subscriberLogger = logger.createScoped(moduleName)

//     const make = Effect.gen(
//       function* (this: StreamSubscriber<T>) {
//         yield* Effect.logInfo(`[StreamSubscriber] Starting ${moduleName}`)

//         const pubsub = yield* PubSubClient

//         // Create a stream for the specified message type
//         const messageStream = pubsub.createStreamFor(messageName)

//         // Process each message in the stream
//         yield* Effect.forkScoped(
//           messageStream.pipe(
//             Stream.tap((message) =>
//               Effect.sync(() =>
//                 subscriberLogger.info(
//                   `[StreamSubscriber] Processing ${messageName} message:`,
//                   message
//                 )
//               )
//             ),
//             Stream.mapEffect((message) =>
//               Effect.catchAll(
//                 Effect.gen(
//                   function* (this: StreamSubscriber<T>) {
//                     yield* Effect.logInfo(`[StreamSubscriber] Received a ${messageName} message`)
//                     return yield* Effect.suspend(() => this.handleMessage(message))
//                   }.bind(this)
//                 ),
//                 (error: unknown) => {
//                   const errorMessage = error instanceof Error ? error.message : String(error)
//                   subscriberLogger.error(
//                     `[StreamSubscriber] Error processing ${messageName} message:`,
//                     errorMessage
//                   )
//                   return Effect.void
//                 }
//               )
//             ),
//             Stream.runDrain
//           )
//         )

//         yield* Effect.acquireRelease(
//           Effect.logInfo(`[StreamSubscriber] ${moduleName} started`),
//           () => Effect.logInfo(`[StreamSubscriber] ${moduleName} stopped`)
//         )
//       }.bind(this)
//     ).pipe(Effect.annotateLogs({ module: moduleName }))

//     // return Layer.scopedDiscard(make).pipe(Layer.provide(PubSubClient.Default))
//     return Layer.scopedDiscard(make)
//   }
// }
