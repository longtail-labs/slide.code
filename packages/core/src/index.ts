import { Layer, ManagedRuntime } from 'effect'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import * as RpcServer from '@effect/rpc/RpcServer'

import {
  MenuService,
  ElectronEventService,
  PubSubClient,
  TaskService,
  DatabaseService,
  CcusageServiceLive
} from './services/index.js'

import { PubSubSubscribers } from './subscribers/index.js'
import {
  IpcPubsubListenerLive,
  RendererBroadcasterSubscriberLive
} from './subscribers/ipcPubsub/index.js'

import { RefsLayer, UpdateRef, UserRef } from './refs/index.js'

import {
  configurePerformanceOptimizations,
  ensureSingleInstance,
  registerSSRProtocols,
  registerDeepLinkingProtocol,
  createVibeDir,
  findClaudeCodeExecutable,
  syncCcusageStats,
  startCcusageBackgroundSync,
  initializeCcusageSync,
  checkClaudeCodeAuth,
  initializeClaudeCodeAuth
} from './effects/index.js'

import * as config from './config.js'
import { DefaultLoggerLayer } from './logger.js'
import { IPCRefService } from './services/ipc-ref.service.js'
// Import directly from RPC files
import { SlideRpcs } from '@slide.code/schema/requests'
import { SlideLive } from './rpc/handlers.js'
import { ElectronProtocolLayer } from './rpc/index.js'

// First create the base services that don't have dependencies
const BaseServicesLayer = Layer.mergeAll(
  DefaultLoggerLayer,
  IPCRefService.Default,
  // SentryService.Default,
  MenuService.Default,
  ElectronEventService.Default,
  RefsLayer,
  TaskService.Default,
  DatabaseService.Default,
  CcusageServiceLive
  // GlobalShortcutService.Default
)

// Next, create the PubSub layer
const PubSubLayer = Layer.merge(DefaultLoggerLayer, PubSubClient.Default)

// Add the subscribers (depend on PubSub and other services)
const SubscribersLayer = PubSubSubscribers.pipe(
  Layer.provide(Layer.mergeAll(BaseServicesLayer, PubSubLayer))
)

const SerializationLayer = Layer.merge(DefaultLoggerLayer, RpcSerialization.layerNdjson)

const ProtocolLayer = Layer.provide(ElectronProtocolLayer, SerializationLayer)

const RpcLayer = Layer.provide(RpcServer.layer(SlideRpcs), Layer.merge(SlideLive, ProtocolLayer))

// Combine all layers and handle all errors through ManagedRuntime
// CoreLayer is intentionally declared using 'any' to overcome type issues
// This is a workaround for the type system constraints
export const CoreLayer = Layer.mergeAll(
  DefaultLoggerLayer,
  RpcLayer,
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
  registerDeepLinkingProtocol,
  createVibeDir,
  findClaudeCodeExecutable,
  syncCcusageStats,
  startCcusageBackgroundSync,
  initializeCcusageSync,
  checkClaudeCodeAuth,
  initializeClaudeCodeAuth
}

export { config }

export { MenuService, UpdateRef, UserRef }

// Export message system
export * from './services/pubsub.service.js'

// Export services
export * from './services/index.js'

// Export types
export * from './types/claude-code.types.js'

// Task Service
export {
  TaskService,
  TaskServiceLive,
  TaskServiceError,
  type TaskInfo,
  type AgentEvent
} from './services/task.service.js'
