// import { Effect, Layer } from 'effect'
// import { BrowserWindow, app } from 'electron'
// import type { Event as ElectronEvent } from 'electron'
// import { initializeRpc, registerWindowWithRpc } from './router.js'
// import { RpcSerialization } from '@effect/rpc'

// /**
//  * Initialize the RPC system for the given window
//  * This registers the window with the RPC system
//  */
// export const setupRpcForWindow = (window: BrowserWindow) => {
//   console.log('[IPCEFFECT] Setting up RPC for window', window.id)
//   // Register the window with the RPC system
//   registerWindowWithRpc(window)
//   console.log('[RPC] Setup complete for window')
// }

// /**
//  * Initialize the global RPC system
//  * This should be called once during app startup
//  */
// export const setupRpcSystem = () => {
//   // Initialize the RPC system
//   Effect.runPromise(initializeRpc().pipe(Effect.provide(RpcSerialization.layerNdjson)))
//     .then(() => {
//       console.log('[RPC] System initialized successfully')
//     })
//     .catch((error) => {
//       console.error('[RPC] Failed to initialize system:', error)
//     })
// }

// /**
//  * Initialize the RPC system for any new windows that are created
//  * This can be called in app.whenReady()
//  */
// export const setupRpcWindowHandlers = () => {
//   // Setup global RPC system first
//   setupRpcSystem()

//   // Register existing windows
//   BrowserWindow.getAllWindows().forEach(setupRpcForWindow)

//   // The type definition is not complete for this event, but it works in practice
//   // We use any here to avoid TypeScript errors
//   app.on('browser-window-created' as any, (_event: ElectronEvent, window: BrowserWindow) => {
//     setupRpcForWindow(window)
//   })
// }
