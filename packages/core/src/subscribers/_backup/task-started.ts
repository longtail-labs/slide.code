// import { Effect, Layer } from 'effect'
// import { PubSubClient } from '../pubsub.service.js'
// import { Message } from '../messages.js'
// import type { MessageType } from '../messages.js'
// import { logger } from '@polka/shared/logger/main'

// const taskStartedLogger = logger.createScoped('TaskStartedSubscriber')

// /**
//  * Set up a subscriber for TaskStarted messages
//  */
// const make = Effect.gen(function* () {
//   yield* Effect.logInfo('Starting TaskStartedSubscriber')

//   const pubsub = yield* PubSubClient

//   // Type-safe way to reference the message type
//   const messageType: MessageType = 'TaskStarted'

//   // Subscribe to TaskStarted messages and set up a handler
//   yield* pubsub.listenTo(messageType, (message) =>
//     Effect.sync(() => {
//       taskStartedLogger.info('Task started event processed:', {
//         taskId: message.taskId,
//         timestamp: message.timestamp
//       })
//       // Implement task started handling logic here
//     })
//   )

//   yield* Effect.acquireRelease(Effect.logInfo('TaskStartedSubscriber started'), () =>
//     Effect.logInfo('TaskStartedSubscriber stopped')
//   )
// }).pipe(Effect.annotateLogs({ module: 'task-started-subscriber' }))

// /**
//  * Layer that provides the TaskStartedSubscriber
//  */
// export const TaskStartedSubscriber = {
//   // Create a Layer that requires PubSubClient
//   Live: Layer.scopedDiscard(make)
// }
