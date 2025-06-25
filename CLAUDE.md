# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- **Start Application**: `npm start`
- **Build Development**: `npm run build`
- **Build Production**: `npm run build:prod`
- **Build Beta**: `npm run build:beta`
- **Format Code**: `npm run format`
- **Type Check**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Run Tests**: `npm run test`
- **Run Single Test**: `npx jest path/to/test.ts`

## Project Structure
- **Main Entry**: `apps/main/src/index.ts` - Electron app entry point with Effect-based program
- **Core Logic**: `packages/core/` - Contains services, views, templates, and Effect-based logic
- **Schema**: `packages/schema/src/` - Schema definitions using Effect.Schema
  - `messages.ts` - App-wide message types and schemas
  - `task/` - Task schemas and types
  - `objects/` - Document and link schemas
- **SSR Client**: `packages/ssr-client/` - HTMX/AlpineJS for rendering views
- **UI Components**: 
  - `packages/core/src/views/` - Server-side rendered views with HTMX/AlpineJS
  - `packages/core/src/widgets/` - Action bar, task sidebar, context menu, toast components
  - `packages/core/src/templates/` - JSX templates for UI components

## Technologies
- **Core Framework**: Effect.js for functional programming and type-safe error handling
- **Database**: Kuzu graph database with Cypher queries in `packages/core/src/services/kuzu.service.ts`
- **UI**: HTMX with AlpineJS and Tailwind CSS
- **App Platform**: Electron with IPC communication
- **Messaging**: Type-safe message passing with schemas defined in `packages/schema/src/messages.ts`
- **State Management**: Effect.js for state management in main process
- **Views**:
  - Planning view: Task management UI
  - Working view: Browser-like interface with sidebar, action bar, and main content

## Code Style Guidelines
- **Formatting**: Single quotes, no semicolons, 100 char line limit, no trailing commas
- **TypeScript**: Strict mode, NodeNext module resolution, ES2022 target
- **Effect.js Patterns**:
  - Use `Effect.gen` with `yield*` for sequential operations
  - Use `pipe` for functional composition
  - Define services as `Effect.Service` classes
  - Use Schema for runtime validation and type safety
- **Error Handling**: Create specific error classes and handle with Effect.js
- **Type Safety**: Use strict mode with precise types, avoid `any`