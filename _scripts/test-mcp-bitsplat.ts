import { query, type SDKMessage } from '@anthropic-ai/claude-code'

console.log('🎮 Testing BitSplat MCP Server...\n')

const messages: SDKMessage[] = []

// Test the BitSplat game MCP server
for await (const message of query({
  prompt: `
Hello! I'd like to test the BitSplat game MCP server. Please help me:

1. First, get the current game state to see what's happening
2. Add a new player with user ID "test_player_123" 
3. Try to place a bit for this player at coordinates (5, 5)
4. Get the player state to see the result
5. Get team information to see which teams are available
6. Try placing another bit at (10, 8)

Please use the MCP tools available from the BitSplat server to do this step by step.
  `,
  abortController: new AbortController(),
  options: {
    cwd: './',
    maxTurns: 15,
    permissionMode: 'bypassPermissions',
    mcpServers: {
      'bitsplat-game': {
        type: 'sse',
        url: 'http://localhost:3000/mcp/sse',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }
  }
})) {
  messages.push(message)

  console.log('MESSAGE:', JSON.stringify(message, null, 2))

  if (message.type === 'assistant') {
    console.log('🤖 Assistant:', message.message.content)
  } else if (message.type === 'result') {
    console.log('📊 Result:', message.subtype)
    if (message.subtype === 'success') {
      console.log('✅ Final result:', message.result)
    } else if (message.subtype === 'error_during_execution') {
      console.log('❌ Error during execution')
    } else if (message.subtype === 'error_max_turns') {
      console.log('⚠️ Max turns reached')
    }
  } else if (message.type === 'system') {
    console.log('🔧 System:', message.subtype)
    if (message.subtype === 'init') {
      console.log('🚀 Initialized with:', {
        tools: message.tools,
        mcp_servers: message.mcp_servers,
        model: message.model,
        permissionMode: message.permissionMode
      })
    }
  }
}

console.log('\n--- BitSplat MCP Test Complete ---')
console.log(`Total messages: ${messages.length}`)

// Summary of test results
const systemMessages = messages.filter((m) => m.type === 'system')
const assistantMessages = messages.filter((m) => m.type === 'assistant')
const resultMessages = messages.filter((m) => m.type === 'result')

console.log('\n📋 Test Summary:')
console.log(`- System messages: ${systemMessages.length}`)
console.log(`- Assistant messages: ${assistantMessages.length}`)
console.log(`- Result messages: ${resultMessages.length}`)

if (resultMessages.length > 0) {
  const lastResult = resultMessages[resultMessages.length - 1]
  console.log(`- Final status: ${lastResult.subtype}`)
}
