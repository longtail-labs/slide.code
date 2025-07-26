package types

import (
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	datastar "github.com/starfederation/datastar/sdk/go"
)

// Game constants
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

// Game types
type Team struct {
	ID            string
	Color         string
	Score         int
	Players       *sync.Map // [playerID]*Player
	ActivePlayers int
	IdlePlayers   int
	Percentage    float32
}

type Player struct {
	ID          string    `json:"id"`
	TeamID      string    `json:"teamId"`
	Color       string    `json:"color"` // This is the team color
	Bits        int       `json:"bits"`
	LastAction  time.Time `json:"-"`
	SSE         *datastar.ServerSentEventGenerator
	IsConnected bool
}

type Cell struct {
	OwnerID string `json:"ownerId"`
	Color   string `json:"color"`
}

type GameState struct {
	Grid               *sync.Map        // [string]Cell, key is "x:y"
	Teams              map[string]*Team // [string]*Team, key is teamID
	RoundState         RoundState
	RoundTimeRemaining time.Duration
	Countdown          time.Duration
	Winner             *Team
}

// NATS subject constants for pub/sub messaging
const (
	// Game state subjects
	SubjectGameStateUpdate = "game.state.update"
	SubjectGameGridUpdate  = "game.grid.update"
	SubjectGameUIUpdate    = "game.ui.update"

	// Player subjects
	SubjectPlayerJoin   = "game.player.join"
	SubjectPlayerLeave  = "game.player.leave"
	SubjectPlayerMove   = "game.player.move"
	SubjectPlayerAction = "game.player.action"

	// Game events
	SubjectGameTick  = "game.tick"
	SubjectGameRound = "game.round"
	SubjectGameBits  = "game.bits"

	// Team-specific subjects
	SubjectTeamGlitchbyte = "game.team.Glitchbyte"
	SubjectTeamNullwave   = "game.team.Nullwave"
	SubjectTeamOverburn   = "game.team.Overburn"
	SubjectTeamVoltcrash  = "game.team.Voltcrash"
)

// NATS stream and KV bucket names
const (
	StreamGameEvents = "GAME_EVENTS"
	KVGameState      = "game_state"
	KVPlayerSessions = "player_sessions"
)

// NATS configuration
type NATSConfig struct {
	DataDir  string
	Port     int
	MaxAge   time.Duration
	MaxBytes int64
	Replicas int
}

// DefaultNATSConfig returns a default NATS configuration
func DefaultNATSConfig() *NATSConfig {
	return &NATSConfig{
		DataDir:  "data/nats",
		Port:     0, // Auto-assign port
		MaxAge:   24 * time.Hour,
		MaxBytes: 64 * 1024 * 1024, // 64MB
		Replicas: 1,
	}
}

// GameEventMessage represents a message published to NATS
type GameEventMessage struct {
	Type      string      `json:"type"`
	PlayerID  string      `json:"playerId,omitempty"`
	TeamID    string      `json:"teamId,omitempty"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// PlayerActionEvent represents a player action
type PlayerActionEvent struct {
	PlayerID string `json:"playerId"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Action   string `json:"action"` // "place_bit", "move", etc.
}

// GameStateSnapshot represents a point-in-time game state
type GameStateSnapshot struct {
	Grid               map[string]Cell  `json:"grid"`
	Teams              map[string]*Team `json:"teams"`
	RoundState         RoundState       `json:"roundState"`
	RoundTimeRemaining time.Duration    `json:"roundTimeRemaining"`
	Countdown          time.Duration    `json:"countdown"`
	Winner             *Team            `json:"winner,omitempty"`
	Timestamp          int64            `json:"timestamp"`
}

// NATSManager interface defines the methods for NATS-based game management
type NATSManager interface {
	// Core operations
	Start() error
	Stop() error
	GetNC() *nats.Conn
	GetJS() jetstream.JetStream
	GetKV() jetstream.KeyValue

	// Game state management
	GetGameState() (*GameState, error)
	UpdateGameState(state *GameState) error
	WatchGameState() (jetstream.KeyWatcher, error)

	// Player management
	AddPlayer(playerID string) (*Player, error)
	RemovePlayer(playerID string) error
	SetPlayerActive(playerID string) error
	SetPlayerIdle(playerID string) error
	GetPlayer(playerID string) (*Player, *Team)
	UpdatePlayer(playerID string, updates map[string]interface{}) error

	// Game actions
	PlaceBit(playerID string, x, y int) (bool, error)

	// Broadcasting
	BroadcastGameState() error
	BroadcastPlayerUpdate(playerID string) error
	BroadcastTeamUpdate(teamID string) error

	// Event streaming
	PublishGameEvent(eventType string, data interface{}) error
	SubscribeToGameEvents(handler func(*GameEventMessage)) error
}
