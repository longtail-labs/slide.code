// import { Effect } from 'effect'
// import { BaseSubscriber } from './base-subscriber.js'
// import { Message } from '../messages.js'
// import { $is } from '../messages.js'
// import { logger } from '@polka/shared/logger/main'

// /**
//  * Subscriber for TaskStarted messages using the BaseSubscriber pattern
//  */
// export class TaskStartedSubscriber extends BaseSubscriber<'TaskStarted'> {
//   protected readonly messageType = 'TaskStarted'
//   protected readonly moduleName = 'TaskStartedSubscriber'

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

//     // If message is not TaskStarted (should never happen with subscribeTo)
//     return Effect.void
//   }
// }

// /**
//  * Create the TaskStartedSubscriber layer
//  */
// export const TaskStartedSubscriberLive = (() => {
//   const subscriber = new TaskStartedSubscriber()
//   return subscriber.makeLayer()
// })()
