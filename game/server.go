package main

import (
	"embed"
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
	datastar "github.com/starfederation/datastar/sdk/go"
)

//go:embed assets
var assetsFS embed.FS

var gameManager *types.GameManager
var sseConnections sync.Map // [string]*datastar.ServerSentEventGenerator, key is playerID

func main() {
	gameManager = types.NewGameManager()
	gameManager.SetBroadcaster(broadcastGameState)

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

		p, _ := gameManager.GetPlayer(playerID)
		if p == nil {
			p = gameManager.AddPlayer(playerID, nil)
		}

		pages.GamePage(p, gameManager.State).Render(r.Context(), w)
	})

	router.Get("/api/sse", func(w http.ResponseWriter, r *http.Request) {
		playerID := r.URL.Query().Get("playerId")
		if playerID == "" {
			http.Error(w, "playerId is required", http.StatusBadRequest)
			return
		}

		sse := datastar.NewSSE(w, r)
		sseConnections.Store(playerID, sse)

		p, _ := gameManager.GetPlayer(playerID)
		if p == nil {
			p = gameManager.AddPlayer(playerID, sse)
		} else {
			player := p
			player.SSE = sse
			player.IsConnected = true
		}

		log.Printf("🔗 Player %s connected via SSE", playerID)

		<-r.Context().Done()

		gameManager.RemovePlayer(playerID)
		sseConnections.Delete(playerID)
		log.Printf("🔌 Player %s disconnected", playerID)
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

		success, err := gameManager.PlaceBit(playerID, x, y)
		if err != nil {
			log.Printf("❌ Action failed for player %s: %v", playerID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if success {
			log.Printf("✅ Player %s successfully placed bit at (%d, %d)", playerID, x, y)
			// Broadcast is now handled by the game manager's loop
		} else {
			log.Printf("🚫 Player %s action at (%d, %d) was not successful, but no error was returned.", playerID, x, y)
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Starting BitSplat: The Game server on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

// broadcastGameState sends the current game state to all connected clients
func broadcastGameState() {
	log.Printf("📡 Broadcasting game state to all connected clients")

	sseConnections.Range(func(key, value interface{}) bool {
		playerID := key.(string)
		sse := value.(*datastar.ServerSentEventGenerator)

		// Get the player
		player, team := gameManager.GetPlayer(playerID)
		if player != nil && player.IsConnected {
			// Send individual component updates
			gridHTML := pages.GridComponent(gameManager.State)
			sse.MergeFragmentTempl(gridHTML)

			playerHudHTML := pages.PlayerHUD(player, team)
			sse.MergeFragmentTempl(playerHudHTML)

			leaderboardHTML := pages.LeaderboardComponent(gameManager.State)
			sse.MergeFragmentTempl(leaderboardHTML)

			roundStatusHTML := pages.RoundStatusComponent(gameManager.State)
			sse.MergeFragmentTempl(roundStatusHTML)

			// --- Create a serializable game state for the client-side bot ---
			serializableGrid := make([][]string, types.GridHeight)
			for y := 0; y < types.GridHeight; y++ {
				serializableGrid[y] = make([]string, types.GridWidth)
				for x := 0; x < types.GridWidth; x++ {
					key := fmt.Sprintf("%d:%d", x, y)
					if cell, ok := gameManager.State.Grid.Load(key); ok {
						serializableGrid[y][x] = cell.(types.Cell).OwnerID
					} else {
						serializableGrid[y][x] = "neutral"
					}
				}
			}
			teamsInfo := make(map[string]map[string]interface{})
			for teamID, t := range gameManager.State.Teams {
				teamsInfo[teamID] = map[string]interface{}{
					"score": t.Score,
				}
			}
			clientGameState := map[string]interface{}{
				"grid":               serializableGrid,
				"teams":              teamsInfo,
				"roundState":         gameManager.State.RoundState,
				"roundTimeRemaining": int(gameManager.State.RoundTimeRemaining.Seconds()),
				"countdown":          int(gameManager.State.Countdown.Seconds()),
				"player": map[string]interface{}{
					"id":     player.ID,
					"bits":   player.Bits,
					"teamId": player.TeamID,
				},
			}

			// Send signal updates for reactive parts
			signals := map[string]interface{}{
				"bits":       player.Bits,
				"roundState": gameManager.State.RoundState,
				"roundTime":  int(gameManager.State.RoundTimeRemaining.Seconds()),
				"countdown":  int(gameManager.State.Countdown.Seconds()),
				"gameState":  clientGameState, // New signal for the bot
			}
			sse.MarshalAndMergeSignals(signals)

			// Dispatch a specific event for the bot with the game state
			if err := sse.DispatchCustomEvent("game:state:updated", clientGameState); err != nil {
				log.Printf("🚨 Error dispatching custom event to player %s: %v", playerID, err)
			}

			log.Printf("📤 Sent component updates to player %s", playerID)
		}

		return true
	})
}

func getPlayerID(w http.ResponseWriter, r *http.Request) (string, error) {
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
		gameManager.AddPlayer(playerID, nil)
		log.Printf("🆕 New player created: %s", playerID)
		return playerID, nil
	}
	if err != nil {
		return "", err
	}
	if p, _ := gameManager.GetPlayer(cookie.Value); p == nil {
		gameManager.AddPlayer(cookie.Value, nil)
		log.Printf("🔄 Existing player reconnected: %s", cookie.Value)
	}

	return cookie.Value, nil
}

func SetupAssetsRoutes(router chi.Router) {
	var isDevelopment = os.Getenv("GO_ENV") != "production"

	// Add progress.min.js to assets
	// You might need to run a command to generate this file from your templui components
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
