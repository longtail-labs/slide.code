# apps/main/CLAUDE.md

## Purpose
The Electron main process entry point. This is where the application starts and orchestrates all other components. It's a thin wrapper that bootstraps the Effect.ts program defined in packages/core.

## Structure

### Entry Point (`src/index.ts`)
Minimal main process setup:
- Imports and runs the Effect.ts program from @slide.code/core
- Handles fatal errors and logging
- Sets up the application lifecycle

## How It Works
```typescript
// Simple bootstrap pattern
import { program } from '@slide.code/core'
import { NodeRuntime } from '@effect/platform-node'

// Run the Effect program
NodeRuntime.runMain(program)
```

## Responsibilities
- Application entry point
- Bootstrap Effect.ts runtime
- Configure Node.js environment
- Handle process-level errors

## Effect.ts Integration
The actual application logic lives in packages/core:
- Services, resources, and effects
- Window management
- IPC handling
- Database operations

This separation keeps the entry point clean and testable.

## Important Notes
- Keep this file minimal - logic goes in packages/core
- This runs in Node.js context with full system access
- Electron app initialization happens in core services
- All heavy lifting delegated to Effect.ts program