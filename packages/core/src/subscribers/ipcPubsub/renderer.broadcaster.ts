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
      yield* Effect.logInfo('Starting RendererBroadcaster')

      const pubsub = yield* PubSubClient

      // Create a stream for all messages
      const messageStream = pubsub.createStream()

      // Process each message in the stream and broadcast it to renderers
      yield* Effect.forkScoped(
        messageStream.pipe(
          Stream.tap((message: Message) =>
            Effect.sync(() => {
              console.debug('Broadcasting message to renderers:', message)
            })
          ),
          Stream.mapEffect((message: Message) => pubsub.broadcastToRenderers(message)),
          Stream.runDrain
        )
      )

      yield* Effect.acquireRelease(
        Effect.sync(() => console.info('RendererBroadcaster started')),
        () => Effect.sync(() => console.info('RendererBroadcaster stopped'))
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
