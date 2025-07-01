import { query, type SDKMessage } from '@anthropic-ai/claude-code'

console.log('Testing MCP Prompts...\n')

const messages: SDKMessage[] = []

for await (const message of query({
  prompt: 'Now create a python one',
  abortController: new AbortController(),
  options: {
    cwd: './outputs',
    maxTurns: 10,
    permissionMode: 'bypassPermissions',
    resume: '1d397da9-8a89-4066-807d-f01ab5dd885a'
  }
})) {
  messages.push(message)

  console.log('MESSAGE', message)

  // if (message.type === 'assistant') {
  //   console.log('Assistant:', message.message.content)
  // } else if (message.type === 'result') {
  //   console.log('Result:', message.subtype)
  //   if (message.subtype === 'success') {
  //     console.log('Final result:', message.result)
  //   }
  // }
}

// console.log(JSON.stringify(messages, null, 2))

console.log('\n--- Prompt Test Complete ---')
