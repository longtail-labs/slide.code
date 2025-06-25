// import { Effect, Layer, Match } from 'effect'
// import { PubSubClient } from '../../services/pubsub.service.js'
// import { Message, $is } from '../../messages.js'
// import type { TaskStartedMessage } from '../../messages.js'
// import { logger } from '@polka/shared/logger/main'

// const enhancedTaskStartedLogger = logger.createScoped('EnhancedTaskStartedSubscriber')

// /**
//  * Set up a strongly typed subscriber for TaskStarted messages using the enhanced messages
//  */
// const make = Effect.gen(function* () {
//   yield* Effect.logInfo('Starting EnhancedTaskStartedSubscriber')

//   const pubsub = yield* PubSubClient

//   // Get a subscription to all messages
//   const subscription = yield* pubsub.subscribe()

//   // Create a type guard for TaskStarted messages
//   const isTaskStarted = $is('TaskStarted')

//   // Fork a fiber to process messages with pattern matching
//   yield* Effect.forkScoped(
//     Effect.forever(
//       Effect.gen(function* () {
//         const message = yield* subscription.take

//         // Using type guard approach
//         if (isTaskStarted(message)) {
//           // message is now typed as EnhancedTaskStartedMessage
//           enhancedTaskStartedLogger.info('Task started event processed:', {
//             taskId: message.taskId,
//             timestamp: message.timestamp
//           })
//         }

//         // Alternative using Match for pattern matching
//         yield* Match.value(message).pipe(
//           // Match only TaskStarted messages
//           Match.when({ _tag: 'TaskStarted' }, (taskStarted: TaskStartedMessage) =>
//             Effect.sync(() => {
//               enhancedTaskStartedLogger.info(
//                 'Task started event processed with pattern matching:',
//                 {
//                   taskId: taskStarted.taskId,
//                   timestamp: taskStarted.timestamp
//                 }
//               )
//             })
//           ),
//           // Default case for other message types
//           Match.orElse(() => Effect.void)
//         )
//       })
//     ).pipe(Effect.catchAll(() => Effect.void))
//   )

//   yield* Effect.acquireRelease(Effect.logInfo('EnhancedTaskStartedSubscriber started'), () =>
//     Effect.logInfo('EnhancedTaskStartedSubscriber stopped')
//   )
// }).pipe(Effect.annotateLogs({ module: 'enhanced-task-started-subscriber' }))

// /**
//  * Layer that provides the EnhancedTaskStartedSubscriber
//  */
// export const EnhancedTaskStartedSubscriber = {
//   Live: Layer.scopedDiscard(make).pipe(Layer.provide(PubSubClient.Default))
// }
