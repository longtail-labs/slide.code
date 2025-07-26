# packages/core/CLAUDE.md

## Purpose
Core business logic and services for the Electron main process. Built with Effect.ts for functional programming, type safety, and robust error handling. This is where all the main process logic lives.

## Architecture

### Services (`src/services/`)
Effect.ts services that handle core functionality:
- **database.service.ts**: Database operations via Drizzle ORM
- **electron-app.service.ts**: Electron app lifecycle management
- **ccusage.service.ts**: Claude Code usage tracking
- **menu.service.ts**: Application menu management
- **notification.service.ts**: System notifications
- **pubsub.service.ts**: PubSub event handling in main process
- **ipc-ref.service.ts**: IPCRef state management

### Resources (`src/resources/`)
Managed Electron resources with Effect.ts lifecycles:
- **BaseWindow/**: Window management abstraction
- **WebContentsView/**: Web content embedding (game, webviews)
- **ClaudeCodeAgent/**: Claude Code SDK integration
- **FileWatcher/**: File system monitoring
- **GitRepo/**: Git operations and diff viewing

### Effects (`src/effects/`)
Initialization and setup effects:
- **checkClaudeCodeAuth.effect.ts**: Verify Claude Code authentication
- **createVibeDir.effect.ts**: Setup project directory
- **ensureSingleInstance.effect.ts**: Prevent multiple app instances
- **findClaudeCodeExecutable.effect.ts**: Locate Claude Code CLI
- **performanceOptimizations.effect.ts**: App performance settings
- **syncCcusageStats.effect.ts**: Sync usage statistics

### RPC (`src/rpc/`)
Remote Procedure Call server implementation:
- **handlers.ts**: RPC method implementations
- **electron-protocol.ts**: Custom Electron transport for Effect RPC
- Uses MessagePorts for efficient communication
- Type-safe contract with renderer process

### Refs (`src/refs/`)
Shared state definitions using IPCRef:
- **app-ready.ref.ts**: Application readiness state
- **claude.ref.ts**: Claude Code configuration
- **user.ref.ts**: User information and settings

### Subscribers (`src/subscribers/`)
Event listeners and handlers:
- **ipcPubsub/**: IPC event handling
- **task-start.listener.ts**: Task lifecycle management

## Effect.ts Patterns
```typescript
// Service definition
export class DatabaseService extends Effect.Service<DatabaseService>()("DatabaseService", {
  // Service implementation
}) {}

// Effect composition
const program = Effect.gen(function* () {
  const db = yield* DatabaseService
  // Use service
})

// Resource management
class WindowResource extends Resource.Resource {
  // Lifecycle management
}
```

## Key Concepts
- All async operations use Effect.ts for error handling
- Services are dependency-injected via Effect layers
- Resources have managed lifecycles (acquire/release)
- State synchronization via IPCRef to renderer
- Type safety enforced throughout with schemas

## Integration Points
- Communicates with renderer via IPC (PubSub, RPC, IPCRef)
- Manages Claude Code processes via SDK
- Handles all system-level operations (files, windows, etc.)
- Coordinates between multiple renderer windows/views