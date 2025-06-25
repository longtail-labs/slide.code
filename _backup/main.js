const { app, BaseWindow, WebContentsView, ipcMain } = require('electron')
const path = require('path')
const { effect } = require('@maverick-js/signals')
const { messages } = require('./db')
const { query } = require('@anthropic-ai/claude-code')

// Set up reactive effects
effect(() => {
  const messageCount = messages.find({}).count()
  console.log('Reactive effect triggered - Total messages:', messageCount)
})

// React to messages from main process
effect(() => {
  const mainMessages = messages.find({ from: 'main' }).fetch()
  console.log('Main process messages count:', mainMessages.length)
  if (mainMessages.length > 0) {
    console.log('Latest main message:', mainMessages[mainMessages.length - 1])
  }
})

// React to messages from renderer
effect(() => {
  const rendererMessages = messages.find({ from: 'renderer' }).fetch()
  console.log('Renderer messages count:', rendererMessages.length)
  if (rendererMessages.length > 0) {
    console.log('Latest renderer message:', rendererMessages[rendererMessages.length - 1])
  }
})

// Add a message from the main process every 10 seconds
setInterval(() => {
  const messageText = `Message from main process at ${new Date().toLocaleTimeString()}`
  console.log('Main process creating message:', messageText)
  messages.insert({
    text: messageText,
    from: 'main'
  })
}, 10000)

// IPC handler for Claude Code testing
ipcMain.handle('test-claude-code', async () => {
  console.log('Handling Claude Code test request...')

  // // Check if API key is set
  // if (!process.env.ANTHROPIC_API_KEY) {
  //   console.error('ANTHROPIC_API_KEY environment variable is not set')
  //   return {
  //     success: false,
  //     error:
  //       'ANTHROPIC_API_KEY environment variable is not set. Please set it before using Claude Code SDK.',
  //     timestamp: new Date().toISOString()
  //   }
  // }

  try {
    const messages = []

    // Basic test prompt
    const testPrompt =
      "Create a simple test.txt file with the content 'Hello from Claude Code SDK!' and explain what you did."

    console.log('Sending prompt to Claude Code:', testPrompt)
    console.log('API Key configured:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No')

    for await (const message of query({
      prompt: testPrompt,
      abortController: new AbortController(),
      options: {
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
        model: 'claude-3-5-sonnet-20241022' // Specify a valid model
      }
    })) {
      console.log('Claude message:', message)
      messages.push(message)

      if (message.type === 'assistant') {
        console.log('Claude response:', message.message.content)
      } else if (message.type === 'result') {
        console.log('Claude result:', message.subtype)
        if (message.subtype === 'success') {
          console.log('Final result:', message.result)
        }
      }
    }

    // Return summary
    const result = {
      success: true,
      prompt: testPrompt,
      messageCount: messages.length,
      cost: messages.find((m) => m.type === 'result')?.total_cost_usd || 0,
      finalResult: messages.find((m) => m.type === 'result')?.result || 'No final result',
      timestamp: new Date().toISOString()
    }

    console.log('Claude Code test completed:', result)
    return result
  } catch (error) {
    console.error('Error in Claude Code test:', error)
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
})

function createWindow() {
  const win = new BaseWindow({ width: 800, height: 600 })

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })
  win.contentView.addChildView(view)
  view.webContents.loadFile('index.html')

  view.webContents.openDevTools()

  const { width, height } = win.getBounds()
  view.setBounds({ x: 0, y: 0, width, height })

  win.on('closed', () => {
    view.webContents.close()
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
