# BitSplat Game Server

A multiplayer grid conquest game built with Go, Templ, and Datastar. Players compete to control territory on a shared grid, with support for JavaScript bot automation.

## Quick Start

### Prerequisites
- Go 1.24.3 or higher

### Setup & Run

1. **Install dependencies and tools:**
   ```bash
   make setup
   ```

2. **Start development server:**
   ```bash
   make dev
   ```

3. **Open your browser:**
   - Game: http://localhost:3000

## Development Commands

```bash
make setup           # Install tools and dependencies
make dev             # Start development with hot reload
make templ-generate  # Generate templ files
make build           # Build production binary
make run             # Run without hot reload
make clean           # Clean build artifacts
```

## Tech Stack

- **Go**: Server and game logic
- **Templ**: Type-safe HTML templating
- **Datastar**: Real-time frontend reactivity
- **NATS.io**: Message queue for real-time updates
- **Tailwind CSS**: Styling

## How It Works

Players can:
- Click on grid cells to claim territory
- Write JavaScript bots to automate gameplay
- Compete in real-time with other players
- Track team scores and statistics

The game integrates with the main Slide Code application via webview for seamless bot scripting. 