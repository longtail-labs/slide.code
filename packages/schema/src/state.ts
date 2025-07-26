import { Schema } from 'effect'

/**
 * Schema for MCP server configuration
 */
export const McpStdioServerConfigSchema = Schema.Struct({
  type: Schema.optional(Schema.Literal('stdio')),
  command: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
  env: Schema.optional(Schema.Any),
  enabled: Schema.optional(Schema.Boolean)
})

export const McpSSEServerConfigSchema = Schema.Struct({
  type: Schema.Literal('sse'),
  url: Schema.String,
  headers: Schema.optional(Schema.Any),
  enabled: Schema.optional(Schema.Boolean)
})

export const McpHttpServerConfigSchema = Schema.Struct({
  type: Schema.Literal('http'),
  url: Schema.String,
  headers: Schema.optional(Schema.Any),
  enabled: Schema.optional(Schema.Boolean)
})

export const McpServerConfigSchema = Schema.Union(
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpHttpServerConfigSchema
)

/**
 * Schema for the AppReady ref
 */
export const AppReadySchema = Schema.Struct({
  isReady: Schema.Boolean,
  timestamp: Schema.Number,
  error: Schema.optional(Schema.Boolean),
  errorDetails: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
  currentTaskId: Schema.optional(Schema.Union(Schema.String, Schema.Null))
})

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
 * Type for the AppReady ref
 */
export type AppReadyState = Schema.Schema.Type<typeof AppReadySchema>

/**
 * Type for the Update ref
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
 * Type for the SlideState ref
 */
export type SlideState = Schema.Schema.Type<typeof SlideStateSchema>

/**
 * Schema for model-specific usage breakdown
 */
export const ModelBreakdownSchema = Schema.Struct({
  modelName: Schema.String,
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheCreationTokens: Schema.Number,
  cacheReadTokens: Schema.Number,
  cost: Schema.Number
})

/**
 * Schema for daily Claude Code usage breakdown
 */
export const DailyUsageSchema = Schema.Struct({
  date: Schema.String,
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheCreationTokens: Schema.Number,
  cacheReadTokens: Schema.Number,
  totalCost: Schema.Number,
  modelsUsed: Schema.Array(Schema.String),
  modelBreakdowns: Schema.Array(ModelBreakdownSchema)
})

/**
 * Schema for session Claude Code usage breakdown
 */
export const SessionUsageSchema = Schema.Struct({
  sessionId: Schema.String,
  projectPath: Schema.String,
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheCreationTokens: Schema.Number,
  cacheReadTokens: Schema.Number,
  totalCost: Schema.Number,
  lastActivity: Schema.String,
  versions: Schema.Array(Schema.String),
  modelsUsed: Schema.Array(Schema.String),
  modelBreakdowns: Schema.Array(ModelBreakdownSchema)
})

/**
 * Schema for token totals
 */
export const TokenTotalsSchema = Schema.Struct({
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheCreationTokens: Schema.Number,
  cacheReadTokens: Schema.Number,
  totalTokens: Schema.Number,
  totalCost: Schema.Number
})

/**
 * Schema for Claude Code usage stats
 */
export const ClaudeCodeStatsSchema = Schema.Struct({
  totalRequests: Schema.Number,
  totalCost: Schema.Number,
  lastUsed: Schema.Union(Schema.Number, Schema.Null),
  lastSyncTime: Schema.Union(Schema.Number, Schema.Null),
  tokenTotals: Schema.optional(TokenTotalsSchema),
  dailyUsage: Schema.optional(Schema.Array(DailyUsageSchema)),
  sessionUsage: Schema.optional(Schema.Array(SessionUsageSchema)),
  modelsUsed: Schema.optional(Schema.Array(Schema.String))
})

/**
 * Type for token totals
 */
export type TokenTotals = Schema.Schema.Type<typeof TokenTotalsSchema>

/**
 * Type for daily Claude Code usage
 */
export type DailyUsage = Schema.Schema.Type<typeof DailyUsageSchema>

/**
 * Type for session Claude Code usage
 */
export type SessionUsage = Schema.Schema.Type<typeof SessionUsageSchema>

/**
 * Type for model breakdown
 */
export type ModelBreakdown = Schema.Schema.Type<typeof ModelBreakdownSchema>

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
  stats: ClaudeCodeStatsSchema,
  isAuthenticated: Schema.optional(Schema.Boolean),
  lastAuthCheck: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  mcpServers: Schema.optional(Schema.Any) // TODO: Fix to proper Record type
})

/**
 * Type for Claude Code configuration
 */
export type ClaudeCodeConfig = Schema.Schema.Type<typeof ClaudeCodeConfigSchema>

/**
 * Type for MCP server configuration
 */
export type McpServerConfig = Schema.Schema.Type<typeof McpServerConfigSchema>

/**
 * Schema for the Claude state ref (separate from user state)
 */
export const ClaudeStateSchema = ClaudeCodeConfigSchema

/**
 * Type for the Claude State
 */
export type ClaudeState = Schema.Schema.Type<typeof ClaudeStateSchema>

/**
 * Schema for the UserState ref
 */
export const UserStateSchema = Schema.Struct({
  userId: Schema.String,
  installationDate: Schema.Number,
  subscribed: Schema.Boolean,
  lastSubscriptionCheck: Schema.Number,
  claudeCode: Schema.optional(ClaudeCodeConfigSchema),
  vibeDirectory: Schema.optional(Schema.String)
})

/**
 * Type for the UserState
 */
export type UserState = Schema.Schema.Type<typeof UserStateSchema>
