# packages/schema/CLAUDE.md

## Purpose
Central schema definitions and type contracts for the entire application. Uses Effect.Schema for runtime validation and Drizzle for database schemas. This ensures type safety across process boundaries and data persistence.

## Key Components

### Drizzle Schemas (`src/drizzle.ts`)
Database table definitions using Drizzle ORM:
- Project, Task, Message, Usage tables
- Relationships and constraints
- Used for type-safe database queries

### Effect Schemas
Runtime validation schemas using Effect.Schema:

- **messages.ts**: IPC message types and payloads
  - PubSub event schemas
  - RPC request/response schemas
  - Type-safe message passing

- **state.ts**: Application state schemas
  - User state, app configuration
  - Shared state definitions for IPCRef

- **models.ts**: Domain model schemas
  - Project, Task, ChatMessage models
  - Business logic validation

- **requests.ts**: API request/response schemas
  - Claude Code API interactions
  - External service contracts

### Utility Files

- **queryKeys.ts**: TanStack Query key factories
  - Consistent cache key generation
  - Type-safe query invalidation

- **client.ts**: Schema client utilities
  - Validation helpers
  - Schema composition utilities

- **chatMessageSchema.ts**: Chat-specific schemas
  - Message types and formatting
  - Claude interaction schemas

## Usage Pattern
```typescript
// Import schemas for validation
import { ProjectSchema, TaskSchema } from '@slide.code/schema'

// Validate data at runtime
const project = ProjectSchema.parse(data)

// Use for type definitions
type Project = Schema.Schema.Type<typeof ProjectSchema>
```

## Important Notes
- All data crossing process boundaries uses these schemas
- Effect.Schema provides runtime validation
- Drizzle schemas define database structure
- Changes here affect the entire application
- Keep schemas minimal and focused