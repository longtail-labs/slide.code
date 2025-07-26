import { Effect, Stream } from 'effect'
import { PubSubClient } from '../../services/pubsub.service.js'
import type { Message } from '@slide.code/schema/messages'
import { Layer } from 'effect'

/**
 * Subscriber that broadcasts all messages to renderer processes
 * This replaces the auto-broadcasting logic that was in the PubSubClient
 */
export class RendererBroadcasterSubscriber {
  private readonly moduleName = 'RendererBroadcaster'

  /**
   * Create a Layer that sets up the subscriber
   */
  public makeLayer() {
    const moduleName = this.moduleName

    const make = Effect.gen(function* () {
      yield* Effect.logInfo('📡 Starting RendererBroadcaster with enhanced logging')

      const pubsub = yield* PubSubClient

      // Create a stream for all messages
      const messageStream = pubsub.createStream()

      // Process each message in the stream and broadcast it to renderers
      yield* Effect.forkScoped(
        messageStream.pipe(
          Stream.tap((message: Message) =>
            Effect.sync(() => {
              console.debug('[RENDERER-BROADCASTER] 📡 Broadcasting message to renderers:', {
                type: message._tag,
                timestamp: Date.now(),
                message: message
              })
              console.log('[RENDERER-BROADCASTER] 📡 Message type:', message._tag)
              console.log(
                '[RENDERER-BROADCASTER] 📡 Full message:',
                JSON.stringify(message, null, 2)
              )
            })
          ),
          Stream.mapEffect((message: Message) =>
            Effect.gen(function* () {
              yield* Effect.logInfo(`📡 Broadcasting ${message._tag} to all renderers`)
              yield* pubsub.broadcastToRenderers(message)
              yield* Effect.logInfo(`📡 Successfully broadcasted ${message._tag}`)
            })
          ),
          Stream.runDrain
        )
      )

      yield* Effect.acquireRelease(
        Effect.sync(() =>
          console.info(
            '[RENDERER-BROADCASTER] 📡 RendererBroadcaster started and listening for messages'
          )
        ),
        () =>
          Effect.sync(() => console.info('[RENDERER-BROADCASTER] 📡 RendererBroadcaster stopped'))
      )
    }).pipe(Effect.annotateLogs({ module: moduleName }))

    return Layer.scopedDiscard(make)
  }
}

/**
 * Create the RendererBroadcasterSubscriber layer
 */
export const RendererBroadcasterSubscriberLive = (() => {
  const subscriber = new RendererBroadcasterSubscriber()
  return subscriber.makeLayer()
})()
