package types

import (
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	datastar "github.com/starfederation/datastar/sdk/go"
)

const (
	GridWidth         = 40
	GridHeight        = 25
	MaxBits           = 10
	BitsPerTick       = 1
	GameTickRate      = 4 * time.Second
	ActionCooldown    = 200 * time.Millisecond
	RoundDuration     = 3 * time.Minute
	PostRoundDelay    = 10 * time.Second
	PreRoundCountdown = 5 * time.Second
)

type RoundState string

const (
	Waiting    RoundState = "Waiting"
	InProgress RoundState = "In Progress"
	Finished   RoundState = "Finished"
)

// Team represents a team in the game.
type Team struct {
	ID            string
	Color         string
	Score         int
	Players       *sync.Map // [playerID]*Player
	ActivePlayers int
	IdlePlayers   int
	Percentage    float32
}

// Player represents a single player in the game.
type Player struct {
	ID          string    `json:"id"`
	TeamID      string    `json:"teamId"`
	Color       string    `json:"color"` // This is the team color
	Bits        int       `json:"bits"`
	LastAction  time.Time `json:"-"`
	SSE         *datastar.ServerSentEventGenerator
	IsConnected bool
}

// Cell represents a single cell on the game grid.
type Cell struct {
	OwnerID string `json:"ownerId"`
	Color   string `json:"color"`
}

// GameState holds the entire state of the game.
type GameState struct {
	Grid               *sync.Map        // [string]Cell, key is "x:y"
	Teams              map[string]*Team // [string]*Team, key is teamID
	RoundState         RoundState
	RoundTimeRemaining time.Duration
	Countdown          time.Duration
	Winner             *Team
}

// GameManager manages the game logic and player connections.
type GameManager struct {
	State     *GameState
	broadcast func()
	dirty     bool
	mu        sync.Mutex
}

// NewGameManager creates and initializes a new GameManager.
func NewGameManager() *GameManager {
	gm := &GameManager{
		State: &GameState{
			Grid:               new(sync.Map),
			Teams:              make(map[string]*Team),
			RoundState:         Waiting,
			RoundTimeRemaining: RoundDuration,
			Countdown:          PreRoundCountdown,
		},
	}
	gm.initTeams()
	gm.initGrid()
	go gm.gameLoop()
	log.Printf("🎮 Game manager initialized with %dx%d grid", GridWidth, GridHeight)
	return gm
}

// SetBroadcaster sets the function to be called to broadcast updates.
func (gm *GameManager) SetBroadcaster(b func()) {
	gm.broadcast = b
}

func (gm *GameManager) initTeams() {
	teamColors := []string{"#d500f9", "#00bcd4", "#e91e63", "#76ff03"} // Neon Ink, Bubblegum Blue, Octo Pop, Wasabi Wave
	teamNames := []string{"Glitchbyte", "Nullwave", "Overburn", "Voltcrash"}
	for i, name := range teamNames {
		gm.State.Teams[name] = &Team{
			ID:         name,
			Color:      teamColors[i],
			Score:      0,
			Players:    new(sync.Map),
			Percentage: 0,
		}
		log.Printf("🚩 Team %s created with color %s", name, teamColors[i])
	}
}

// initGrid initializes the grid with neutral cells.
func (gm *GameManager) initGrid() {
	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			key := fmt.Sprintf("%d:%d", x, y)
			gm.State.Grid.Store(key, Cell{OwnerID: "neutral", Color: "#374151"}) // Neutral color
		}
	}
	gm.State.Winner = nil
	log.Printf("🏗️ Grid initialized with %d cells", GridWidth*GridHeight)
}

// gameLoop is the main game loop for regenerating bits and broadcasting state.
func (gm *GameManager) gameLoop() {
	gameTicker := time.NewTicker(1 * time.Second)
	bitsTicker := time.NewTicker(GameTickRate)
	broadcastTicker := time.NewTicker(50 * time.Millisecond)
	defer gameTicker.Stop()
	defer bitsTicker.Stop()
	defer broadcastTicker.Stop()

	log.Printf("⚡ Starting game loop with 1s tick rate and 100ms broadcast rate")

	for {
		select {
		case <-gameTicker.C:
			gm.mu.Lock()
			switch gm.State.RoundState {
			case Waiting:
				gm.State.Countdown -= time.Second
				if gm.State.Countdown <= 0 {
					gm.State.RoundState = InProgress
					gm.State.RoundTimeRemaining = RoundDuration
					log.Printf("🏁 Round started!")
				}
			case InProgress:
				gm.State.RoundTimeRemaining -= time.Second
				if gm.State.RoundTimeRemaining <= 0 {
					gm.State.RoundState = Finished
					gm.State.Countdown = PostRoundDelay
					gm.determineWinner()
					if gm.State.Winner != nil {
						log.Printf("🏆 Round finished! Winner: %s", gm.State.Winner.ID)
					} else {
						log.Printf("🏆 Round finished! It's a draw!")
					}
				}
			case Finished:
				gm.State.Countdown -= time.Second
				if gm.State.Countdown <= 0 {
					gm.State.RoundState = Waiting
					gm.State.Countdown = PreRoundCountdown
					gm.resetGame()
					log.Printf("⏳ New round countdown started")
				}
			}
			gm.updateTeamPlayerCounts()
			gm.dirty = true
			gm.mu.Unlock()

		case <-bitsTicker.C:
			gm.mu.Lock()
			if gm.State.RoundState == InProgress {
				gm.regenerateBits()
				gm.dirty = true
			}
			gm.mu.Unlock()

		case <-broadcastTicker.C:
			gm.mu.Lock()
			if gm.dirty {
				if gm.broadcast != nil {
					gm.broadcast()
				}
				gm.dirty = false
			}
			gm.mu.Unlock()
		}
	}
}

// regenerateBits adds bits to all connected players.
func (gm *GameManager) regenerateBits() {
	// Assumes lock is already held
	regenerated := false
	playerCount := 0
	for _, team := range gm.State.Teams {
		team.Players.Range(func(key, value interface{}) bool {
			player := value.(*Player)
			if player.IsConnected && player.Bits < MaxBits {
				player.Bits += BitsPerTick
				if player.Bits > MaxBits {
					player.Bits = MaxBits
				}
				regenerated = true
			}
			playerCount++
			return true
		})
	}
	if playerCount > 0 && regenerated {
		// log.Printf("⚡ Bits regenerated for connected players")
	}
}

// GetPlayer finds a player by their ID across all teams.
func (gm *GameManager) GetPlayer(playerID string) (*Player, *Team) {
	for _, team := range gm.State.Teams {
		if p, ok := team.Players.Load(playerID); ok {
			return p.(*Player), team
		}
	}
	return nil, nil
}

// AddPlayer creates a new player and adds them to a team.
func (gm *GameManager) AddPlayer(playerID string, sse *datastar.ServerSentEventGenerator) *Player {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	// Check if player already exists
	if p, t := gm.GetPlayer(playerID); p != nil {
		p.SSE = sse
		p.IsConnected = true
		log.Printf("🔄 Player %s reconnected to team %s", playerID, t.ID)
		return p
	}

	// Assign to team with the fewest players
	var targetTeam *Team
	minPlayers := -1
	for _, team := range gm.State.Teams {
		count := 0
		team.Players.Range(func(k, v interface{}) bool {
			count++
			return true
		})
		if minPlayers == -1 || count < minPlayers {
			minPlayers = count
			targetTeam = team
		}
	}

	player := &Player{
		ID:          playerID,
		TeamID:      targetTeam.ID,
		Color:       targetTeam.Color,
		Bits:        MaxBits,
		LastAction:  time.Now().Add(-ActionCooldown),
		SSE:         sse,
		IsConnected: true,
	}

	targetTeam.Players.Store(playerID, player)
	log.Printf("🆕 New player %s added to team %s", playerID, targetTeam.ID)
	return player
}

// RemovePlayer marks a player as disconnected.
func (gm *GameManager) RemovePlayer(playerID string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if p, _ := gm.GetPlayer(playerID); p != nil {
		p.IsConnected = false
		log.Printf("👋 Player %s marked as disconnected", playerID)
	}
}

// PlaceBit allows a player to place a bit on the grid for their team.
func (gm *GameManager) PlaceBit(playerID string, x, y int) (bool, error) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	player, team := gm.GetPlayer(playerID)
	if player == nil {
		return false, fmt.Errorf("player not found")
	}

	if gm.State.RoundState != InProgress {
		return false, fmt.Errorf("can only place bits during a round")
	}

	key := fmt.Sprintf("%d:%d", x, y)
	var oldOwnerID string

	// Check if the cell is already owned by this player's team - do this BEFORE consuming bits
	if oldCell, ok := gm.State.Grid.Load(key); ok {
		oldOwnerID = oldCell.(Cell).OwnerID
		if oldOwnerID == team.ID {
			log.Printf("⚠️ Player %s clicked on their own team's cell at (%d, %d) - no action taken", playerID, x, y)
			// Don't consume bits, don't set cooldown, don't change anything
			return true, nil
		}
	}

	if player.Bits < 1 {
		log.Printf("⚡ Player %s has insufficient bits: %d", playerID, player.Bits)
		return false, fmt.Errorf("not enough bits")
	}
	if time.Since(player.LastAction) < ActionCooldown {
		log.Printf("⏱️ Player %s is on cooldown", playerID)
		return false, fmt.Errorf("action cooldown")
	}

	player.Bits--
	player.LastAction = time.Now()
	log.Printf("🎯 Player %s placed bit at (%d, %d), bits now: %d", playerID, x, y, player.Bits)

	// Place the new bit for the team
	gm.State.Grid.Store(key, Cell{OwnerID: team.ID, Color: team.Color})
	log.Printf("✅ Cell (%d, %d) now owned by team %s", x, y, team.ID)

	// Recalculate scores
	team.Score++
	if oldOwner, ok := gm.State.Teams[oldOwnerID]; ok {
		oldOwner.Score--
		if oldOwner.Score < 0 {
			oldOwner.Score = 0
		}
		oldOwner.Percentage = (float32(oldOwner.Score) * 100) / float32(GridWidth*GridHeight)
	}
	team.Percentage = (float32(team.Score) * 100) / float32(GridWidth*GridHeight)
	gm.logScores()

	gm.dirty = true
	return true, nil
}

// logScores logs the current scores of all teams.
func (gm *GameManager) logScores() {
	scores := ""
	for _, team := range gm.State.Teams {
		scores += fmt.Sprintf("%s: %d, ", team.ID, team.Score)
	}
	log.Printf("📊 Scores: %s", scores)
}

func (gm *GameManager) updateTeamPlayerCounts() {
	// Assumes lock is already held
	for _, team := range gm.State.Teams {
		active, idle := 0, 0
		team.Players.Range(func(key, value interface{}) bool {
			player := value.(*Player)
			if player.IsConnected {
				active++
			} else {
				idle++
			}
			return true
		})
		team.ActivePlayers = active
		team.IdlePlayers = idle
	}
}

func (gm *GameManager) determineWinner() {
	var winningTeam *Team
	maxScore := -1
	var topTeams []*Team

	for _, team := range gm.State.Teams {
		if team.Score > maxScore {
			maxScore = team.Score
			topTeams = []*Team{team}
		} else if team.Score == maxScore {
			topTeams = append(topTeams, team)
		}
	}

	if len(topTeams) == 1 {
		winningTeam = topTeams[0]
	} else if len(topTeams) > 1 {
		// Tie-breaker: alphabetical order
		sort.Slice(topTeams, func(i, j int) bool {
			return topTeams[i].ID < topTeams[j].ID
		})
		winningTeam = topTeams[0]
	}
	// If no teams have score > -1 (e.g. all 0), winner could be nil.
	// Let's pick the first team in that case of a complete tie.
	if winningTeam == nil && len(gm.State.Teams) > 0 {
		// Just grab one to prevent nil pointer
		for _, team := range gm.State.Teams {
			winningTeam = team
			break
		}
	}
	gm.State.Winner = winningTeam
}

func (gm *GameManager) resetGame() {
	gm.initGrid()
	for _, team := range gm.State.Teams {
		team.Score = 0
		team.Percentage = 0
		team.Players.Range(func(key, value interface{}) bool {
			player := value.(*Player)
			player.Bits = MaxBits
			return true
		})
	}
	log.Println("🔄 Game has been reset for the new round")
}

// recalculateScores updates scores for all players.
// This is now less efficient than incremental updates, keeping for posterity, but PlaceBit handles it.
func (gm *GameManager) recalculateScores() {
	// Reset team scores
	for _, team := range gm.State.Teams {
		team.Score = 0
	}

	gm.State.Grid.Range(func(key, value interface{}) bool {
		cell := value.(Cell)
		if team, ok := gm.State.Teams[cell.OwnerID]; ok {
			team.Score++
		}
		return true
	})
	gm.logScores()
}

// Broadcasts will be added here to send updates to clients
func (gm *GameManager) BroadcastFullState() {
	// This will be implemented in server.go
	log.Printf("📡 BroadcastFullState called (implemented in server.go)")
}

func (gm *GameManager) broadcastPlayerUpdate(player *Player) {
	// This will be implemented in server.go
	// For now, just log that an update should be sent
	log.Printf("📤 Should broadcast update for player %s (score: %d, bits: %d)", player.ID, gm.State.Teams[player.TeamID].Score, player.Bits)
}
