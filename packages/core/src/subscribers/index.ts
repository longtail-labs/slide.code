import { Effect, Layer } from 'effect'

import { AppLaunchedFlow } from '../flows/app.flow.js'
import { RendererBroadcasterSubscriberLive } from './ipcPubsub/renderer.broadcaster.js'
import { IpcPubsubListenerLive } from './ipcPubsub/ipc-pubsub.listener.js'
import { TaskStartListener } from './task-start.listener.js'

export * from './ipcPubsub/index.js'
export * from './task-start.listener.js'

const make = Effect.gen(function* () {
  yield* Effect.logInfo('Starting PubSubSubscribers')

  yield* Effect.acquireRelease(Effect.logInfo(`PubSubSubscribers started`), () =>
    Effect.logInfo(`PubSubSubscribers stopped`)
  )
}).pipe(Effect.annotateLogs({ module: 'pubsub-subscribers' }))

/**
 * Layer that provides all PubSub subscribers
 */
export const PubSubSubscribers = Layer.scopedDiscard(make).pipe(
  Layer.provide(AppLaunchedFlow),
  Layer.provide(RendererBroadcasterSubscriberLive),
  Layer.provide(IpcPubsubListenerLive),
  Layer.provide(TaskStartListener.Live)
)
// Note: IPC subscribers should be added separately in the main app composition
// due to type compatibility issues with merging layers
