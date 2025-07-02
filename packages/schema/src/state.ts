import { Schema } from 'effect'

/**
 * Schema for the AppReady ref
 */
export const AppReadySchema = Schema.Struct({
  isReady: Schema.Boolean,
  error: Schema.Union(Schema.String, Schema.Null),
  timestamp: Schema.Number
})

/**
 * Type for the AppReady state
 */
export type AppReadyState = Schema.Schema.Type<typeof AppReadySchema>

/**
 * Schema for the Theme ref
 */
export const ThemeSchema = Schema.Struct({
  current: Schema.Union(Schema.Literal('dark'), Schema.Literal('light'), Schema.Literal('system')),
  effectiveTheme: Schema.Union(Schema.Literal('dark'), Schema.Literal('light')),
  timestamp: Schema.Number
})

/**
 * Type for the Theme state
 */
export type ThemeState = Schema.Schema.Type<typeof ThemeSchema>

/**
 * Schema for the Update ref
 */
export const UpdateSchema = Schema.Struct({
  currentVersion: Schema.String,
  latestVersion: Schema.Union(Schema.String, Schema.Null),
  isUpdateAvailable: Schema.Boolean,
  isCheckingForUpdates: Schema.Boolean,
  updateError: Schema.Union(Schema.String, Schema.Null),
  lastChecked: Schema.Number
})

/**
 * Type for the Update state
 */
export type UpdateState = Schema.Schema.Type<typeof UpdateSchema>

/**
 * Schema for the SlideState ref
 */
export const SlideStateSchema = Schema.Union(
  // Planning mode - initial state where user selects a task
  Schema.Struct({
    mode: Schema.Literal('planning')
  }),

  // Working mode - user is actively working on a task
  Schema.Struct({
    mode: Schema.Literal('working'),
    currentTask: Schema.String
  }),

  // AI suggestion mode - AI is giving suggestions after task completion
  Schema.Struct({
    mode: Schema.Literal('suggesting'),
    completedTaskId: Schema.String,
    suggestions: Schema.Array(Schema.String),
    mainSuggestion: Schema.optional(Schema.String),
    countingDown: Schema.Boolean
  })
)

/**
 * Type for the SlideState
 */
export type SlideState = Schema.Schema.Type<typeof SlideStateSchema>

/**
 * Schema for Claude Code usage stats
 */
export const ClaudeCodeStatsSchema = Schema.Struct({
  totalRequests: Schema.Number,
  totalCost: Schema.Number,
  lastUsed: Schema.Union(Schema.Number, Schema.Null)
})

/**
 * Type for Claude Code stats
 */
export type ClaudeCodeStats = Schema.Schema.Type<typeof ClaudeCodeStatsSchema>

/**
 * Schema for Claude Code configuration
 */
export const ClaudeCodeConfigSchema = Schema.Struct({
  executablePath: Schema.Union(Schema.String, Schema.Null),
  lastDetected: Schema.Union(Schema.Number, Schema.Null),
  stats: ClaudeCodeStatsSchema
})

/**
 * Type for Claude Code configuration
 */
export type ClaudeCodeConfig = Schema.Schema.Type<typeof ClaudeCodeConfigSchema>

/**
 * Schema for the UserState ref
 */
export const UserStateSchema = Schema.Struct({
  userId: Schema.String,
  installationDate: Schema.Number,
  subscribed: Schema.Boolean,
  lastSubscriptionCheck: Schema.Number,
  claudeCode: Schema.optional(ClaudeCodeConfigSchema),
  vibeDirectory: Schema.optional(Schema.String),
  currentTaskId: Schema.optional(Schema.Union(Schema.String, Schema.Null))
})

/**
 * Type for the UserState
 */
export type UserState = Schema.Schema.Type<typeof UserStateSchema>
