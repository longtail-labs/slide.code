# packages/clients/CLAUDE.md

## Purpose
Client-side utilities and React hooks for the renderer process. Provides API clients, IPC communication utilities, and data fetching hooks used by the React UI.

## Key Components

### PubSub (`src/pubsub/`)
Event-based communication system between main and renderer processes:
- Both processes can listen to and dispatch events
- Built on Electron IPC for cross-process messaging
- Used for notifications, state updates, and general events
- Example: Task status updates, file changes, notifications

### RPC (`src/rpc/`)
Remote Procedure Call implementation using Effect.ts:
- Type-safe function calls across process boundaries
- Uses Electron MessagePorts for efficient communication
- Wrapped in React provider for easy consumption
- Ideal for request-response patterns (e.g., database queries)

### IPCRef (`src/ipcref/`)
Shared state synchronization across processes:
- Similar to Zustand but works between main and renderer
- State updates in either process sync automatically
- Provides React hooks for easy state access
- Perfect for shared application state (user info, settings)

### Helpers (`src/helpers/`)
Domain-specific helper functions organized by feature:
- `app/`: Application-level helpers
- `claude/`: Claude Code integration helpers
- `external/`: External service integrations
- `projects/`: Project management utilities
- `tasks/`: Task tracking helpers
- `users/`: User management utilities
- `update/`: App update helpers

### TanStack Query (`src/tanstack/`)
Configured TanStack Query client for data fetching:
- Integrates with RPC for server state
- Provides caching and synchronization
- Handles loading and error states

### Drizzle (`src/drizzle/`)
Database query utilities for the renderer:
- Type-safe database queries via RPC
- Integrates with Effect.ts layers

## Usage in Renderer
```typescript
// Using PubSub
import { pubsub } from '@slide.code/clients'
pubsub.on('task:updated', (data) => { ... })
pubsub.emit('user:action', payload)

// Using RPC
import { rpc } from '@slide.code/clients'
const result = await rpc.database.getProjects()

// Using IPCRef hooks
import { useUser } from '@slide.code/clients/ipcref/hooks'
const user = useUser()
```

## Important Notes
- All IPC communication goes through the secure preload bridge
- State management is centralized through these utilities
- React components should use hooks rather than direct IPC calls
- Type safety is enforced through Effect.ts schemas