import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { v4 as uuid } from 'uuid'
import { Match, Schema } from 'effect'

import * as schema from '../packages/schema/src/drizzle.js'
import type {
  SdkUserMessage,
  SdkAssistantMessage,
  SdkResultMessage,
  SdkSystemMessage
} from '../packages/schema/src/database.js'
import {
  SdkUserMessageSchema,
  SdkAssistantMessageSchema,
  SdkResultMessageSchema,
  SdkSystemMessageSchema
} from '../packages/schema/src/database.js'

async function main() {
  console.log('📝 Setting up the database client...')
  // if (!process.env.TURSO_DATABASE_URL) {
  //   throw new Error('TURSO_DATABASE_URL is not set')
  // }

  const client = createClient({
    url: `file:./test-db.sqlite`
    // url: process.env.TURSO_DATABASE_URL,
    // authToken: process.env.TURSO_AUTH_TOKEN
  })

  const db = drizzle(client, {
    schema: {
      ...schema,
      projectsRelations: schema.projectsRelations,
      tasksRelations: schema.tasksRelations,
      chatMessagesRelations: schema.chatMessagesRelations
    },
    logger: true
  })

  console.log(
    '✅ Database client created. Make sure you have run migrations with `npm run db:migrate:apply`'
  )

  console.log('🌱 Seeding database with different message types...')

  // 1. Create a Project
  const [project] = await db
    .insert(schema.projects)
    .values({
      id: uuid(),
      name: 'Test Project',
      path: '/tmp/test-project',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning()

  console.log('Project created:', project)

  // 2. Create a Task
  const [task] = await db
    .insert(schema.tasks)
    .values({
      id: uuid(),
      name: 'Test Task',
      projectId: project.id,
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning()

  console.log('Task created:', task)

  // 3. Create different types of Chat Messages
  const messages: (typeof userMessage)[] = []

  // User Message
  const userMessageEvent: SdkUserMessage = {
    type: 'user',
    message: 'Hello, can you help me write a function?',
    parent_tool_use_id: null,
    session_id: 'session-123'
  }

  const [userMessage] = await db
    .insert(schema.chatMessages)
    .values({
      id: uuid(),
      taskId: task.id,
      type: userMessageEvent.type,
      event: userMessageEvent,
      createdAt: new Date()
    })
    .returning()

  messages.push(userMessage)

  // Assistant Message
  const assistantMessageEvent: SdkAssistantMessage = {
    type: 'assistant',
    message:
      "I'd be happy to help you write a function! What kind of function are you looking to create?",
    parent_tool_use_id: null,
    session_id: 'session-123'
  }

  const [assistantMessage] = await db
    .insert(schema.chatMessages)
    .values({
      id: uuid(),
      taskId: task.id,
      type: assistantMessageEvent.type,
      event: assistantMessageEvent,
      createdAt: new Date()
    })
    .returning()

  messages.push(assistantMessage)

  // Result Message
  const resultMessageEvent: SdkResultMessage = {
    type: 'result',
    subtype: 'success',
    duration_ms: 1500,
    duration_api_ms: 800,
    is_error: false,
    num_turns: 2,
    result: 'Function created successfully',
    session_id: 'session-123',
    total_cost_usd: 0.05,
    usage: {
      input_tokens: 150,
      output_tokens: 200
    }
  }

  const [resultMessage] = await db
    .insert(schema.chatMessages)
    .values({
      id: uuid(),
      taskId: task.id,
      type: resultMessageEvent.type,
      subtype: resultMessageEvent.subtype,
      event: resultMessageEvent,
      createdAt: new Date()
    })
    .returning()

  messages.push(resultMessage)

  // System Message
  const systemMessageEvent: SdkSystemMessage = {
    type: 'system',
    subtype: 'init',
    apiKeySource: 'environment',
    cwd: '/tmp/test-project',
    session_id: 'session-123',
    tools: ['file_editor', 'bash'],
    mcp_servers: [
      { name: 'filesystem', status: 'connected' },
      { name: 'browser', status: 'connected' }
    ],
    model: 'claude-3-5-sonnet-20241022',
    permissionMode: 'ask'
  }

  const [systemMessage] = await db
    .insert(schema.chatMessages)
    .values({
      taskId: task.id,
      type: systemMessageEvent.type,
      subtype: systemMessageEvent.subtype,
      event: systemMessageEvent,
      createdAt: new Date()
    })
    .returning()

  messages.push(systemMessage)

  console.log(`✅ Created ${messages.length} different message types`)

  // 4. Retrieve all messages and use Effect's Match to handle them
  console.log('\n🔍 Fetching all chat messages and pattern matching...')

  const fetchedMessages = await db.query.chatMessages.findMany({
    where: (messages, { eq }) => eq(messages.taskId, task.id),
    with: {
      task: {
        with: {
          project: true
        }
      }
    },
    orderBy: (messages, { asc }) => [asc(messages.createdAt)]
  })

  console.log(`\n📋 Processing ${fetchedMessages.length} messages with pattern matching:\n`)

  fetchedMessages.forEach((message, index) => {
    console.log(`--- Message ${index + 1} ---`)
    console.log(`ID: ${message.id}`)
    console.log(`Type: ${message.type}`)
    console.log(`Subtype: ${message.subtype || 'N/A'}`)

    // Use Effect's Match with Schema.is for type-safe pattern matching
    const description = Match.value(message.event).pipe(
      Match.when(
        Schema.is(SdkUserMessageSchema),
        (userMsg) => `🧑 User says: "${userMsg.message}"`
      ),
      Match.when(
        Schema.is(SdkAssistantMessageSchema),
        (assistantMsg) => `🤖 Assistant replies: "${assistantMsg.message}"`
      ),
      Match.when(
        Schema.is(SdkResultMessageSchema),
        (resultMsg) =>
          `📊 Result (${resultMsg.subtype}): ${resultMsg.is_error ? 'Error' : 'Success'} - ${resultMsg.result || 'No result'} (${resultMsg.duration_ms}ms, $${resultMsg.total_cost_usd})`
      ),
      Match.when(
        Schema.is(SdkSystemMessageSchema),
        (systemMsg) =>
          `⚙️  System (${systemMsg.subtype}): Model ${systemMsg.model} initialized with ${systemMsg.tools.length} tools and ${systemMsg.mcp_servers.length} MCP servers`
      ),
      Match.exhaustive
    )

    console.log(`Description: ${description}`)
    console.log(`Created: ${message.createdAt}`)
    console.log(`Task: ${message.task.name} (Project: ${message.task.project.name})`)
    console.log('')
  })

  console.log('🎉 Pattern matching test completed successfully!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
