/**
 * IPCRef - Inter-Process Communication Ref
 *
 * This module provides a way to synchronize state between the main process and renderer process(es)
 * using a ref-like API. It's built on top of Electron's IPC system.
 */

console.log('[IPCRef] 📦 IPCRef module loaded')

// Export all from implementation
export * from './impl.js'

// Export all hooks
export * from './hooks.js'

console.log('[IPCRef] ✅ IPCRef module exports ready')
