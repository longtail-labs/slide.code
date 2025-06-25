// import { Effect } from 'effect'
// import { StreamSubscriber } from './stream-subscriber.js'
// import { Message } from '../messages.js'
// import { $is } from '../messages.js'
// import { logger } from '@polka/shared/logger/main'

// /**
//  * Subscriber for TaskStarted messages using the StreamSubscriber pattern
//  */
// export class TaskStartedStreamSubscriber extends StreamSubscriber<'TaskStarted'> {
//   protected readonly messageType = 'TaskStarted'
//   protected readonly moduleName = 'TaskStartedStreamSubscriber'

//   private readonly taskStartedLogger = logger.createScoped(this.moduleName)
//   private readonly isTaskStarted = $is('TaskStarted')

//   /**
//    * Handle TaskStarted messages
//    */
//   protected handleMessage(message: Message): Effect.Effect<unknown> {
//     // Type guard ensures we only handle TaskStarted messages
//     if (this.isTaskStarted(message)) {
//       return Effect.sync(() => {
//         this.taskStartedLogger.info('Task started event processed:', {
//           taskId: message.taskId,
//           timestamp: message.timestamp
//         })
//         // Add your business logic here
//       })
//     }

//     // If message is not TaskStarted (should never happen with stream filtering)
//     return Effect.void
//   }
// }

// /**
//  * Create the TaskStartedStreamSubscriber layer
//  */
// export const TaskStartedStreamSubscriberLive = (() => {
//   const subscriber = new TaskStartedStreamSubscriber()
//   return subscriber.makeLayer()
// })()
