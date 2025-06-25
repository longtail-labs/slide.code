// request.ts
import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema } from 'effect'

// Define a user with an ID and name
export class User extends Schema.Class<User>('User')({
  id: Schema.String, // User's ID as a string
  name: Schema.String // User's name as a string
}) {}

// Define a chat message schema
export class ChatMessage extends Schema.Class<ChatMessage>('ChatMessage')({
  id: Schema.String,
  text: Schema.String,
  timestamp: Schema.Number
}) {}

// Consolidated RPC group for all Slide operations
export class SlideRpcs extends RpcGroup.make(
  // User operations
  Rpc.make('UserList', {
    success: User,
    stream: true
  }),
  Rpc.make('UserById', {
    success: User,
    error: Schema.String,
    payload: {
      id: Schema.String
    }
  }),
  Rpc.make('UserCreate', {
    success: User,
    payload: {
      name: Schema.String
    }
  }),

  // Chat streaming example
  Rpc.make('StreamChatMessages', {
    success: ChatMessage,
    stream: true,
    payload: {
      interval: Schema.optional(Schema.Number)
    }
  })
) {}
