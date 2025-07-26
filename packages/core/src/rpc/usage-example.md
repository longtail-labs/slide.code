# Effect RPC for Electron - Usage Examples

This document shows how to integrate the Effect RPC layer with Electron IPC in both the main and renderer processes.

## Main Process Setup

```typescript
import { Effect, Layer } from 'effect'
import { BrowserWindow, app } from 'electron'
import { layerProtocolElectronMain, RpcRouterLive } from '@polka/core/rpc'
import { RpcSerialization } from '@effect/rpc/RpcSerialization'

// Set up the main window
let mainWindow: BrowserWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Configure preload script
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  // Create our managed runtime with RPC support
  const runtime = Effect.runSync(
    Effect.gen(function* () {
      // Create a managed runtime with the RPC router and protocol
      const runtime = yield* Effect.runtime<never>()
      
      // Add RPC layers to the runtime
      return runtime.pipe(
        Layer.mergeAll(
          // Main process protocol for electron
          layerProtocolElectronMain(mainWindow),
          // JSON serialization
          RpcSerialization.layerJson,
          // RPC router with all handlers
          RpcRouterLive
        )
      )
    })
  )

  // You can now use the runtime to handle RPC requests
})
```

## Preload Script Setup

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { FromClientEncoded, FromServerEncoded } from '@effect/rpc/RpcMessage'

// Expose the RPC API to the renderer
contextBridge.exposeInMainWorld('rpc', {
  // Send request to main process
  send: (message: FromClientEncoded): void => {
    ipcRenderer.send('rpc:request', message)
  },
  
  // Register handler for responses
  onMessage: (callback: (message: FromServerEncoded) => void): void => {
    const handler = (_event: Electron.IpcRendererEvent, message: FromServerEncoded) => {
      callback(message)
    }
    
    ipcRenderer.on('rpc:response', handler)
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('rpc:response', handler)
    }
  }
})

// TypeScript interface definition
declare global {
  interface Window {
    rpc: {
      send: (message: FromClientEncoded) => void
      onMessage: (callback: (message: FromServerEncoded) => void) => () => void
    }
  }
}
```

## Renderer Process Usage

```typescript
import { Effect } from 'effect'
import { RpcClient } from '@effect/rpc/RpcClient'
import { layerProtocolElectronRenderer } from '@polka/core/rpc'
import { RpcSerialization } from '@effect/rpc/RpcSerialization'
import { SystemRpcs } from '@polka/core/rpc/requests'

// Set up the client
const client = Effect.gen(function* () {
  // Create an RPC client using SystemRpcs
  return yield* RpcClient.make(SystemRpcs).pipe(
    Effect.provide(
      Layer.mergeAll(
        // Use the renderer protocol
        layerProtocolElectronRenderer,
        // Use JSON serialization
        RpcSerialization.layerJson
      )
    )
  )
})

// Example: Setting window title
const setWindowTitle = Effect.gen(function* () {
  const rpc = yield* client
  
  // Call the RPC method
  yield* rpc.SetWindowTitle({ title: 'New Window Title' })
  
  console.log('Window title updated')
})

// Run the effect
Effect.runPromise(setWindowTitle)
  .then(() => console.log('Done'))
  .catch(error => console.error('Failed:', error))

// Example: Getting app info
const getAppInfo = Effect.gen(function* () {
  const rpc = yield* client
  
  // Call the RPC method
  const info = yield* rpc.GetAppInfo({ includeVersion: true })
  
  console.log('App info:', info)
  
  return info
})

// Run the effect
Effect.runPromise(getAppInfo)
  .then(info => console.log('App info:', info))
  .catch(error => console.error('Failed:', error))
```

## Using Stream RPC Methods

For streaming data (like the UserList example):

```typescript
import { Effect, Stream } from 'effect'
import { RpcClient } from '@effect/rpc/RpcClient'
import { layerProtocolElectronRenderer } from '@polka/core/rpc'
import { RpcSerialization } from '@effect/rpc/RpcSerialization'
import { UserRpcs } from '@polka/core/rpc/requests'

// Set up the client
const client = Effect.gen(function* () {
  return yield* RpcClient.make(UserRpcs).pipe(
    Effect.provide(
      Layer.mergeAll(
        layerProtocolElectronRenderer,
        RpcSerialization.layerJson
      )
    )
  )
})

// Example: Getting a stream of users
const getUserStream = Effect.gen(function* () {
  const rpc = yield* client
  
  // Get a stream of users
  const userStream = yield* rpc.UserList({})
  
  // Process the stream
  yield* Stream.runForEach(userStream, user => {
    console.log('User:', user)
    return Effect.void
  })
})

// Run the effect
Effect.runPromise(getUserStream)
  .then(() => console.log('Finished processing users'))
  .catch(error => console.error('Failed:', error))
```

## Error Handling

```typescript
import { Effect } from 'effect'
import { RpcClient } from '@effect/rpc/RpcClient'
import { UserRpcs } from '@polka/core/rpc/requests'
// ... imports as before

const getUserById = Effect.gen(function* () {
  const rpc = yield* client
  
  try {
    // Try to get a user that doesn't exist
    const user = yield* rpc.UserById({ id: 'non-existent-id' })
    console.log('User:', user)
    return user
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
})

// Run the effect with better error handling
Effect.runPromise(
  getUserById.pipe(
    Effect.catchAll(error => {
      console.error('Error details:', error)
      return Effect.succeed(null)
    })
  )
)
```

## Benefits of This Approach

1. **Type Safety**: Full type safety between main and renderer processes
2. **Effect Integration**: Seamless integration with Effect's functional approach
3. **Resource Management**: Automatic resource cleanup via Effect's scopes
4. **Streaming**: First-class support for streaming data
5. **Error Handling**: Rich error handling capabilities
6. **Serialization**: Flexible serialization options (JSON, NDJSON, etc.)

This RPC layer simplifies communication between Electron processes while maintaining strong type safety and leveraging the power of Effect for managing side effects and resources. 