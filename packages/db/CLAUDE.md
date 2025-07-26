# packages/db/CLAUDE.md

## Purpose
Database layer using Drizzle ORM with SQLite (local) and Turso (cloud) support. Provides type-safe database operations and schema management for storing projects, tasks, and application data.

## Key Components

### Client (`src/client.ts`)
Database client configuration:
- Local SQLite for development and offline use
- Turso (LibSQL) for cloud sync capabilities
- Drizzle ORM for type-safe queries
- Integrated with Effect.ts for error handling

### Types (`src/types.ts`)
Database type definitions and interfaces:
- Exported types from Drizzle schema
- Helper types for database operations
- Type-safe query results

## Database Schema
The schema (defined in packages/schema) includes:
- **Projects**: User projects and metadata
- **Tasks**: Claude Code task tracking
- **Messages**: Chat history and interactions
- **Usage**: Token usage and statistics
- **Settings**: User preferences

## Usage Pattern
```typescript
// Database is accessed via Effect.ts services
import { DatabaseService } from '@slide.code/core/services'

const projects = yield* DatabaseService.getProjects()
```

## Migration Commands
- Generate migration: `npm run db:migrate:generate`
- Apply migrations: `npm run db:migrate:apply`
- View database: `npm run studio` (opens Drizzle Studio)

## Important Notes
- Database operations only happen in the main process
- Renderer accesses data via RPC calls
- All queries are type-safe through Drizzle
- Supports both local-first and cloud sync modes
- Schema changes require new migrations