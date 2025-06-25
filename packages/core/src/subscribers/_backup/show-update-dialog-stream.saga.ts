// import { Effect } from 'effect'
// import { StreamSubscriber } from './stream-subscriber.js'
// import { Message } from '../../messages.js'
// import { $is } from '../../messages.js'
// import { UpdateService } from '../../services/update.service.js'
// import { logger } from '@polka/shared/logger/main'

// /**
//  * Saga subscriber for ShowUpdateDialog commands from the renderer process
//  * using the StreamSubscriber pattern for improved processing
//  */
// export class ShowUpdateDialogStreamSaga extends StreamSubscriber<'ShowUpdateDialog'> {
//   protected readonly messageType = 'ShowUpdateDialog'
//   protected readonly moduleName = 'ShowUpdateDialogStreamSaga'

//   private readonly sagaLogger = logger.createScoped(this.moduleName)
//   private readonly isShowUpdateDialog = $is('ShowUpdateDialog')

//   /**
//    * Handle ShowUpdateDialog commands
//    */
//   protected handleMessage(message: Message): Effect.Effect<unknown> {
//     // Type guard ensures we only handle ShowUpdateDialog messages
//     if (this.isShowUpdateDialog(message)) {
//       const sagaLogger = this.sagaLogger

//       return Effect.gen(function* () {
//         const updateService = yield* UpdateService

//         sagaLogger.info(`[ShowUpdateDialogStreamSaga] Handling ShowUpdateDialog command:`, message)

//         if (message.checkForUpdates) {
//           yield* updateService.updateAppIfUpdateAvailable.pipe(
//             Effect.catchAll((error) => {
//               sagaLogger.error(`[ShowUpdateDialogStreamSaga] Error showing update dialog:`, error)
//               return Effect.succeed(false)
//             })
//           )
//         } else {
//           yield* updateService.triggerUpdateUI.pipe(
//             Effect.catchAll((error) => {
//               sagaLogger.error(`[ShowUpdateDialogStreamSaga] Error triggering update UI:`, error)
//               return Effect.succeed(false)
//             })
//           )
//         }

//         return Effect.succeed(true)
//       }).pipe(
//         Effect.provide(UpdateService.Default),
//         Effect.catchAll(() => Effect.void)
//       )
//     }

//     // If message is not ShowUpdateDialog (should never happen with stream filtering)
//     return Effect.void
//   }
// }

// /**
//  * Create the ShowUpdateDialogStreamSaga layer
//  */
// export const ShowUpdateDialogStreamSagaLive = (() => {
//   const saga = new ShowUpdateDialogStreamSaga()
//   return saga.makeLayer()
// })()
