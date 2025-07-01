# AI Chat Bot - Datastar + Templ + Chi

A real-time chat bot application built with:
- **Go Chi** - Lightweight HTTP router
- **Templ** - Type-safe HTML templating
- **Datastar** - Real-time reactivity
- **Hot Reloading** - Development experience

## Features

- 🤖 AI-powered chat responses
- ⚡ Real-time streaming responses
- 🎨 Beautiful, modern UI
- 🔄 Hot reloading for development
- 📱 Responsive design
- ✨ Smooth typing animations

## Quick Start

### Prerequisites

- Go 1.24.3 or higher
- Make (optional, for convenience commands)

### Setup

1. **Install dependencies and tools:**
   ```bash
   make setup
   ```

2. **Start development server with hot reloading:**
   ```bash
   make dev
   ```

3. **Open your browser:**
   - Main app: http://localhost:3000
   - Hot reload proxy: http://localhost:7331

### Alternative Development Options

**Option 1: Using Air (recommended)**
```bash
make dev
```

**Option 2: Using Templ's built-in watch**
```bash
make dev-templ
```

**Option 3: Manual run**
```bash
make run
```

## Development Commands

```bash
# One-time setup
make setup

# Start development with hot reload
make dev

# Generate templ files only
make templ-generate

# Build the application
make build

# Run without hot reload
make run

# Clean generated files
make clean
```

## How It Works

### Hot Reloading

The application supports two hot reloading approaches:

1. **Air** - Monitors file changes and rebuilds/restarts the server
2. **Templ Watch** - Built-in templ file watching with proxy

Both approaches provide:
- Automatic template regeneration when `.templ` files change
- Server restart when `.go` files change
- Browser auto-refresh via proxy

### File Structure

```
apps/server/
├── server.go          # Main Chi server
├── templates.templ    # Templ templates
├── .air.toml         # Air configuration
├── Makefile          # Development commands
├── go.mod            # Go dependencies
└── README.md         # This file
```

### Architecture

- **Chi** handles HTTP routing and middleware
- **Templ** generates type-safe HTML templates
- **Datastar** provides real-time reactivity via SSE
- **Hot reload** proxy injects auto-refresh JavaScript

## Chat Features

The chat bot includes:

- Keyword-based responses (hello, help, weather, etc.)
- Streaming word-by-word responses
- Typing indicators
- Message history
- Responsive design

## Customization

### Adding New Bot Responses

Edit the `generateResponse` function in `server.go`:

```go
responses := map[string]string{
    "your_keyword": "Your custom response",
    // ... existing responses
}
```

### Styling

Modify the CSS in `templates.templ` within the `<style>` block.

### Templates

Add new templ components in `templates.templ` or create new `.templ` files.

## Production Build

```bash
make build
./bin/server
```

## Troubleshooting

### Port Already in Use
If port 3000 is busy, change it in `server.go`:
```go
log.Fatal(http.ListenAndServe(":8080", router)) // Change to your preferred port
```

### Templ Generation Issues
```bash
make clean
make templ-generate
```

### Dependencies Issues
```bash
go mod tidy
make deps
```

## Learn More

- [Chi Documentation](https://go-chi.io/)
- [Templ Documentation](https://templ.guide/)
- [Datastar Documentation](https://data-star.dev/)
- [Air Documentation](https://github.com/air-verse/air) 