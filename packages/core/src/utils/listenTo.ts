import { Effect, Layer } from 'effect'
import { PubSubClient } from '../services/pubsub.service.js'
import type { MessageType, TypedMessage } from '@slide.code/schema/messages'

export const listenTo = <T extends MessageType>(
  messageType: T,
  moduleName: string,
  handler: (message: TypedMessage<T>) => Effect.Effect<any, any, any>
): Layer.Layer<never, never, PubSubClient> => {
  const layer = Effect.gen(function* () {
    yield* Effect.logInfo(`[Subscriber] Starting ${moduleName}`)

    const pubsub = yield* PubSubClient

    const subscription = yield* pubsub.subscribeTo(messageType)

    yield* Effect.forkScoped(
      Effect.forever(
        subscription.pipe(
          Effect.flatMap((message) =>
            Effect.catchAll(
              Effect.gen(function* () {
                yield* Effect.logInfo(`[Subscriber] Processing ${messageType} message:`, message)
                // Type assertion is safe here because subscribeTo ensures message type
                if (message._tag === messageType) {
                  yield* handler(message as TypedMessage<T>)
                } else {
                  yield* Effect.logWarning(
                    `[Subscriber] Received message with unexpected type: ${message._tag}, expected: ${messageType}`
                  )
                }
              }),
              (error) => {
                Effect.logError(`[Subscriber] Error processing ${messageType}:`, error)
                return Effect.void
              }
            )
          )
        )
      )
    )

    yield* Effect.acquireRelease(Effect.logInfo(`[Subscriber] ${moduleName} started`), () =>
      Effect.logInfo(`[Subscriber] ${moduleName} stopped`)
    )
  }).pipe(Effect.annotateLogs({ module: moduleName }))

  return Layer.scopedDiscard(layer)
}
