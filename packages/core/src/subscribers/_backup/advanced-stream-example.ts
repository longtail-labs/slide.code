// import { Effect, Stream, Schedule, Duration, Layer } from 'effect'
// import { PubSubClient } from '../../services/pubsub.service.js'
// import { Message } from '../../messages.js'
// import { $is } from '../../messages.js'
// import { logger } from '@polka/shared/logger/main'

// const advancedStreamLogger = logger.createScoped('AdvancedStreamExample')

// /**
//  * This example demonstrates various advanced stream processing patterns
//  * that can be used with our PubSub system
//  */
// export const createAdvancedStreamProcessor = () => {
//   const isTaskStarted = $is('TaskStarted')
//   const isTaskSwitched = $is('TaskSwitched')

//   return Effect.gen(function* () {
//     advancedStreamLogger.info('Setting up advanced stream processor')

//     const pubsub = yield* PubSubClient

//     // Get the base stream of all messages
//     const allMessagesStream = pubsub.createStream()

//     // PATTERN 1: Filtering for specific event types
//     const taskEventsStream = allMessagesStream.pipe(
//       Stream.filter((message) => isTaskStarted(message) || isTaskSwitched(message))
//     )

//     // PATTERN 2: Debouncing events (useful for UI updates)
//     const debouncedTaskEventsStream = taskEventsStream.pipe(Stream.debounce(Duration.millis(500)))

//     // PATTERN 3: Windowing - group messages into time windows
//     const windowedTaskEventsStream = taskEventsStream.pipe(
//       Stream.groupedWithin(10, Duration.seconds(2))
//     )

//     // PATTERN 4: Splitting streams for different handlers
//     const [taskStartedStream, taskSwitchedStream] = Stream.partition(taskEventsStream, (message) =>
//       isTaskStarted(message)
//     )

//     // PATTERN 5: Mapping events to another format
//     const taskSummaryStream = taskEventsStream.pipe(
//       Stream.map((message) => {
//         if (isTaskStarted(message)) {
//           return {
//             type: 'started',
//             taskId: message.taskId,
//             timestamp: message.timestamp
//           }
//         } else if (isTaskSwitched(message)) {
//           return {
//             type: 'switched',
//             fromTaskId: message.fromTaskId,
//             toTaskId: message.toTaskId,
//             timestamp: message.timestamp
//           }
//         } else {
//           return { type: 'unknown' }
//         }
//       })
//     )

//     // PATTERN 6: Rate limiting events
//     const rateLimitedStream = taskEventsStream.pipe(Stream.throttle(Duration.seconds(1)))

//     // PATTERN 7: Merging streams
//     const mergedStream = Stream.merge(taskStartedStream)(taskSwitchedStream)

//     // PATTERN 8: Error handling with retry
//     const processWithRetry = (message: Message) =>
//       Effect.tryPromise({
//         try: async () => {
//           // Simulate processing that might fail
//           if (Math.random() < 0.3) {
//             throw new Error('Random processing failure')
//           }
//           return `Processed: ${message._tag}`
//         },
//         catch: (error) => new Error(`Processing failed: ${String(error)}`)
//       }).pipe(
//         Effect.retry(
//           Schedule.exponential(Duration.millis(100)).pipe(Schedule.andThen(Schedule.recurs(3)))
//         )
//       )

//     // PATTERN 9: Batching events for bulk processing
//     const batchProcessingStream = taskEventsStream.pipe(
//       Stream.chunks,
//       Stream.mapEffect((chunk) =>
//         Effect.sync(() => {
//           advancedStreamLogger.info(`Processing batch of ${chunk.length} events`)
//           // Process the batch
//           return chunk.length
//         })
//       )
//     )

//     // PATTERN 10: Periodic sampling of the stream state
//     const periodicSamplingStream = Stream.tick(Duration.seconds(5)).pipe(
//       Stream.zip(Stream.fromEffect(Effect.sync(() => `Current time: ${new Date().toISOString()}`)))
//     )

//     // Fork all the stream processors with appropriate handlers
//     yield* Effect.forkAll(
//       [
//         // Example: Process debounced task events
//         debouncedTaskEventsStream.pipe(
//           Stream.tap((message) =>
//             Effect.sync(() => advancedStreamLogger.info('Debounced event:', message))
//           ),
//           Stream.runDrain
//         ),

//         // Example: Process batched events
//         batchProcessingStream.pipe(
//           Stream.tap((count) =>
//             Effect.sync(() =>
//               advancedStreamLogger.info(`Completed batch processing of ${count} events`)
//             )
//           ),
//           Stream.runDrain
//         ),

//         // Example: Process windowed events
//         windowedTaskEventsStream.pipe(
//           Stream.tap((chunk) =>
//             Effect.sync(() => advancedStreamLogger.info(`Window collected ${chunk.length} events`))
//           ),
//           Stream.runDrain
//         ),

//         // Example: Process events with retries
//         taskEventsStream.pipe(
//           Stream.mapEffect(processWithRetry),
//           Stream.tap((result) => Effect.sync(() => advancedStreamLogger.info(result))),
//           Stream.runDrain
//         ),

//         // Example: Periodic state sampling
//         periodicSamplingStream.pipe(
//           Stream.tap(([_, time]) => Effect.sync(() => advancedStreamLogger.info(time))),
//           Stream.runDrain
//         )
//       ].map((stream) =>
//         stream.pipe(
//           Effect.catchAll((error) => {
//             advancedStreamLogger.error('Stream processing error:', error)
//             return Effect.void
//           })
//         )
//       )
//     )

//     advancedStreamLogger.info('Advanced stream processor setup complete')
//   })
// }

// /**
//  * Create a Layer with the advanced stream example
//  */
// export const AdvancedStreamProcessorLive = Layer.scopedDiscard(
//   createAdvancedStreamProcessor()
// ).pipe(Layer.provide(PubSubClient.Default))
