const { ipcRenderer, contextBridge } = require('electron')

console.log('Webview preload script loaded')

// Listen for messages from the host
ipcRenderer.on('host-message', (event: any, message: any) => {
  console.log('Webview: Received message from host:', message)

  // Forward the message to the webpage via custom event
  const customEvent = new CustomEvent('electron-host-message', {
    detail: message
  })
  window.dispatchEvent(customEvent)

  // Echo back with a response
  ipcRenderer.sendToHost('host-response', {
    type: 'response',
    original: message,
    timestamp: Date.now(),
    message: `Webview received: ${JSON.stringify(message)}`
  })
})

setTimeout(() => {
  console.log('DEBUGWEBVIEW: Sending webview-ready message to host')
  ipcRenderer.sendToHost('webview-ready', {
    message: 'Webview is ready!',
    timestamp: Date.now()
  })
}, 5000)

// Expose functions to the webpage context
contextBridge.exposeInMainWorld('electronAPI', {
  // Allow webpage to send messages back to Electron host
  sendToHost: (message: any) => {
    console.log('DEBUGWEBVIEW: Sending message to host:', message)
    ipcRenderer.sendToHost('webpage-message', {
      type: 'from-webpage',
      message,
      timestamp: Date.now()
    })
  },

  // Allow webpage to listen for host messages (alternative to events)
  onHostMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('host-message', (event: any, message: any) => {
      callback(message)
    })
  }
})


console.log('Webview preload script setup complete')
