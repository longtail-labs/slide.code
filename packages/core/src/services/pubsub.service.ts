import { Effect, PubSub, Queue, Scope, Stream } from 'effect'
import type { Message, MessageType } from '@slide.code/schema/messages'
import { webContents } from 'electron'

// Channel name for renderer communication
import { DefaultLoggerLayer } from '../logger.js'

export interface IPubSubClient {
  publish: (message: Message) => Effect.Effect<boolean>
  unsafePublish: (message: Message) => boolean
  subscribe: () => Effect.Effect<Queue.Dequeue<Message>, never, Scope.Scope>
  subscribeTo: <T extends MessageType>(
    messageType: T
  ) => Effect.Effect<Queue.Dequeue<Message>, never, Scope.Scope>
  listenTo: <T extends MessageType>(
    messageType: T,
    handler: (message: Message) => Effect.Effect<unknown>
  ) => Effect.Effect<void, never, Scope.Scope>
  createStream: () => Stream.Stream<Message>
  createStreamFor: <T extends MessageType>(messageType: T) => Stream.Stream<Message>
  shutdown: () => Effect.Effect<void>
  isShutdown: () => Effect.Effect<boolean>
  broadcastToRenderers: (message: Message) => Effect.Effect<void>
}

/**
 * PubSubClient for message broadcasting and subscription
 */
export class PubSubClient extends Effect.Service<PubSubClient>()('PubSubClient', {
  dependencies: [DefaultLoggerLayer],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('📡 Starting PubSubClient')

    // Create the pubsub
    const pubsub = yield* PubSub.unbounded<Message>().pipe(
      Effect.tap(() => Effect.sync(() => Effect.logInfo('📡 PubSubClient started')))
    )

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('📡 Cleaning up PubSubClient')
        yield* PubSub.shutdown(pubsub)
        yield* Effect.logInfo('📡 PubSubClient cleaned up successfully')
      })
    )

    const publish = (message: Message): Effect.Effect<boolean> => {
      Effect.logDebug('Publishing message:', message)
      return PubSub.publish(pubsub, message)
    }

    const unsafePublish = (message: Message): boolean => {
      Effect.logDebug('Unsafe publishing message:', message)
      return pubsub.unsafeOffer(message)
    }

    const subscribe = (): Effect.Effect<Queue.Dequeue<Message>, never, Scope.Scope> => {
      Effect.logDebug('Subscribing to all messages')
      return PubSub.subscribe(pubsub)
    }

    const subscribeTo = <T extends MessageType>(
      messageType: T
    ): Effect.Effect<Queue.Dequeue<Message>, never, Scope.Scope> =>
      Effect.gen(function* () {
        Effect.logDebug(`Creating typed subscription for message type: ${messageType}`)

        const queue = yield* Queue.unbounded<Message>()
        const subscription = yield* PubSub.subscribe(pubsub)

        function matchesType(message: Message): boolean {
          return message._tag === messageType
        }

        yield* Effect.forkScoped(
          Effect.forever(
            Effect.gen(function* () {
              const message = yield* Queue.take(subscription)

              if (matchesType(message)) {
                Effect.logDebug(`Message matched type ${messageType}, forwarding to typed queue`)
                yield* Queue.offer(queue, message)
              }
            })
          ).pipe(Effect.catchAll(() => Effect.void))
        )

        return queue
      })

    const listenTo = <T extends MessageType>(
      messageType: T,
      handler: (message: Message) => Effect.Effect<unknown>
    ): Effect.Effect<void, never, Scope.Scope> =>
      Effect.gen(function* () {
        Effect.logDebug(`Setting up listener for message type: ${messageType}`)

        const subscription = yield* subscribeTo(messageType)

        yield* Effect.forkScoped(
          Effect.forever(
            Effect.gen(function* () {
              const message = yield* Queue.take(subscription)

              Effect.logDebug(`Processing ${messageType} message:`, message)

              yield* Effect.catchAll(handler(message), (error: unknown) => {
                const errorMessage = error instanceof Error ? error.message : String(error)
                Effect.logError(`Error processing ${messageType} message:`, errorMessage)
                return Effect.void
              })
            })
          ).pipe(Effect.catchAll(() => Effect.void))
        )
      })

    const createStream = (): Stream.Stream<Message> => {
      Effect.logDebug('Creating stream for all messages')
      return Stream.fromPubSub(pubsub)
    }

    const createStreamFor = <T extends MessageType>(messageType: T): Stream.Stream<Message> => {
      Effect.logDebug(`Creating stream for message type: ${messageType}`)

      return createStream().pipe(Stream.filter((message) => message._tag === messageType))
    }

    const shutdown = (): Effect.Effect<void> => {
      Effect.logInfo('Shutting down PubSub')
      return PubSub.shutdown(pubsub)
    }

    const isShutdown = (): Effect.Effect<boolean> => {
      return PubSub.isShutdown(pubsub)
    }

    /**
     * Broadcast a message to all renderer processes
     * Uses webContents.getAllWebContents() to get all live WebContents
     */
    const broadcastToRenderers = (message: Message): Effect.Effect<void> =>
      Effect.sync(() => {
        try {
          const allWebContents = webContents.getAllWebContents()
          console.debug(`Broadcasting message to ${allWebContents.length} renderer(s):`, message)

          for (const contents of allWebContents) {
            try {
              if (!contents.isDestroyed()) {
                // Send the message directly - renderer can handle deserialization
                contents.send('pubsub-message', message)
              }
            } catch (error) {
              console.error(`Failed to send message to WebContents ID ${contents.id}:`, error)
            }
          }
        } catch (error) {
          console.error('Error broadcasting to renderers:', error)
        }
      })

    return {
      publish,
      unsafePublish,
      subscribe,
      subscribeTo,
      listenTo,
      createStream,
      createStreamFor,
      shutdown,
      isShutdown,
      broadcastToRenderers
    }
  })
}) {}

// Export the layer for backward compatibility
export const PubSubClientLive = PubSubClient
