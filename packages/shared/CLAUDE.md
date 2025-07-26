# packages/shared/CLAUDE.md

## Purpose
Shared utilities and constants used across multiple packages. Contains cross-cutting concerns that don't belong to any specific package but are needed by several.

## Key Components

### Paths (`src/paths.ts`)
Centralized path definitions:
- Application directories (userData, logs, etc.)
- Project vibe directory paths
- Configuration file locations
- Cross-platform path handling

### Constants and Utilities (`src/index.ts`)
Shared constants and helper functions:
- Application constants (name, version)
- Common utility functions
- Shared type definitions
- Cross-package helpers

## Usage Pattern
```typescript
import { paths, constants } from '@slide.code/shared'

const projectDir = paths.getProjectPath(projectName)
const appName = constants.APP_NAME
```

## Design Principles
- Keep this package minimal and focused
- Only add truly shared functionality
- Avoid circular dependencies
- Prefer duplication over wrong abstraction
- Platform-agnostic when possible

## Important Notes
- Used by both main and renderer processes
- Should not depend on Electron APIs directly
- Keep dependencies minimal
- Changes here can affect multiple packages