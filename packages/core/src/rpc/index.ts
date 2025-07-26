/**
 * Effect RPC layer over Electron IPC
 *
 * This module provides:
 * 1. Protocol implementations for both main and renderer processes
 * 2. RPC request/response schemas
 * 3. Handlers for RPC requests
 */

// Export RPC components
export * from './handlers.js'
export * from './electron-protocol.js'
