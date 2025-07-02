// Direct test of BitSplat MCP SSE server
// This tests the MCP endpoints directly without Claude Code SDK

const BASE_URL = 'http://localhost:3000'
const MCP_SSE_URL = `${BASE_URL}/mcp/sse`

interface MCPRequest {
  jsonrpc: string
  id: number | string
  method: string
  params?: any
}

interface MCPResponse {
  jsonrpc: string
  id: number | string
  result?: any
  error?: any
}

class MCPSSEClient {
  private messageUrl: string = ''
  private eventSource: EventSource | null = null
  private requestCounter = 0

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to MCP SSE endpoint:', MCP_SSE_URL)

      this.eventSource = new EventSource(MCP_SSE_URL)

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection opened')
      }

      this.eventSource.onmessage = (event) => {
        console.log('📨 Received event:', event.type, event.data)
      }

      this.eventSource.addEventListener('endpoint', (event) => {
        this.messageUrl = event.data
        console.log('🎯 Message endpoint:', this.messageUrl)
        resolve()
      })

      this.eventSource.addEventListener('message', (event) => {
        try {
          const response: MCPResponse = JSON.parse(event.data)
          console.log('📥 MCP Response:', JSON.stringify(response, null, 2))
        } catch (err) {
          console.log('📥 Raw message:', event.data)
        }
      })

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error)
        reject(error)
      }
    })
  }

  async sendRequest(method: string, params?: any): Promise<void> {
    if (!this.messageUrl) {
      throw new Error('Not connected - no message URL')
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestCounter,
      method,
      params
    }

    console.log('📤 Sending request:', JSON.stringify(request, null, 2))

    const response = await fetch(this.messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log(`✅ Request sent (${response.status})`)
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      console.log('🔌 Disconnected from SSE')
    }
  }
}

async function testMCPServer() {
  console.log('🎮 Testing BitSplat MCP SSE Server\n')

  // First, check if the server info endpoint works
  try {
    console.log('📋 Checking server info...')
    const infoResponse = await fetch(`${BASE_URL}/mcp`)
    const info = await infoResponse.json()
    console.log('ℹ️ Server info:', JSON.stringify(info, null, 2))
  } catch (err) {
    console.error('❌ Failed to get server info:', err)
    return
  }

  const client = new MCPSSEClient()

  try {
    // Connect to SSE endpoint
    await client.connect()

    // Wait a bit for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test initialize
    console.log('\n🚀 Testing initialize...')
    await client.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'bitsplat-test-client',
        version: '1.0.0'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test get_game_state tool
    console.log('\n🎮 Testing get_game_state...')
    await client.sendRequest('tools/call', {
      name: 'get_game_state'
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test add_player tool
    console.log('\n👤 Testing add_player...')
    await client.sendRequest('tools/call', {
      name: 'add_player',
      arguments: {
        user_id: 'test_user_456'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test place_bit tool
    console.log('\n🎯 Testing place_bit...')
    await client.sendRequest('tools/call', {
      name: 'place_bit',
      arguments: {
        user_id: 'test_user_456',
        x: 15,
        y: 10
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test get_player_state tool
    console.log('\n📊 Testing get_player_state...')
    await client.sendRequest('tools/call', {
      name: 'get_player_state',
      arguments: {
        user_id: 'test_user_456'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test get_team_info tool
    console.log('\n🏆 Testing get_team_info...')
    await client.sendRequest('tools/call', {
      name: 'get_team_info'
    })

    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log('\n✅ All tests completed!')
  } catch (err) {
    console.error('❌ Test failed:', err)
  } finally {
    client.disconnect()
  }
}

// Check if we're in Node.js environment and run the test
async function main() {
  if (typeof window === 'undefined') {
    // Node.js - use node-fetch and eventsource
    try {
      const { default: fetch } = await import('node-fetch')
      // @ts-ignore - eventsource is optional dependency for Node.js
      const { default: EventSource } = await import('eventsource')

      // @ts-ignore
      globalThis.fetch = fetch
      // @ts-ignore
      globalThis.EventSource = EventSource
    } catch (err) {
      console.error('❌ Please install dependencies: npm install node-fetch eventsource')
      process.exit(1)
    }
  }

  // Run the test
  await testMCPServer()
}

main().catch(console.error)

// Export to make this file a module
export {}
