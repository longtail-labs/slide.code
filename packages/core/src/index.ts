import { Layer, ManagedRuntime } from 'effect'
// import * as RpcSerialization from '@effect/rpc/RpcSerialization'
// import * as RpcServer from '@effect/rpc/RpcServer'

import {
  SentryService,
  MenuService,
  ElectronEventService,
  PostHogService,
  PubSubClient,
  SubscriptionService,
  APIService,
  GlobalShortcutService,
  ClaudeCodeService
} from './services/index.js'

import { PubSubSubscribers } from './subscribers/index.js'

import { RefsLayer, UpdateRef } from './refs/index.js'

import {
  configurePerformanceOptimizations,
  ensureSingleInstance,
  registerSSRProtocols,
  registerDeepLinkingProtocol
} from './effects/index.js'

import * as config from './config.js'
import { DefaultLoggerLayer } from './logger.js'
// Import directly from RPC files
// import { SlideRpcs } from '@polka/schema/requests'
// import { SlideLive } from './rpc/handlers.js'
// import { ElectronProtocolLayer } from './rpc/index.js'

// Create a default logger to use immediately (no config needed)
// const defaultLogger = createDefaultLogger()

// Replace the default logger with our custom one for immediate use
// This means any Effect.log calls will use our formatted logger
// export const DefaultLoggerLayer = Logger.replace(Logger.defaultLogger, defaultLogger)

// First create the base services that don't have dependencies
const BaseServicesLayer = Layer.mergeAll(
  DefaultLoggerLayer,
  SentryService.Default,
  PostHogService.Default,
  MenuService.Default,
  ElectronEventService.Default,
  RefsLayer,
  SubscriptionService.Default,
  APIService.Default,
  ClaudeCodeService.Default
  // GlobalShortcutService.Default
)

// Next, create the PubSub layer
const PubSubLayer = Layer.merge(DefaultLoggerLayer, PubSubClient.Default)

// Add the subscribers (depend on PubSub and other services)
const SubscribersLayer = PubSubSubscribers.pipe(
  Layer.provide(Layer.mergeAll(BaseServicesLayer, PubSubLayer))
)

// RPC serialization layer
// const SerializationLayer = Layer.merge(DefaultLoggerLayer, RpcSerialization.layerNdjson)

// First combine protocol with serialization
// const ProtocolLayer = Layer.provide(ElectronProtocolLayer, SerializationLayer)

// Create the RPC layer with the Electron protocol
// const RpcLayer = Layer.provide(RpcServer.layer(SlideRpcs), Layer.merge(SlideLive, ProtocolLayer))

// Combine all layers and handle all errors through ManagedRuntime
// CoreLayer is intentionally declared using 'any' to overcome type issues
// This is a workaround for the type system constraints
export const CoreLayer = Layer.mergeAll(
  DefaultLoggerLayer,
  // RpcLayer,
  BaseServicesLayer,
  PubSubLayer,
  SubscribersLayer
)

// Create a runtime that will handle all service interactions
export const SlideRuntime = ManagedRuntime.make(CoreLayer)

export {
  configurePerformanceOptimizations,
  ensureSingleInstance,
  registerSSRProtocols,
  registerDeepLinkingProtocol
}

export { config }

export { SentryService, MenuService, UpdateRef, SubscriptionService, APIService }

// Export message system
export * from './services/pubsub.service.js'

// Export services
export * from './services/index.js'
