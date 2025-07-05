import { Schema } from 'effect'
import type { MessageParam, Message } from '@anthropic-ai/sdk/resources/messages'

// Create Effect Schemas for Anthropic SDK types using Schema.declare
// This allows us to use external TypeScript types with Effect's validation
const AnthropicMessageParamSchema = Schema.declare<MessageParam>(
  (input): input is MessageParam => {
    // Basic validation for MessageParam structure
    return (
      typeof input === 'object' &&
      input !== null &&
      'role' in input &&
      typeof input.role === 'string' &&
      ['user', 'assistant'].includes(input.role)
    )
  },
  {
    identifier: 'AnthropicMessageParam',
    title: 'Anthropic MessageParam',
    description: 'A message parameter from the Anthropic SDK'
  }
)

const AnthropicMessageSchema = Schema.declare<Message>(
  (input): input is Message => {
    // Basic validation for Message structure
    return (
      typeof input === 'object' &&
      input !== null &&
      'id' in input &&
      'type' in input &&
      'role' in input &&
      'content' in input &&
      typeof input.id === 'string' &&
      input.type === 'message' &&
      typeof input.role === 'string'
    )
  },
  {
    identifier: 'AnthropicMessage',
    title: 'Anthropic Message',
    description: 'A message response from the Anthropic SDK'
  }
)

// File comment schema for user prompts
export const FileCommentSchema = Schema.Struct({
  filePath: Schema.String,
  comment: Schema.String,
  lineNumber: Schema.optional(Schema.Number)
})

// Simple user prompt message (not from Claude SDK)
export const PromptUserMessageSchema = Schema.Struct({
  type: Schema.Literal('prompt'),
  content: Schema.String,
  timestamp: Schema.Number,
  fileComments: Schema.optional(Schema.Array(FileCommentSchema))
})

// Claude Code SDK Message Types
export const SdkUserMessageSchema = Schema.Struct({
  type: Schema.Literal('user'),
  message: AnthropicMessageParamSchema,
  parent_tool_use_id: Schema.Union(Schema.String, Schema.Null),
  session_id: Schema.String
})

export const SdkAssistantMessageSchema = Schema.Struct({
  type: Schema.Literal('assistant'),
  message: AnthropicMessageSchema,
  parent_tool_use_id: Schema.Union(Schema.String, Schema.Null),
  session_id: Schema.String
})

export const SdkResultMessageSchema = Schema.Struct({
  type: Schema.Literal('result'),
  subtype: Schema.Union(
    Schema.Literal('success'),
    Schema.Literal('error_max_turns'),
    Schema.Literal('error_during_execution')
  ),
  duration_ms: Schema.Number,
  duration_api_ms: Schema.Number,
  is_error: Schema.Boolean,
  num_turns: Schema.Number,
  result: Schema.optional(Schema.String),
  session_id: Schema.String,
  total_cost_usd: Schema.Number,
  usage: Schema.Struct({
    input_tokens: Schema.Number,
    output_tokens: Schema.Number
  }).pipe(Schema.partial)
})

export const messageSubtypes = [
  'success',
  'error_max_turns',
  'error_during_execution',
  'init'
] as const

export const SdkSystemMessageSchema = Schema.Struct({
  type: Schema.Literal('system'),
  subtype: Schema.Literal('init'),
  apiKeySource: Schema.Union(
    Schema.Literal('none'),
    Schema.Literal('user'),
    Schema.Literal('project'),
    Schema.Literal('org'),
    Schema.Literal('temporary')
  ),
  cwd: Schema.String,
  session_id: Schema.String,
  tools: Schema.Array(Schema.String),
  mcp_servers: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      status: Schema.String
    })
  ),
  model: Schema.String,
  permissionMode: Schema.String
})

export const SdkMessageSchema = Schema.Union(
  PromptUserMessageSchema,
  SdkUserMessageSchema,
  SdkAssistantMessageSchema,
  SdkResultMessageSchema,
  SdkSystemMessageSchema
)

// Union type for all possible chat message events (includes both SDK messages and prompt user messages)
export const ChatMessageEventSchema = Schema.Union(
  PromptUserMessageSchema,
  SdkUserMessageSchema,
  SdkAssistantMessageSchema,
  SdkResultMessageSchema,
  SdkSystemMessageSchema
)

// Task Status values
export const taskStatuses = ['pending', 'running', 'failed', 'completed', 'stopped'] as const

// Permission Mode values
export const permissionModes = ['default', 'acceptEdits', 'bypassPermissions', 'plan'] as const

// Message Type values
export const messageTypes = ['user', 'assistant', 'result', 'system', 'prompt'] as const

// Derived TypeScript types
export type TaskStatusType = (typeof taskStatuses)[number]
export type PermissionModeType = (typeof permissionModes)[number]
export type MessageTypeType = (typeof messageTypes)[number]

// Task Status Schema

// Type exports with proper Anthropic SDK types
export type FileComment = Schema.Schema.Type<typeof FileCommentSchema>
export type PromptUserMessage = Schema.Schema.Type<typeof PromptUserMessageSchema>
export type SdkUserMessage = Schema.Schema.Type<typeof SdkUserMessageSchema>
export type SdkAssistantMessage = Schema.Schema.Type<typeof SdkAssistantMessageSchema>
export type SdkResultMessage = Schema.Schema.Type<typeof SdkResultMessageSchema>
export type SdkSystemMessage = Schema.Schema.Type<typeof SdkSystemMessageSchema>
export type SdkMessage = Schema.Schema.Type<typeof SdkMessageSchema>
export type ChatMessageEvent = Schema.Schema.Type<typeof ChatMessageEventSchema>

// Export the Anthropic schema types for use in other parts of the application
export { AnthropicMessageParamSchema, AnthropicMessageSchema }
