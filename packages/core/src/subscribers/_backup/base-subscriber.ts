// import { Effect, Layer, Queue } from 'effect'
// import { PubSubClient } from '../services/pubsub.service.js'
// import { Message } from '../messages.js'
// import type { MessageType } from '../messages.js'

// /**
//  * Base class for creating message subscribers
//  */
// export abstract class BaseSubscriber<T extends MessageType> {
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

//     const make = Effect.gen(
//       function* (this: BaseSubscriber<T>) {
//         yield* Effect.logInfo(`Starting ${moduleName}`)

//         const pubsub = yield* PubSubClient

//         const subscriber = yield* pubsub.subscribeTo(messageName)

//         yield* Effect.forkScoped(
//           Effect.forever(
//             Effect.gen(
//               function* (this: BaseSubscriber<T>) {
//                 const message = yield* Queue.take(subscriber)

//                 yield* Effect.catchAll(
//                   Effect.gen(
//                     function* (this: BaseSubscriber<T>) {
//                       yield* Effect.logInfo(`Received a ${messageName} message`)
//                       return yield* Effect.suspend(() => this.handleMessage(message))
//                     }.bind(this)
//                   ),
//                   (error: unknown) => {
//                     const errorMessage = error instanceof Error ? error.message : String(error)
//                     return Effect.void
//                   }
//                 )
//               }.bind(this)
//             )
//           ).pipe(Effect.catchAll(() => Effect.void))
//         )

//         yield* Effect.acquireRelease(Effect.logInfo(`${moduleName} started`), () =>
//           Effect.logInfo(`${moduleName} stopped`)
//         )
//       }.bind(this)
//     ).pipe(Effect.annotateLogs({ module: moduleName }))

//     return Layer.scopedDiscard(make).pipe(Layer.provide(PubSubClient.Default))
//   }
// }
