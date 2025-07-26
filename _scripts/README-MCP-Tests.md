# BitSplat MCP Testing Scripts

This directory contains test scripts for the BitSplat game's MCP (Model Context Protocol) SSE server integration.

## Overview

The BitSplat game server now supports MCP over SSE (Server-Sent Events), providing real-time game interaction capabilities through the Claude Code SDK and direct MCP clients.

## Test Scripts

### 1. `test-mcp-bitsplat.ts` - Claude Code SDK Test

Tests the MCP server using the official Claude Code SDK with SSE transport.

**Usage:**
```bash
npm run test:mcp:claude
```

This script:
- Configures Claude Code to connect to the BitSplat MCP SSE server
- Uses Claude to interact with the game through MCP tools
- Tests game state retrieval, player management, and bit placement

### 2. `test-mcp-direct.ts` - Direct SSE Test

Tests the MCP SSE endpoints directly without the Claude Code SDK.

**Usage:**
```bash
npm run test:mcp:direct
```

This script:
- Connects directly to the SSE endpoint
- Sends raw JSON-RPC MCP messages
- Tests all available game tools individually

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the BitSplat game server:**
   ```bash
   cd game
   go run .
   ```
   The server should be running on `http://localhost:3000`

3. **Verify MCP endpoints are available:**
   ```bash
   curl http://localhost:3000/mcp
   ```

## Available MCP Tools

The BitSplat MCP server provides these tools:

- **`place_bit`** - Place a bit on the game grid
  - Parameters: `user_id`, `x`, `y`
  
- **`get_game_state`** - Get current game state including grid and teams
  - No parameters required
  
- **`get_player_state`** - Get state of a specific player
  - Parameters: `user_id`
  
- **`add_player`** - Add a new player to the game
  - Parameters: `user_id`
  
- **`get_team_info`** - Get information about all teams
  - No parameters required

## MCP Resources

- **`game://state`** - Current game state as JSON resource

## Endpoints

- **SSE Endpoint:** `http://localhost:3000/mcp/sse`
- **Message Endpoint:** `http://localhost:3000/mcp/message`
- **Info Endpoint:** `http://localhost:3000/mcp`

## Game Server Integration

The MCP server is integrated with the same NATS-backed game state as the web interface, ensuring:

- Real-time synchronization between web players and MCP clients
- Consistent game state across all interfaces
- Team assignment and bit placement rules apply to both interfaces

## Troubleshooting

1. **Connection Issues:**
   - Ensure the game server is running on port 3000
   - Check that no firewall is blocking the connection
   - Verify the server logs show MCP endpoints are mounted

2. **Tool Call Failures:**
   - Check that players are properly added before placing bits
   - Verify coordinates are within grid bounds (0-49 for x and y)
   - Ensure the game round is in progress for bit placement

3. **SSE Connection Problems:**
   - Browser: Check developer console for SSE errors
   - Node.js: Ensure `eventsource` package is installed

## Example MCP Configuration for Claude Desktop

To use the BitSplat MCP server with Claude Desktop, add this to your MCP configuration:

```json
{
  "mcpServers": {
    "bitsplat-game": {
      "type": "sse",
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
``` 