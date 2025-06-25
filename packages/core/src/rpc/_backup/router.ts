// import { Effect, Layer, Context } from 'effect'
// import { RpcClient, RpcSerialization } from '@effect/rpc'
// import { Protocol } from '@effect/rpc/RpcClient'
// import { SystemRpcs } from './requests.js'
// import { SystemRpcLayer } from './handlers.js'
// import { layerProtocolElectronMain, registerWindow } from './electron-protocol-main.js'
// import { BrowserWindow } from 'electron'
// import * as RpcServer from '@effect/rpc/RpcServer'

// /**
//  * Create a System client for direct usage
//  * Note: This is a placeholder - you'll need to add transport configuration
//  * when implementing the actual client
//  */
// export const createSystemClient = () => {
//   return RpcClient.make(SystemRpcs)
//   // Later you'll add your transport configuration here
// }

// /**
//  * Creates an RPC router with all the handlers
//  * This is the main entry point for setting up the RPC system
//  */
// export const createRpcLayer = () => {
//   console.log('[RPC] Creating RPC router layer')

//   return Layer.mergeAll(
//     // Include the SystemRpcLayer to handle system operations
//     SystemRpcLayer,
//     // RpcServer.layer(SystemRpcs),

//     // Add main process protocol layer
//     layerProtocolElectronMain
//   )
// }

// /**
//  * Create the appRouter with all the RPCs we want to expose
//  */
// export const appRouter = {
//   // Include SystemRpcs in the router
//   SystemRpcs: SystemRpcs
// }

// /**
//  * Register a window with the RPC system
//  */
// export const registerRpcWindow = (window: BrowserWindow) => {
//   console.log('[RPC] Registering window with the RPC system')
//   registerWindow(window)
// }

// // Re-export the protocol layer for clients
// export { layerProtocolElectronMain }
