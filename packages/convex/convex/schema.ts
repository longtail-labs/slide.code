import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// From: node_modules/@anthropic-ai/claude-code/sdk.d.ts
// We are defining a subset of the SDK types here for validation in Convex.
// Using v.any() for complex, deeply nested, or SDK-specific types to maintain flexibility.

const sdkUserMessage = v.object({
  type: v.literal('user'),
  message: v.any(), // Keeping this as `any` due to complex content structure (text or image blocks)
  parent_tool_use_id: v.union(v.string(), v.null()),
  session_id: v.string()
})

const sdkAssistantMessage = v.object({
  type: v.literal('assistant'),
  message: v.any(), // Keeping as `any` due to complex content block structure (text, tool_use)
  parent_tool_use_id: v.union(v.string(), v.null()),
  session_id: v.string()
})

const sdkResultMessage = v.object({
  type: v.literal('result'),
  subtype: v.union(
    v.literal('success'),
    v.literal('error_max_turns'),
    v.literal('error_during_execution')
  ),
  duration_ms: v.number(),
  duration_api_ms: v.number(),
  is_error: v.boolean(),
  num_turns: v.number(),
  result: v.optional(v.string()),
  session_id: v.string(),
  total_cost_usd: v.number(),
  usage: v.object({
    input_tokens: v.number(),
    output_tokens: v.number()
  })
})

const sdkSystemMessage = v.object({
  type: v.literal('system'),
  subtype: v.literal('init'),
  apiKeySource: v.string(),
  cwd: v.string(),
  session_id: v.string(),
  tools: v.array(v.string()),
  mcp_servers: v.array(
    v.object({
      name: v.string(),
      status: v.string()
    })
  ),
  model: v.string(),
  permissionMode: v.string()
})

const sdkMessage = v.union(sdkUserMessage, sdkAssistantMessage, sdkResultMessage, sdkSystemMessage)

export default defineSchema({
  /**
   * Represents a single task or session with an AI model.
   */
  tasks: defineTable({
    /** The name/title of the task, e.g., "Implement new feature". */
    name: v.string(),
    /** A more detailed description of the task's objective. */
    objective: v.optional(v.string()),
    /** The current status of the task. */
    status: v.union(
      v.literal('waiting'),
      v.literal('working'),
      v.literal('burner'),
      v.literal('archived'),
      v.literal('completed')
    ),
    /** The repository associated with the task, e.g., "owner/repo". */
    repo: v.optional(v.string()),
    /** The git branch for this task. */
    branch: v.optional(v.string()),
    /** To store line additions/removals statistics. */
    stats: v.optional(
      v.object({
        additions: v.number(),
        deletions: v.number()
      })
    ),
    /**
     * Stores the session ID from the Claude Code SDK to allow for resuming conversations.
     * Can be adapted for similar concepts in other models.
     */
    sessionId: v.optional(v.string()),
    /** The AI model used for this task, e.g., 'claude-code', 'gemini-pro'. */
    model: v.optional(v.string()),
    userId: v.id('users')
  }).index('by_user_status', ['userId', 'status']),

  /**
   * Stores all events related to a task, including messages, tool calls, and system notifications.
   * This is designed to be flexible to support different AI SDKs.
   */
  events: defineTable({
    /** A reference to the parent task. */
    taskId: v.id('tasks'),
    /**
     * The raw event object from the AI SDK, typed as a union of the
     * different message types from the Claude Code SDK. This provides
     * a good balance of type-safety and flexibility.
     */
    event: sdkMessage
  }).index('by_taskId', ['taskId']),

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    // The task the user is currently working on.
    activeTaskId: v.optional(v.id('tasks')),
    // Aggregate cost and token usage for the user.
    totalTokens: v.optional(v.object({ input: v.number(), output: v.number() })),
    totalCost: v.optional(v.number())
  }),

  radioChannels: defineTable({
    // from SomaFM api
    channelId: v.string(),
    title: v.string(),
    description: v.string(),
    image: v.string(),
    listeners: v.number(),
    // We can store the direct stream URLs or fetch them on demand.
    // Storing them might be faster but they could change.
    streamUrl: v.string()
  }).index('by_channelId', ['channelId'])
})
