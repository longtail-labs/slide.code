const { messages } = require('./db')

const messagesList = document.getElementById('messages')
const messageForm = document.getElementById('add-message-form')
const messageText = document.getElementById('message-text')
const claudeTestBtn = document.getElementById('claude-test-btn')
const claudeResult = document.getElementById('claude-result')

async function renderMessages() {
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const allMessages = messages.find({}).fetch()
  console.log('Rendering messages. Total count:', allMessages.length)
  console.log('Messages:', allMessages)

  messagesList.innerHTML = ''
  allMessages.forEach((message) => {
    const li = document.createElement('li')
    li.textContent = `(${message.from}) ${message.text}`
    messagesList.appendChild(li)
  })
}

// Initial render
console.log('Starting renderer, doing initial render...')
renderMessages()

// Subscribe to changes
messages.on('change', () => {
  console.log('Database changed, re-rendering...')
  renderMessages()
})

// Handle form submission to add a message from the renderer
messageForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = messageText.value.trim()
  if (text) {
    console.log('Renderer creating message:', text)
    messages.insert({ text, from: 'renderer' })
    renderMessages()
  }
})

// Handle Claude Code test button
claudeTestBtn.addEventListener('click', async () => {
  console.log('Claude test button clicked')
  claudeResult.innerHTML = '<p>Calling Claude Code SDK...</p>'

  try {
    // Use IPC to call main process
    const { ipcRenderer } = require('electron')
    const result = await ipcRenderer.invoke('test-claude-code')

    claudeResult.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`

    // Also add to messages for tracking
    messages.insert({
      text: `Claude Code result: ${result.success ? 'Success' : 'Failed'}`,
      from: 'claude-code'
    })
  } catch (error) {
    console.error('Error calling Claude Code:', error)
    claudeResult.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`
  }
})
