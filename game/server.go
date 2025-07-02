package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"server/types"
	pages "server/ui/pages/game"
	"strconv"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/server"
	datastar "github.com/starfederation/datastar/sdk/go"
)

//go:embed assets
var assetsFS embed.FS

// Global NATS-enhanced game manager
var natsGameManager types.NATSManager

// Global MCP game server
var mcpGameServer *MCPGameServer

// Global MCP SSE server
var mcpSSEServer *server.SSEServer

func main() {
	ctx := context.Background()

	// Initialize NATS-enhanced game manager
	config := types.DefaultNATSConfig()
	var err error
	natsGameManager, err = types.NewNATSGameManager(ctx, config)
	if err != nil {
		log.Fatalf("❌ Failed to create NATS game manager: %v", err)
	}

	// Start the game manager
	if err := natsGameManager.Start(); err != nil {
		log.Fatalf("❌ Failed to start NATS game manager: %v", err)
	}
	defer natsGameManager.Stop()

	// Initialize MCP server
	mcpGameServer = NewMCPGameServer(natsGameManager)
	log.Printf("🎮 MCP server initialized with game tools")

	// Get port for MCP SSE server configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Initialize MCP SSE server
	mcpSSEServer = server.NewSSEServer(
		mcpGameServer.GetMCPServer(),
		server.WithBaseURL(fmt.Sprintf("http://localhost:%s", port)),
		server.WithStaticBasePath("/mcp"),
		server.WithSSEEndpoint("/sse"),
		server.WithMessageEndpoint("/message"),
		server.WithKeepAlive(true),
	)

	router := chi.NewRouter()

	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
	}))

	SetupAssetsRoutes(router)

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		playerID, err := getPlayerID(w, r)
		if err != nil {
			http.Error(w, "Failed to get player ID", http.StatusInternalServerError)
			return
		}

		// Get or add player using NATS manager
		player, _ := natsGameManager.GetPlayer(playerID)
		if player == nil {
			player, err = natsGameManager.AddPlayer(playerID)
			if err != nil {
				log.Printf("❌ Failed to add player: %v", err)
				http.Error(w, "Failed to add player", http.StatusInternalServerError)
				return
			}
		}

		// Get current game state
		gameState, err := natsGameManager.GetGameState()
		if err != nil {
			log.Printf("❌ Failed to get game state: %v", err)
			http.Error(w, "Failed to get game state", http.StatusInternalServerError)
			return
		}

		pages.GamePage(player, gameState).Render(r.Context(), w)
	})

	router.Get("/api/sse", func(w http.ResponseWriter, r *http.Request) {
		playerID := r.URL.Query().Get("playerId")
		if playerID == "" {
			http.Error(w, "playerId is required", http.StatusBadRequest)
			return
		}

		sse := datastar.NewSSE(w, r)

		// Add or reconnect player. This will set IsConnected = true.
		if _, err := natsGameManager.AddPlayer(playerID); err != nil {
			log.Printf("❌ Failed to add or reconnect player: %v", err)
			http.Error(w, "Failed to add player", http.StatusInternalServerError)
			return
		}

		log.Printf("🔗 Player %s connected via SSE", playerID)

		// Watch game state changes from NATS KV store
		watcher, err := natsGameManager.WatchGameState()
		if err != nil {
			log.Printf("❌ Failed to create game state watcher: %v", err)
			http.Error(w, "Failed to watch game state", http.StatusInternalServerError)
			return
		}
		defer watcher.Stop()

		// Send initial game state
		gameState, err := natsGameManager.GetGameState()
		if err == nil {
			sendGameStateUpdate(sse, gameState, playerID)
		}

		// Listen for context cancellation and game state updates
		for {
			select {
			case <-r.Context().Done():
				natsGameManager.SetPlayerIdle(playerID)
				log.Printf("🔌 Player %s disconnected, marked as idle", playerID)
				return

			case entry := <-watcher.Updates():
				if entry == nil {
					continue
				}

				// Parse game state from KV entry
				var snapshot types.GameStateSnapshot
				if err := json.Unmarshal(entry.Value(), &snapshot); err != nil {
					log.Printf("❌ Failed to unmarshal game state: %v", err)
					continue
				}

				// Convert snapshot back to GameState for rendering
				gameState := convertSnapshotToGameState(&snapshot)
				sendGameStateUpdate(sse, gameState, playerID)
			}
		}
	})

	router.Post("/action", func(w http.ResponseWriter, r *http.Request) {
		playerID, err := getPlayerID(w, r)
		if err != nil {
			log.Printf("❌ Failed to get player ID: %v", err)
			http.Error(w, "Failed to get player ID", http.StatusInternalServerError)
			return
		}

		x, _ := strconv.Atoi(r.URL.Query().Get("x"))
		y, _ := strconv.Atoi(r.URL.Query().Get("y"))

		log.Printf("🎮 Player %s attempting to place bit at (%d, %d)", playerID, x, y)

		// Use NATS manager to place bit
		success, err := natsGameManager.PlaceBit(playerID, x, y)
		if err != nil {
			log.Printf("❌ Action failed for player %s: %v", playerID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if success {
			log.Printf("✅ Player %s successfully placed bit at (%d, %d)", playerID, x, y)
		} else {
			log.Printf("🚫 Player %s action at (%d, %d) was not successful", playerID, x, y)
		}
	})

	// Player status endpoints
	router.Post("/api/player/{playerID}/active", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔄 Setting player %s active", chi.URLParam(r, "playerID"))
		playerID := chi.URLParam(r, "playerID")
		if err := natsGameManager.SetPlayerActive(playerID); err != nil {
			http.Error(w, "Failed to set player active", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	router.Post("/api/player/{playerID}/idle", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔄 Setting player %s idle", chi.URLParam(r, "playerID"))
		playerID := chi.URLParam(r, "playerID")
		if err := natsGameManager.SetPlayerIdle(playerID); err != nil {
			http.Error(w, "Failed to set player idle", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	// Mount MCP SSE endpoints
	router.Handle("/mcp/sse", mcpSSEServer.SSEHandler())
	router.Handle("/mcp/message", mcpSSEServer.MessageHandler())

	// MCP info endpoint
	router.Get("/mcp", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"name":        "BitSplat Game Server",
			"version":     "1.0.0",
			"description": "MCP server for BitSplat game with NATS backend",
			"transport":   "sse",
			"endpoints": map[string]string{
				"sse":     fmt.Sprintf("http://localhost:%s/mcp/sse", port),
				"message": fmt.Sprintf("http://localhost:%s/mcp/message", port),
			},
			"tools": []string{
				"place_bit",
				"get_game_state",
				"get_player_state",
				"add_player",
				"get_team_info",
			},
			"resources": []string{
				"game://state",
			},
		}
		json.NewEncoder(w).Encode(response)
	})

	log.Printf("🚀 Starting BitSplat: The Game server with NATS + MCP on http://localhost:%s", port)
	log.Printf("🎮 MCP SSE endpoint: http://localhost:%s/mcp/sse", port)
	log.Printf("🎮 MCP message endpoint: http://localhost:%s/mcp/message", port)
	log.Printf("🎮 MCP tools available: place_bit, get_game_state, get_player_state, add_player, get_team_info")
	log.Fatal(http.ListenAndServe(":"+port, router))
}

// sendGameStateUpdate sends game state updates to a specific player via SSE
func sendGameStateUpdate(sse *datastar.ServerSentEventGenerator, gameState *types.GameState, playerID string) {
	log.Printf("🔄 Sending game state update to player %s", playerID)

	// Get the specific player and team from NATS manager (source of truth)
	player, team := natsGameManager.GetPlayer(playerID)
	if player == nil {
		log.Printf("⚠️ Player %s not found in NATS manager", playerID)
		return
	}

	// Send individual component updates
	gridHTML := pages.GridComponent(gameState)
	sse.MergeFragmentTempl(gridHTML)

	playerHudHTML := pages.PlayerHUD(player, team)
	sse.MergeFragmentTempl(playerHudHTML)

	leaderboardHTML := pages.LeaderboardComponent(gameState)
	sse.MergeFragmentTempl(leaderboardHTML)

	roundStatusHTML := pages.RoundStatusComponent(gameState)
	sse.MergeFragmentTempl(roundStatusHTML)

	// Create serializable game state for client-side bot
	serializableGrid := make([][]string, types.GridHeight)
	for y := 0; y < types.GridHeight; y++ {
		serializableGrid[y] = make([]string, types.GridWidth)
		for x := 0; x < types.GridWidth; x++ {
			key := fmt.Sprintf("%d:%d", x, y)
			if cell, ok := gameState.Grid.Load(key); ok {
				serializableGrid[y][x] = cell.(types.Cell).OwnerID
			} else {
				serializableGrid[y][x] = "neutral"
			}
		}
	}

	teamsInfo := make(map[string]map[string]interface{})
	for teamID, t := range gameState.Teams {
		teamsInfo[teamID] = map[string]interface{}{
			"score": t.Score,
		}
	}

	clientGameState := map[string]interface{}{
		"grid":               serializableGrid,
		"teams":              teamsInfo,
		"roundState":         gameState.RoundState,
		"roundTimeRemaining": int(gameState.RoundTimeRemaining.Seconds()),
		"countdown":          int(gameState.Countdown.Seconds()),
		"player": map[string]interface{}{
			"id":     player.ID,
			"bits":   player.Bits,
			"teamId": player.TeamID,
		},
	}

	// Send signal updates for reactive parts
	signals := map[string]interface{}{
		"bits":       player.Bits,
		"roundState": gameState.RoundState,
		"roundTime":  int(gameState.RoundTimeRemaining.Seconds()),
		"countdown":  int(gameState.Countdown.Seconds()),
		"gameState":  clientGameState,
	}
	sse.MarshalAndMergeSignals(signals)

	// Dispatch custom event for the bot
	if err := sse.DispatchCustomEvent("game:state:updated", clientGameState); err != nil {
		log.Printf("🚨 Error dispatching custom event to player %s: %v", playerID, err)
	}

	log.Printf("📤 Sent component updates to player %s", playerID)
}

// convertSnapshotToGameState converts a GameStateSnapshot back to GameState
func convertSnapshotToGameState(snapshot *types.GameStateSnapshot) *types.GameState {
	gameState := &types.GameState{
		Grid:               new(sync.Map),
		Teams:              snapshot.Teams,
		RoundState:         snapshot.RoundState,
		RoundTimeRemaining: snapshot.RoundTimeRemaining,
		Countdown:          snapshot.Countdown,
		Winner:             snapshot.Winner,
	}

	// Convert grid map back to sync.Map
	for key, cell := range snapshot.Grid {
		gameState.Grid.Store(key, cell)
	}

	return gameState
}

// getPlayerFromState finds a player in the game state
func getPlayerFromState(gameState *types.GameState, playerID string) (*types.Player, *types.Team) {
	for _, team := range gameState.Teams {
		if p, ok := team.Players.Load(playerID); ok {
			return p.(*types.Player), team
		}
	}
	return nil, nil
}

func getPlayerID(w http.ResponseWriter, r *http.Request) (string, error) {
	// First, check for userId in URL parameters (for webview and MCP integration)
	if userID := r.URL.Query().Get("userId"); userID != "" {
		log.Printf("🆔 Using URL parameter user ID: %s", userID)
		return userID, nil
	}

	// Fallback to cookie-based ID for direct browser access
	cookie, err := r.Cookie("player_id")
	if err == http.ErrNoCookie {
		playerID := uuid.New().String()[:8]
		http.SetCookie(w, &http.Cookie{
			Name:     "player_id",
			Value:    playerID,
			Path:     "/",
			HttpOnly: true,
			MaxAge:   60 * 60 * 24 * 365, // 1 year
		})
		log.Printf("🆕 New player created: %s", playerID)
		return playerID, nil
	}
	if err != nil {
		return "", err
	}

	log.Printf("🆔 Using cookie-based user ID: %s", cookie.Value)
	return cookie.Value, nil
}

func SetupAssetsRoutes(router chi.Router) {
	var isDevelopment = os.Getenv("GO_ENV") != "production"

	assetsSubFS, err := fs.Sub(assetsFS, "assets")
	if err != nil {
		log.Fatal("Failed to create assets sub-filesystem:", err)
	}

	assetHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isDevelopment {
			w.Header().Set("Cache-control", "no-store")
		} else {
			w.Header().Set("Cache-control", "public, max-age=86400")
		}

		ext := filepath.Ext(r.URL.Path)
		switch ext {
		case ".css":
			w.Header().Set("Content-Type", "text/css")
		case ".js":
			w.Header().Set("Content-Type", "application/javascript")
		case ".js.map":
			w.Header().Set("Content-Type", "application/json")
		}

		fs := http.FileServer(http.FS(assetsSubFS))
		fs.ServeHTTP(w, r)
	})

	router.Handle("/assets/*", http.StripPrefix("/assets", assetHandler))
}
