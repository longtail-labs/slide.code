# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Slide Code is a graphical vibe coding environment (VCE) for Claude Code - a desktop application that transforms the Claude Code experience into an intuitive GUI with project management, real-time diff viewing, and integrated entertainment features.

## Build Commands
- **Install Dependencies**: `npm install`
- **Start Development**: `npm run start:app` (starts Electron app)
- **Build Production**: `npm run build`
- **Format Code**: `npm run format`
- **Type Check**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Run Tests**: `npm run test`
- **Database Migration**: `npm run db:migrate:apply`
- **Database Studio**: `npm run studio`

For the game server:
- **Setup Game**: `cd game && make setup`
- **Run Game Dev**: `cd game && make dev`
- **Build Game**: `cd game && make build`

## Project Structure
- **Main Process**: `apps/main/src/index.ts` - Electron main process entry point
- **Preload Scripts**: `apps/preload/` - Secure bridge between main and renderer
- **Renderer UI**: `widgets/app/` - React-based user interface
- **Core Business Logic**: `packages/core/` - Effect.ts-based services and resources
- **Client Libraries**: `packages/clients/` - API clients, hooks, and IPC utilities
- **Database**: `packages/db/` - Drizzle ORM with SQLite/Turso
- **Schema**: `packages/schema/` - Type definitions and Effect schemas
- **Shared Utilities**: `packages/shared/` - Cross-package utilities
- **Game Server**: `game/` - Go-based multiplayer grid game

## Architecture

### IPC Communication
The app uses three main communication patterns:

1. **PubSub** (`packages/clients/src/pubsub/`): Event-based communication between main and renderer processes
   - Both processes can listen and dispatch events
   - Built on Electron IPC for cross-process messaging
   - Used for notifications, updates, and general events

2. **RPC** (`packages/core/src/rpc/`): Remote procedure calls using Effect.ts RPC
   - Uses Electron MessagePorts for efficient communication
   - Type-safe function calls across process boundaries
   - Ideal for request-response patterns

3. **IPCRef** (`apps/preload/src/ipcref.ts`): Shared state synchronization
   - Similar to Zustand but works across processes
   - Updates in either main or renderer sync automatically
   - Perfect for shared application state

## Technologies
- **Core Framework**: Effect.ts for functional programming and type safety
- **Desktop**: Electron with secure contextBridge
- **UI**: React 18 with shadcn/ui components and Tailwind CSS
- **Database**: SQLite with Drizzle ORM
- **State Management**: TanStack Query + custom IPCRef system
- **Build Tools**: Vite for fast development
- **Game Server**: Go with Templ templating and Datastar reactivity

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, use precise types
- **React**: Functional components with hooks
- **Effect.ts Patterns**:
  - Use `Effect.gen` with `yield*` for sequential operations
  - Define services as classes with `Effect.Service`
  - Use `pipe` for functional composition
  - Handle errors with typed error classes
- **File Organization**: Keep related functionality together
- **Imports**: Use absolute imports with @ aliases

## Key Features to Understand
- **Claude Code Integration**: Manages multiple Claude Code instances via SDK
- **Project Management**: Automatic vibe directory organization
- **Real-time Updates**: Live diff viewing and file watching
- **Task Tracking**: Monitor multiple concurrent Claude Code tasks
- **Git Integration**: Visual diffs and commit management
- **Entertainment**: Integrated music player, news reader, and game

## Important Notes
- The app manages Electron windows dynamically - see `packages/core/src/resources/BaseWindow/`
- WebContentsView is used for embedding web content and game views
- All database operations go through Effect.ts layers for consistency
- The preload script carefully exposes only safe APIs to the renderer
- State synchronization happens automatically via IPCRef