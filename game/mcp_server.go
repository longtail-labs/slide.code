package main

import (
	"context"
	"fmt"

	"server/types"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// MCPGameServer wraps the MCP server with game-specific functionality
type MCPGameServer struct {
	mcpServer   *server.MCPServer
	gameManager types.NATSManager
}

// NewMCPGameServer creates a new MCP server for the BitSplat game
func NewMCPGameServer(gameManager types.NATSManager) *MCPGameServer {
	mcpServer := server.NewMCPServer(
		"BitSplat Game Server",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithResourceCapabilities(true, false),
		server.WithLogging(),
		server.WithRecovery(),
	)

	gameServer := &MCPGameServer{
		mcpServer:   mcpServer,
		gameManager: gameManager,
	}

	// Add game tools
	gameServer.setupGameTools()
	gameServer.setupGameResources()

	return gameServer
}

// GetMCPServer returns the underlying MCP server
func (gs *MCPGameServer) GetMCPServer() *server.MCPServer {
	return gs.mcpServer
}

// setupGameTools configures all the game-related MCP tools
func (gs *MCPGameServer) setupGameTools() {
	// Place Bit Tool
	placeBitTool := mcp.NewTool("place_bit",
		mcp.WithDescription("Place a bit on the game grid for a specific user"),
		mcp.WithString("user_id",
			mcp.Required(),
			mcp.Description("The ID of the user placing the bit"),
		),
		mcp.WithNumber("x",
			mcp.Required(),
			mcp.Description("X coordinate on the grid (0-based)"),
		),
		mcp.WithNumber("y",
			mcp.Required(),
			mcp.Description("Y coordinate on the grid (0-based)"),
		),
	)
	gs.mcpServer.AddTool(placeBitTool, gs.handlePlaceBit)

	// Get Game State Tool
	getStateTool := mcp.NewTool("get_game_state",
		mcp.WithDescription("Get the current game state including grid, teams, and round information"),
	)
	gs.mcpServer.AddTool(getStateTool, gs.handleGetGameState)

	// Get Player State Tool
	getPlayerTool := mcp.NewTool("get_player_state",
		mcp.WithDescription("Get the state of a specific player"),
		mcp.WithString("user_id",
			mcp.Required(),
			mcp.Description("The ID of the user to get state for"),
		),
	)
	gs.mcpServer.AddTool(getPlayerTool, gs.handleGetPlayerState)

	// Add Player Tool
	addPlayerTool := mcp.NewTool("add_player",
		mcp.WithDescription("Add a new player to the game"),
		mcp.WithString("user_id",
			mcp.Required(),
			mcp.Description("The ID of the user to add"),
		),
	)
	gs.mcpServer.AddTool(addPlayerTool, gs.handleAddPlayer)

	// Get Team Info Tool
	getTeamTool := mcp.NewTool("get_team_info",
		mcp.WithDescription("Get information about all teams"),
	)
	gs.mcpServer.AddTool(getTeamTool, gs.handleGetTeamInfo)
}

// setupGameResources configures game-related MCP resources
func (gs *MCPGameServer) setupGameResources() {
	// Game State Resource
	gameStateResource := mcp.NewResource("game://state",
		"Current Game State",
		mcp.WithMIMEType("application/json"),
	)
	gs.mcpServer.AddResource(gameStateResource, gs.handleGameStateResource)
}

// Tool Handlers

func (gs *MCPGameServer) handlePlaceBit(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID, err := request.RequireString("user_id")
	if err != nil {
		return mcp.NewToolResultError("user_id is required"), nil
	}

	x, err := request.RequireFloat("x")
	if err != nil {
		return mcp.NewToolResultError("x coordinate is required"), nil
	}

	y, err := request.RequireFloat("y")
	if err != nil {
		return mcp.NewToolResultError("y coordinate is required"), nil
	}

	// Ensure player exists
	if player, _ := gs.gameManager.GetPlayer(userID); player == nil {
		_, err := gs.gameManager.AddPlayer(userID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to add player: %v", err)), nil
		}
	}

	// Place the bit
	success, err := gs.gameManager.PlaceBit(userID, int(x), int(y))
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to place bit: %v", err)), nil
	}

	if success {
		return mcp.NewToolResultText(fmt.Sprintf("✅ Successfully placed bit at (%d, %d) for user %s", int(x), int(y), userID)), nil
	} else {
		return mcp.NewToolResultText(fmt.Sprintf("⚠️ Bit placement at (%d, %d) was not successful for user %s", int(x), int(y), userID)), nil
	}
}

func (gs *MCPGameServer) handleGetGameState(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	gameState, err := gs.gameManager.GetGameState()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get game state: %v", err)), nil
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("🎮 Current Game State:\n- Round: %s\n- Time Remaining: %v\n- Teams: %d\n- Grid Size: %dx%d",
					gameState.RoundState,
					gameState.RoundTimeRemaining,
					len(gameState.Teams),
					types.GridWidth,
					types.GridHeight),
			},
		},
	}, nil
}

func (gs *MCPGameServer) handleGetPlayerState(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID, err := request.RequireString("user_id")
	if err != nil {
		return mcp.NewToolResultError("user_id is required"), nil
	}

	player, team := gs.gameManager.GetPlayer(userID)
	if player == nil {
		return mcp.NewToolResultError(fmt.Sprintf("Player %s not found", userID)), nil
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("👤 Player %s:\n- Team: %s (%s)\n- Bits: %d\n- Connected: %v",
					player.ID,
					team.ID,
					team.Color,
					player.Bits,
					player.IsConnected),
			},
		},
	}, nil
}

func (gs *MCPGameServer) handleAddPlayer(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID, err := request.RequireString("user_id")
	if err != nil {
		return mcp.NewToolResultError("user_id is required"), nil
	}

	player, err := gs.gameManager.AddPlayer(userID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to add player: %v", err)), nil
	}

	return mcp.NewToolResultText(fmt.Sprintf("✅ Added player %s to team %s", player.ID, player.TeamID)), nil
}

func (gs *MCPGameServer) handleGetTeamInfo(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	gameState, err := gs.gameManager.GetGameState()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get game state: %v", err)), nil
	}

	teamInfo := "🏆 Team Information:\n\n"
	teams := make([]map[string]interface{}, 0, len(gameState.Teams))

	for _, team := range gameState.Teams {
		teamInfo += fmt.Sprintf("Team %s (%s):\n- Score: %d (%.1f%%)\n- Active Players: %d\n- Idle Players: %d\n\n",
			team.ID, team.Color, team.Score, team.Percentage, team.ActivePlayers, team.IdlePlayers)

		teams = append(teams, map[string]interface{}{
			"id":            team.ID,
			"color":         team.Color,
			"score":         team.Score,
			"percentage":    team.Percentage,
			"activePlayers": team.ActivePlayers,
			"idlePlayers":   team.IdlePlayers,
		})
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: teamInfo,
			},
		},
	}, nil
}

// Resource Handlers

func (gs *MCPGameServer) handleGameStateResource(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	gameState, err := gs.gameManager.GetGameState()
	if err != nil {
		return nil, fmt.Errorf("failed to get game state: %w", err)
	}

	serializableState := gs.convertGameStateToSerializable(gameState)

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      "game://state",
			MIMEType: "application/json",
			Text:     fmt.Sprintf("%+v", serializableState),
		},
	}, nil
}

// Helper Methods

func (gs *MCPGameServer) convertGameStateToSerializable(gameState *types.GameState) map[string]interface{} {
	// Convert grid
	grid := make([][]string, types.GridHeight)
	for y := 0; y < types.GridHeight; y++ {
		grid[y] = make([]string, types.GridWidth)
		for x := 0; x < types.GridWidth; x++ {
			key := fmt.Sprintf("%d:%d", x, y)
			if cell, ok := gameState.Grid.Load(key); ok {
				grid[y][x] = cell.(types.Cell).OwnerID
			} else {
				grid[y][x] = "neutral"
			}
		}
	}

	// Convert teams
	teams := make(map[string]interface{})
	for id, team := range gameState.Teams {
		players := make([]map[string]interface{}, 0)
		team.Players.Range(func(key, value interface{}) bool {
			player := value.(*types.Player)
			players = append(players, map[string]interface{}{
				"id":          player.ID,
				"teamId":      player.TeamID,
				"color":       player.Color,
				"bits":        player.Bits,
				"isConnected": player.IsConnected,
			})
			return true
		})

		teams[id] = map[string]interface{}{
			"id":            team.ID,
			"color":         team.Color,
			"score":         team.Score,
			"percentage":    team.Percentage,
			"activePlayers": team.ActivePlayers,
			"idlePlayers":   team.IdlePlayers,
			"players":       players,
		}
	}

	var winner map[string]interface{}
	if gameState.Winner != nil {
		winner = map[string]interface{}{
			"id":    gameState.Winner.ID,
			"color": gameState.Winner.Color,
			"score": gameState.Winner.Score,
		}
	}

	return map[string]interface{}{
		"grid":               grid,
		"teams":              teams,
		"roundState":         string(gameState.RoundState),
		"roundTimeRemaining": gameState.RoundTimeRemaining.Seconds(),
		"countdown":          gameState.Countdown.Seconds(),
		"winner":             winner,
		"dimensions": map[string]int{
			"width":  types.GridWidth,
			"height": types.GridHeight,
		},
	}
}
