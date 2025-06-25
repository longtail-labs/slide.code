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
 * Schema for the UserState ref
 */
export const UserStateSchema = Schema.Struct({
  userId: Schema.String,
  installationDate: Schema.Number,
  subscribed: Schema.Boolean,
  lastSubscriptionCheck: Schema.Number
})

/**
 * Type for the UserState
 */
export type UserState = Schema.Schema.Type<typeof UserStateSchema>
