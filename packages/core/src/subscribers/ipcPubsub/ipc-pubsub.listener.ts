import { ipcMain } from 'electron'
import { Effect, Layer } from 'effect'
import { PubSubClient } from '../../services/pubsub.service.js'
import { deserializeMessage } from '@slide.code/schema/messages'
import type { Message } from '@slide.code/schema/messages'
import { PUBSUB_CHANNELS } from '@slide.code/types'

/**
 * IpcCommandListener listens for commands on the IPC channel and forwards them to PubSub
 * This creates a bridge from the renderer processes to the main process event system
 */
export class IpcPubsubListener {
  private readonly moduleName = 'IpcPubsubListener'

  /**
   * Create a Layer that sets up the listener
   */
  public makeLayer() {
    const moduleName = this.moduleName

    const make = Effect.gen(function* () {
      yield* Effect.logInfo('📨 Starting IPC pubsub listener with enhanced logging')

      const pubsub = yield* PubSubClient

      // Set up the IPC listener for commands on PUBLISH channel
      ipcMain.on(PUBSUB_CHANNELS.PUBLISH, (_, serializedCommand) => {
        console.log('[IPC-PUBSUB-LISTENER] 📨 Received IPC pubsub message from renderer:', {
          timestamp: Date.now(),
          channel: PUBSUB_CHANNELS.PUBLISH,
          rawMessage: serializedCommand
        })

        Effect.suspend(() => {
          try {
            // Deserialize the command
            const command = deserializeMessage(serializedCommand)
            console.log('[IPC-PUBSUB-LISTENER] 📨 Successfully deserialized command:', {
              type: command._tag,
              command: command
            })
            console.log(
              '[IPC-PUBSUB-LISTENER] 📨 Full deserialized command:',
              JSON.stringify(command, null, 2)
            )

            // Forward the command to the PubSub service
            console.debug('[IPC-PUBSUB-LISTENER] 📨 Forwarding to PubSub:', command)
            return publish(command)
          } catch (error) {
            console.error('[IPC-PUBSUB-LISTENER] ❌ Error processing pubsub message:', error)
            console.error('[IPC-PUBSUB-LISTENER] ❌ Raw message that failed:', serializedCommand)
            return Effect.void
          }
        }).pipe(Effect.runFork)
      })

      /**
       * Publish a command to the PubSub system
       */
      const publish = (command: Message): Effect.Effect<boolean> =>
        Effect.gen(function* () {
          console.debug(`[IPC-PUBSUB-LISTENER] 📨 Publishing command to PubSub: ${command._tag}`)
          const result = yield* pubsub.publish(command)
          console.log(
            `[IPC-PUBSUB-LISTENER] 📨 Successfully published ${command._tag} to PubSub, result:`,
            result
          )
          return result
        })

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          console.info(
            '[IPC-PUBSUB-LISTENER] 📨 IPC command listener started and listening on channel:',
            PUBSUB_CHANNELS.PUBLISH
          )
          return () => {
            console.info('[IPC-PUBSUB-LISTENER] 📨 Cleaning up IPC command listener')
            ipcMain.removeAllListeners(PUBSUB_CHANNELS.PUBLISH)
          }
        }),
        (cleanup) =>
          Effect.sync(() => {
            cleanup()
            console.info('[IPC-PUBSUB-LISTENER] 📨 IPC command listener stopped')
          })
      )
    }).pipe(Effect.annotateLogs({ module: moduleName }))

    return Layer.scopedDiscard(make)
  }
}

/**
 * Create the IpcCommandListener layer
 */
export const IpcPubsubListenerLive = (() => {
  const listener = new IpcPubsubListener()
  return listener.makeLayer()
})()
