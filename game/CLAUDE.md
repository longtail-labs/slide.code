# game/CLAUDE.md

## Purpose
BitSplat Game Server - A multiplayer grid conquest game integrated with Slide Code. Players compete to control territory on a shared grid, with support for JavaScript bot automation. The game can be embedded in the main Slide Code app via webview.

## Tech Stack
- **Go**: Server-side game logic and HTTP handlers
- **Templ**: Type-safe HTML templating for server-side rendering
- **Datastar**: Real-time frontend reactivity without JavaScript frameworks
- **NATS.io**: Message queue for real-time game state updates
- **Tailwind CSS**: Utility-first styling

## Key Commands
- `make setup`: Install tools and dependencies
- `make dev`: Start development server with hot reload
- `make build`: Build production binary
- `make templ-generate`: Generate Go code from templ files
- `make clean`: Clean build artifacts

## Architecture
- **server.go**: Main entry point, HTTP server setup
- **types/**: Game logic and NATS integration
  - `nats.go`: NATS client and messaging
  - `nats_game_manager.go`: Game state management via NATS
- **ui/**: Templ-based UI components
  - `layouts/`: Base HTML layout
  - `pages/game/`: Main game interface
  - `components/`: Reusable UI components
- **assets/**: Static files (CSS, JS libraries)

## Integration with Slide Code
- Runs on port 3000 by default
- Can be embedded in Electron app via WebContentsView
- Players can write JavaScript bots to automate gameplay
- Game state persists via NATS JetStream

## Development Notes
- Uses air for hot reloading in development
- Templ files compile to Go code - run `make templ-generate` after changes
- NATS data stored in `data/nats/` directory
- Tailwind CSS compiled from `assets/css/input.css` to `output.css`