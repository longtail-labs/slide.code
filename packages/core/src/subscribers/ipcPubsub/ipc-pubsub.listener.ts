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
      yield* Effect.logInfo('Starting IPC pubsub listener')

      const pubsub = yield* PubSubClient

      // Set up the IPC listener for commands on PUBLISH channel
      ipcMain.on(PUBSUB_CHANNELS.PUBLISH, (_, serializedCommand) => {
        console.log('Received IPC pubsub message:', serializedCommand)
        Effect.suspend(() => {
          try {
            // Deserialize the command
            const command = deserializeMessage(serializedCommand)
            console.log('Deserialized command:', command)

            // Forward the command to the PubSub service
            console.debug('Forwarding to PubSub:', command)
            return publish(command)
          } catch (error) {
            console.error('Error processing pubsub message:', error)
            return Effect.void
          }
        }).pipe(Effect.runFork)
      })

      /**
       * Publish a command to the PubSub system
       */
      const publish = (command: Message): Effect.Effect<boolean> =>
        Effect.gen(function* () {
          console.debug(`Publishing command to PubSub: ${command._tag}`)
          return yield* pubsub.publish(command)
        })

      yield* Effect.acquireRelease(
        Effect.sync(() => {
          console.info('IPC command listener started')
          return () => {
            console.info('Cleaning up IPC command listener')
            ipcMain.removeAllListeners(PUBSUB_CHANNELS.PUBLISH)
          }
        }),
        (cleanup) =>
          Effect.sync(() => {
            cleanup()
            console.info('IPC command listener stopped')
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
