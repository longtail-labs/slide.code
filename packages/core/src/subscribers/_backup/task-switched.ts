// import { Effect, Layer, Match } from 'effect'
// import { PubSubClient } from '../pubsub.service.js'
// import { Message } from '../messages.js'
// import type { TaskSwitchedMessage } from '../messages.js'
// import { logger } from '@polka/shared/logger/main'

// const taskSwitchedLogger = logger.createScoped('TaskSwitchedSubscriber')

// /**
//  * Set up a subscriber for TaskSwitched messages with advanced matching
//  */
// const make = Effect.gen(function* () {
//   yield* Effect.logInfo('Starting TaskSwitchedSubscriber')

//   const pubsub = yield* PubSubClient

//   // Get a subscription to all messages
//   const subscription = yield* pubsub.subscribe()

//   // Fork a fiber to process messages with pattern matching
//   yield* Effect.forkScoped(
//     Effect.forever(
//       Effect.gen(function* () {
//         const message = yield* subscription.take

//         // Using Match for more advanced pattern matching on message types
//         yield* Match.value(message).pipe(
//           // Match only TaskSwitched messages
//           Match.when({ _tag: 'TaskSwitched' }, (taskSwitched: TaskSwitchedMessage) =>
//             Effect.sync(() => {
//               taskSwitchedLogger.info('Task switched event processed:', {
//                 fromTaskId: taskSwitched.fromTaskId,
//                 toTaskId: taskSwitched.toTaskId,
//                 timestamp: taskSwitched.timestamp
//               })

//               // Demonstrate conditional handling based on task properties
//               if (taskSwitched.fromTaskId === taskSwitched.toTaskId) {
//                 taskSwitchedLogger.warn('Switched to the same task, this might be a mistake')
//               }
//             })
//           ),
//           // Default case for other message types
//           Match.orElse(() => Effect.void)
//         )
//       })
//     ).pipe(Effect.catchAll(() => Effect.void))
//   )

//   yield* Effect.acquireRelease(Effect.logInfo('TaskSwitchedSubscriber started'), () =>
//     Effect.logInfo('TaskSwitchedSubscriber stopped')
//   )
// }).pipe(Effect.annotateLogs({ module: 'task-switched-subscriber' }))

// /**
//  * Layer that provides the TaskSwitchedSubscriber
//  */
// export const TaskSwitchedSubscriber = {
//   Live: Layer.scopedDiscard(make)
// }
