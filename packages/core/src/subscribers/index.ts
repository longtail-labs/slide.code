import { Effect, Layer } from 'effect'

import { AppLaunchedFlow } from '../flows/app-and-task.flow.js'

const make = Effect.gen(function* () {
  yield* Effect.logInfo('Starting PubSubSubscribers')

  yield* Effect.acquireRelease(Effect.logInfo(`PubSubSubscribers started`), () =>
    Effect.logInfo(`PubSubSubscribers stopped`)
  )
}).pipe(Effect.annotateLogs({ module: 'pubsub-subscribers' }))

/**
 * Layer that provides all PubSub subscribers
 */
export const PubSubSubscribers = Layer.scopedDiscard(make).pipe(Layer.provide(AppLaunchedFlow))
// Note: IPC subscribers should be added separately in the main app composition
// due to type compatibility issues with merging layers
