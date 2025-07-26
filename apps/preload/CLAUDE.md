# apps/preload/CLAUDE.md

## Purpose
Electron preload scripts that act as a secure bridge between the main process and renderer process. Exposes safe APIs to the renderer via contextBridge while maintaining security.

## Key Components

### Main Preload (`src/index.ts`)
Primary preload script that exposes APIs:
- Aggregates all sub-modules
- Sets up contextBridge
- Configures security policies

### IPCRef (`src/ipcref.ts`)
Shared state synchronization system:
- Register/unregister state refs
- Update state values from renderer
- Subscribe to state changes
- Get current state values
- Similar to Zustand but cross-process

### PubSub (`src/pubsub.ts`)
Event-based messaging system:
- Emit events to main process
- Listen for events from main
- Remove event listeners
- Bidirectional communication

### RPC (`src/rpc.ts`)
Remote procedure call bridge:
- Creates MessagePort channels
- Enables type-safe function calls
- Handles request/response patterns
- Integrates with Effect.ts RPC

### Utilities
- **versions.ts**: Expose app/Electron versions
- **nodeCrypto.ts**: Crypto utilities for renderer
- **webview-preload.ts**: Special preload for webviews

## Security Model
```typescript
// Only expose specific, safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  // Carefully curated methods
})

// Never expose:
// - Direct file system access
// - Process/shell execution
// - Unrestricted IPC access
```

## API Structure
The preload exposes these namespaces to renderer:
- `window.pubsub`: Event messaging
- `window.rpc`: Remote procedure calls
- `window.ipcRef`: Shared state
- `window.versions`: Version info
- `window.electronAPI`: Other utilities

## Important Notes
- This is the ONLY way renderer accesses main process
- All APIs must be explicitly exposed
- Security is paramount - validate everything
- Keep the API surface minimal
- Never expose Node.js APIs directly