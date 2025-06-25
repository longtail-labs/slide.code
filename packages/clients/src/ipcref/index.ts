/**
 * IPCRef - Inter-Process Communication Ref
 *
 * This module provides a way to synchronize state between the main process and renderer process(es)
 * using a ref-like API. It's built on top of Electron's IPC system.
 */

// Export all from implementation
export * from './impl.js'

// Export all hooks
export * from './hooks.js'
