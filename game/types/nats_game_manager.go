package types

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/delaneyj/toolbelt/embeddednats"
	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// NATSGameManager implements NATSManager interface
type NATSGameManager struct {
	// NATS components
	ns *embeddednats.Server
	nc *nats.Conn
	js jetstream.JetStream
	kv jetstream.KeyValue

	// Game configuration
	config *NATSConfig
	ctx    context.Context
	cancel context.CancelFunc

	// Local state cache (for performance)
	stateMu sync.RWMutex
	state   *GameState

	// Game loop management
	gameLoopDone chan struct{}

	// Event handlers
	eventSubscriptions []*nats.Subscription
}

// NewNATSGameManager creates a new NATS-enhanced game manager
func NewNATSGameManager(ctx context.Context, config *NATSConfig) (*NATSGameManager, error) {
	if config == nil {
		config = DefaultNATSConfig()
	}

	gm := &NATSGameManager{
		config:       config,
		gameLoopDone: make(chan struct{}),
	}

	gm.ctx, gm.cancel = context.WithCancel(ctx)

	// Initialize NATS
	if err := gm.initNATS(); err != nil {
		return nil, fmt.Errorf("failed to initialize NATS: %w", err)
	}

	// Initialize game state
	if err := gm.initGameState(); err != nil {
		return nil, fmt.Errorf("failed to initialize game state: %w", err)
	}

	log.Printf("🎮 NATS Game Manager initialized")
	return gm, nil
}

// initNATS sets up the embedded NATS server and connections
func (gm *NATSGameManager) initNATS() error {
	var err error

	// Create embedded NATS server
	natsOptions := &server.Options{
		JetStream: true,
		Port:      gm.config.Port,
		StoreDir:  gm.config.DataDir,
		NoSigs:    true,
	}

	gm.ns, err = embeddednats.New(gm.ctx, embeddednats.WithNATSServerOptions(natsOptions))
	if err != nil {
		return fmt.Errorf("failed to create NATS server: %w", err)
	}

	gm.ns.WaitForServer()
	log.Printf("🚀 NATS server started on %s", gm.ns.NatsServer.ClientURL())

	// Connect to NATS
	gm.nc, err = gm.ns.Client()
	if err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Initialize JetStream
	gm.js, err = jetstream.New(gm.nc)
	if err != nil {
		return fmt.Errorf("failed to create JetStream: %w", err)
	}

	// Create KV store for game state
	gm.kv, err = gm.js.CreateOrUpdateKeyValue(gm.ctx, jetstream.KeyValueConfig{
		Bucket:      KVGameState,
		Description: "BitSplat Game State",
		Compression: true,
		TTL:         gm.config.MaxAge,
		MaxBytes:    gm.config.MaxBytes,
	})
	if err != nil {
		return fmt.Errorf("failed to create KV store: %w", err)
	}

	// Create game events stream
	_, err = gm.js.CreateOrUpdateStream(gm.ctx, jetstream.StreamConfig{
		Name:        StreamGameEvents,
		Description: "BitSplat Game Events",
		Subjects:    []string{"game.>"},
		Retention:   jetstream.LimitsPolicy,
		MaxAge:      gm.config.MaxAge,
		MaxBytes:    gm.config.MaxBytes,
		Replicas:    gm.config.Replicas,
	})
	if err != nil {
		return fmt.Errorf("failed to create game events stream: %w", err)
	}

	log.Printf("📦 NATS JetStream and KV store initialized")
	return nil
}

// initGameState initializes the game state
func (gm *NATSGameManager) initGameState() error {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	// Try to load existing state
	if state, err := gm.loadGameStateFromKV(); err == nil {
		gm.state = state
		log.Printf("📋 Loaded existing game state with %d teams", len(state.Teams))
	} else {
		// Create new game state
		gm.state = &GameState{
			Grid:               new(sync.Map),
			Teams:              make(map[string]*Team),
			RoundState:         Waiting,
			RoundTimeRemaining: RoundDuration,
			Countdown:          PreRoundCountdown,
		}

		gm.initTeams()
		gm.initGrid()

		// Save initial state
		if err := gm.saveGameStateToKV(); err != nil {
			return fmt.Errorf("failed to save initial game state: %w", err)
		}

		log.Printf("🎯 Created new game state with %d teams", len(gm.state.Teams))
	}

	return nil
}

// initTeams initializes the game teams
func (gm *NATSGameManager) initTeams() {
	teamColors := []string{"#d500f9", "#00bcd4", "#e91e63", "#76ff03"}
	teamNames := []string{"Glitchbyte", "Nullwave", "Overburn", "Voltcrash"}

	for i, name := range teamNames {
		gm.state.Teams[name] = &Team{
			ID:         name,
			Color:      teamColors[i],
			Score:      0,
			Players:    new(sync.Map),
			Percentage: 0,
		}
		log.Printf("🚩 Team %s created with color %s", name, teamColors[i])
	}
}

// initGrid initializes the game grid
func (gm *NATSGameManager) initGrid() {
	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			key := fmt.Sprintf("%d:%d", x, y)
			gm.state.Grid.Store(key, Cell{OwnerID: "neutral", Color: "#374151"})
		}
	}
	gm.state.Winner = nil
	log.Printf("🏗️ Grid initialized with %d cells", GridWidth*GridHeight)
}

// Interface implementations

func (gm *NATSGameManager) Start() error {
	// Start game loop
	go gm.gameLoop()

	// Subscribe to game events
	if err := gm.setupEventSubscriptions(); err != nil {
		return fmt.Errorf("failed to setup event subscriptions: %w", err)
	}

	log.Printf("⚡ NATS Game Manager started")
	return nil
}

func (gm *NATSGameManager) Stop() error {
	// Stop game loop
	close(gm.gameLoopDone)

	// Unsubscribe from events
	for _, sub := range gm.eventSubscriptions {
		sub.Unsubscribe()
	}

	// Close NATS connections
	if gm.nc != nil {
		gm.nc.Close()
	}

	if gm.ns != nil {
		gm.ns.Close()
	}

	gm.cancel()
	log.Printf("🛑 NATS Game Manager stopped")
	return nil
}

func (gm *NATSGameManager) GetNC() *nats.Conn {
	return gm.nc
}

func (gm *NATSGameManager) GetJS() jetstream.JetStream {
	return gm.js
}

func (gm *NATSGameManager) GetKV() jetstream.KeyValue {
	return gm.kv
}

func (gm *NATSGameManager) GetGameState() (*GameState, error) {
	gm.stateMu.RLock()
	defer gm.stateMu.RUnlock()

	// Return a copy to avoid race conditions
	stateCopy := &GameState{
		Teams:              make(map[string]*Team),
		RoundState:         gm.state.RoundState,
		RoundTimeRemaining: gm.state.RoundTimeRemaining,
		Countdown:          gm.state.Countdown,
		Winner:             gm.state.Winner,
	}

	// Copy teams
	for id, team := range gm.state.Teams {
		teamCopy := *team
		teamCopy.Players = new(sync.Map)
		team.Players.Range(func(key, value interface{}) bool {
			teamCopy.Players.Store(key, value)
			return true
		})
		stateCopy.Teams[id] = &teamCopy
	}

	// Copy grid
	stateCopy.Grid = new(sync.Map)
	gm.state.Grid.Range(func(key, value interface{}) bool {
		stateCopy.Grid.Store(key, value)
		return true
	})

	return stateCopy, nil
}

func (gm *NATSGameManager) UpdateGameState(state *GameState) error {
	gm.stateMu.Lock()
	gm.state = state
	gm.stateMu.Unlock()

	if err := gm.saveGameStateToKV(); err != nil {
		return fmt.Errorf("failed to save game state: %w", err)
	}

	return gm.BroadcastGameState()
}

func (gm *NATSGameManager) WatchGameState() (jetstream.KeyWatcher, error) {
	// Watch with UpdatesOnly to get only new updates, not the initial value
	watcher, err := gm.kv.Watch(gm.ctx, "current", jetstream.UpdatesOnly())
	if err != nil {
		return nil, fmt.Errorf("failed to create KV watcher: %w", err)
	}

	log.Printf("🔍 Created KV watcher for game state updates")
	return watcher, nil
}

func (gm *NATSGameManager) AddPlayer(playerID string) (*Player, error) {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	// Check if player already exists
	if p, t := gm.getPlayerLocked(playerID); p != nil {
		if !p.IsConnected {
			p.IsConnected = true
			log.Printf("🔄 Player %s reconnected to team %s", playerID, t.ID)
			gm.updateTeamPlayerCounts()
			// Save state and broadcast
			gm.saveGameStateToKV()
			gm.PublishGameEvent("player_reconnect", map[string]interface{}{
				"playerId": playerID,
				"teamId":   t.ID,
			})
		}
		return p, nil
	}

	// Assign to team with fewest players
	var targetTeam *Team
	minPlayers := -1
	for _, team := range gm.state.Teams {
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
		IsConnected: true,
	}

	targetTeam.Players.Store(playerID, player)
	gm.updateTeamPlayerCounts()

	// Save state and broadcast
	gm.saveGameStateToKV()
	gm.PublishGameEvent("player_join", map[string]interface{}{
		"playerId": playerID,
		"teamId":   targetTeam.ID,
	})

	log.Printf("🆕 New player %s added to team %s", playerID, targetTeam.ID)
	return player, nil
}

func (gm *NATSGameManager) RemovePlayer(playerID string) error {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	if p, team := gm.getPlayerLocked(playerID); p != nil {
		team.Players.Delete(playerID)
		gm.updateTeamPlayerCounts()

		// Save state and broadcast
		gm.saveGameStateToKV()
		gm.PublishGameEvent("player_leave", map[string]interface{}{
			"playerId": playerID,
			"teamId":   team.ID,
		})

		log.Printf("👋 Player %s removed from team %s", playerID, team.ID)
	}

	return nil
}

func (gm *NATSGameManager) GetPlayer(playerID string) (*Player, *Team) {
	gm.stateMu.RLock()
	defer gm.stateMu.RUnlock()
	return gm.getPlayerLocked(playerID)
}

func (gm *NATSGameManager) getPlayerLocked(playerID string) (*Player, *Team) {
	for _, team := range gm.state.Teams {
		if p, ok := team.Players.Load(playerID); ok {
			return p.(*Player), team
		}
	}
	return nil, nil
}

func (gm *NATSGameManager) UpdatePlayer(playerID string, updates map[string]interface{}) error {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	player, team := gm.getPlayerLocked(playerID)
	if player == nil {
		return fmt.Errorf("player %s not found", playerID)
	}

	// Apply updates (this is a simplified version - you'd want proper field mapping)
	// Save back to team
	team.Players.Store(playerID, player)

	// Save state and broadcast
	gm.saveGameStateToKV()
	gm.PublishGameEvent("player_update", map[string]interface{}{
		"playerId": playerID,
		"updates":  updates,
	})

	return nil
}

func (gm *NATSGameManager) PlaceBit(playerID string, x, y int) (bool, error) {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	player, team := gm.getPlayerLocked(playerID)
	if player == nil {
		return false, fmt.Errorf("player not found")
	}

	if gm.state.RoundState != InProgress {
		return false, fmt.Errorf("can only place bits during a round")
	}

	if player.Bits < 1 {
		return false, fmt.Errorf("not enough bits")
	}

	if time.Since(player.LastAction) < ActionCooldown {
		return false, fmt.Errorf("action cooldown")
	}

	key := fmt.Sprintf("%d:%d", x, y)
	var oldOwnerID string

	// Check if cell is already owned by this team
	if oldCell, ok := gm.state.Grid.Load(key); ok {
		oldOwnerID = oldCell.(Cell).OwnerID
		if oldOwnerID == team.ID {
			return true, nil // No action needed
		}
	}

	// Place the bit
	player.Bits--
	player.LastAction = time.Now()
	gm.state.Grid.Store(key, Cell{OwnerID: team.ID, Color: team.Color})

	// Update scores
	team.Score++
	if oldOwner, ok := gm.state.Teams[oldOwnerID]; ok {
		oldOwner.Score--
		if oldOwner.Score < 0 {
			oldOwner.Score = 0
		}
		oldOwner.Percentage = (float32(oldOwner.Score) * 100) / float32(GridWidth*GridHeight)
	}
	team.Percentage = (float32(team.Score) * 100) / float32(GridWidth*GridHeight)

	// Save and broadcast
	gm.saveGameStateToKV()
	gm.PublishGameEvent("bit_placed", map[string]interface{}{
		"playerId": playerID,
		"teamId":   team.ID,
		"x":        x,
		"y":        y,
		"oldOwner": oldOwnerID,
	})

	log.Printf("✅ Player %s placed bit at (%d, %d)", playerID, x, y)
	return true, nil
}

// Broadcasting methods
func (gm *NATSGameManager) BroadcastGameState() error {
	state, err := gm.GetGameState()
	if err != nil {
		return err
	}

	return gm.PublishGameEvent("state_update", state)
}

func (gm *NATSGameManager) BroadcastPlayerUpdate(playerID string) error {
	player, team := gm.GetPlayer(playerID)
	if player == nil {
		return fmt.Errorf("player %s not found", playerID)
	}

	return gm.PublishGameEvent("player_update", map[string]interface{}{
		"player": player,
		"team":   team,
	})
}

func (gm *NATSGameManager) BroadcastTeamUpdate(teamID string) error {
	gm.stateMu.RLock()
	team, ok := gm.state.Teams[teamID]
	gm.stateMu.RUnlock()

	if !ok {
		return fmt.Errorf("team %s not found", teamID)
	}

	return gm.PublishGameEvent("team_update", team)
}

// Event streaming
func (gm *NATSGameManager) PublishGameEvent(eventType string, data interface{}) error {
	event := &GameEventMessage{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	subject := fmt.Sprintf("game.%s", eventType)
	_, err = gm.js.Publish(gm.ctx, subject, eventData)
	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	return nil
}

func (gm *NATSGameManager) SubscribeToGameEvents(handler func(*GameEventMessage)) error {
	sub, err := gm.nc.Subscribe("game.>", func(msg *nats.Msg) {
		var event GameEventMessage
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("Error unmarshaling event: %v", err)
			return
		}
		handler(&event)
	})
	if err != nil {
		return err
	}

	gm.eventSubscriptions = append(gm.eventSubscriptions, sub)
	return nil
}

// Private helper methods
func (gm *NATSGameManager) saveGameStateToKV() error {
	snapshot := &GameStateSnapshot{
		Grid:               make(map[string]Cell),
		Teams:              gm.state.Teams,
		RoundState:         gm.state.RoundState,
		RoundTimeRemaining: gm.state.RoundTimeRemaining,
		Countdown:          gm.state.Countdown,
		Winner:             gm.state.Winner,
		Timestamp:          time.Now().UnixMilli(),
	}

	// Convert sync.Map to regular map for JSON serialization
	gm.state.Grid.Range(func(key, value interface{}) bool {
		snapshot.Grid[key.(string)] = value.(Cell)
		return true
	})

	data, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}

	_, err = gm.kv.Put(gm.ctx, "current", data)
	return err
}

func (gm *NATSGameManager) loadGameStateFromKV() (*GameState, error) {
	entry, err := gm.kv.Get(gm.ctx, "current")
	if err != nil {
		return nil, err
	}

	var snapshot GameStateSnapshot
	if err := json.Unmarshal(entry.Value(), &snapshot); err != nil {
		return nil, err
	}

	state := &GameState{
		Grid:               new(sync.Map),
		Teams:              snapshot.Teams,
		RoundState:         snapshot.RoundState,
		RoundTimeRemaining: snapshot.RoundTimeRemaining,
		Countdown:          snapshot.Countdown,
		Winner:             snapshot.Winner,
	}

	// Convert regular map back to sync.Map
	for key, cell := range snapshot.Grid {
		state.Grid.Store(key, cell)
	}

	return state, nil
}

func (gm *NATSGameManager) setupEventSubscriptions() error {
	// Subscribe to player actions
	if err := gm.SubscribeToGameEvents(func(event *GameEventMessage) {
		// Handle incoming events (e.g., from other instances)
		log.Printf("🎯 Received game event: %s", event.Type)
	}); err != nil {
		return err
	}

	return nil
}

// gameLoop runs the main game logic
func (gm *NATSGameManager) gameLoop() {
	gameTicker := time.NewTicker(1 * time.Second)
	bitsTicker := time.NewTicker(GameTickRate)
	broadcastTicker := time.NewTicker(50 * time.Millisecond)

	defer gameTicker.Stop()
	defer bitsTicker.Stop()
	defer broadcastTicker.Stop()

	dirty := false

	log.Printf("⚡ Starting NATS game loop")

	for {
		select {
		case <-gm.gameLoopDone:
			return

		case <-gameTicker.C:
			gm.stateMu.Lock()
			switch gm.state.RoundState {
			case Waiting:
				gm.state.Countdown -= time.Second
				if gm.state.Countdown <= 0 {
					gm.state.RoundState = InProgress
					gm.state.RoundTimeRemaining = RoundDuration
					gm.PublishGameEvent("round_started", nil)
					log.Printf("🏁 Round started!")
				}
			case InProgress:
				gm.state.RoundTimeRemaining -= time.Second
				if gm.state.RoundTimeRemaining <= 0 {
					gm.state.RoundState = Finished
					gm.state.Countdown = PostRoundDelay
					gm.determineWinner()
					gm.PublishGameEvent("round_finished", map[string]interface{}{
						"winner": gm.state.Winner,
					})
					if gm.state.Winner != nil {
						log.Printf("🏆 Round finished! Winner: %s", gm.state.Winner.ID)
					}
				}
			case Finished:
				gm.state.Countdown -= time.Second
				if gm.state.Countdown <= 0 {
					gm.state.RoundState = Waiting
					gm.state.Countdown = PreRoundCountdown
					gm.resetGame()
					gm.PublishGameEvent("round_reset", nil)
					log.Printf("⏳ New round countdown started")
				}
			}
			gm.updateTeamPlayerCounts()
			dirty = true
			gm.stateMu.Unlock()

		case <-bitsTicker.C:
			gm.stateMu.Lock()
			if gm.state.RoundState == InProgress {
				gm.regenerateBits()
				dirty = true
			}
			gm.stateMu.Unlock()

		case <-broadcastTicker.C:
			if dirty {
				gm.saveGameStateToKV()
				gm.BroadcastGameState()
				dirty = false
			}
		}
	}
}

func (gm *NATSGameManager) regenerateBits() {
	for _, team := range gm.state.Teams {
		team.Players.Range(func(key, value interface{}) bool {
			player := value.(*Player)
			if player.Bits < MaxBits {
				player.Bits += BitsPerTick
				if player.Bits > MaxBits {
					player.Bits = MaxBits
				}
			}
			return true
		})
	}
}

func (gm *NATSGameManager) updateTeamPlayerCounts() {
	for _, team := range gm.state.Teams {
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

func (gm *NATSGameManager) determineWinner() {
	var winningTeam *Team
	maxScore := -1
	var topTeams []*Team

	for _, team := range gm.state.Teams {
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
		sort.Slice(topTeams, func(i, j int) bool {
			return topTeams[i].ID < topTeams[j].ID
		})
		winningTeam = topTeams[0]
	}

	gm.state.Winner = winningTeam
}

func (gm *NATSGameManager) resetGame() {
	gm.initGrid()
	for _, team := range gm.state.Teams {
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

func (gm *NATSGameManager) SetPlayerIdle(playerID string) error {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	if p, team := gm.getPlayerLocked(playerID); p != nil {
		if p.IsConnected {
			p.IsConnected = false
			gm.updateTeamPlayerCounts()
			// Save state and broadcast
			gm.saveGameStateToKV()
			gm.PublishGameEvent("player_idle", map[string]interface{}{
				"playerId": playerID,
				"teamId":   team.ID,
			})
			log.Printf("🧘 Player %s is now idle", playerID)
		}
	}

	return nil
}

func (gm *NATSGameManager) SetPlayerActive(playerID string) error {
	gm.stateMu.Lock()
	defer gm.stateMu.Unlock()

	if p, t := gm.getPlayerLocked(playerID); p != nil {
		if !p.IsConnected {
			p.IsConnected = true
			log.Printf("✅ Player %s is now active", playerID)
			gm.updateTeamPlayerCounts()
			gm.saveGameStateToKV()
			gm.PublishGameEvent("player_active", map[string]interface{}{
				"playerId": playerID,
				"teamId":   t.ID,
			})
		}
	}

	return nil
}
