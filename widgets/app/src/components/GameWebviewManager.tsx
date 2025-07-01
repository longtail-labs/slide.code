import React, { useState, useEffect, useRef, createContext, useContext } from 'react'
import { useRouter } from '@tanstack/react-router'

const DEFAULT_BOT_SCRIPT = `
console.log('🤖 Executing Simplified Sandboxed Bot Script...');
let lastMove = 0;

// Bot listens for game updates
on('update', (state) => {
  // console.log('🤖 Bot received state update via SDK:', state);
  
  // --- Basic checks before acting ---
  if (state.roundState !== 'In Progress') return;
  if (!state.player || state.player.bits === 0) return;
  
  const now = Date.now();
  if (now - lastMove < 1000) return; // 1s cooldown

  console.log('🤖 Bot Activated. Looking for a random target...');
  
  const myTeam = state.player.teamId;
  const grid = state.grid;
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;

  // Pick a random cell
  const x = Math.floor(Math.random() * gridWidth);
  const y = Math.floor(Math.random() * gridHeight);

  // If the random cell isn't ours, take it
  if (grid[y][x] !== myTeam) {
    console.log(\`🤖 Randomly chose target at (\${x}, \${y}), owned by \${grid[y][x]}. Placing bit.\`);
    place(x, y);
    lastMove = now; // Set cooldown after action
  } else {
    // console.log(\`🤖 Randomly chose own cell at (\${x}, \${y}). Skipping this turn.\`);
  }
});
`.trim()

interface GameWebviewContextType {
  webviewRef: React.RefObject<HTMLElement | null>
  isScriptActive: boolean
  sendMessageToWebview: (message: any) => void
  loadScript: (script: string) => void
  botScript: string
  setBotScript: (script: string) => void
}

const GameWebviewContext = createContext<GameWebviewContextType | null>(null)

export const useGameWebview = () => {
  const context = useContext(GameWebviewContext)
  if (!context) {
    throw new Error('useGameWebview must be used within GameWebviewProvider')
  }
  return context
}

interface GameWebviewManagerProps {
  children: React.ReactNode
}

export const GameWebviewManager: React.FC<GameWebviewManagerProps> = ({ children }) => {
  const router = useRouter()
  const [webviewStatus, setWebviewStatus] = useState('Loading...')
  const [connectionStatus, setConnectionStatus] = useState('Not Connected')
  const [messages, setMessages] = useState<any[]>([])
  const webviewRef = useRef<HTMLElement>(null)
  const [isScriptActive, setIsScriptActive] = useState(false)
  const [botScript, setBotScript] = useState(() => {
    return localStorage.getItem('botScript') || DEFAULT_BOT_SCRIPT
  })

  // Save script to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('botScript', botScript)
  }, [botScript])

  const sendMessageToWebview = (message: any) => {
    const webview = webviewRef.current as any
    if (webview) {
      console.log('Host: Sending message to webview:', message)
      webview.send('host-message', message)
      setMessages((prev) => [
        ...prev,
        { direction: 'to-webview', data: message, timestamp: Date.now() }
      ])
    } else {
      console.warn('Webview not available')
    }
  }

  const loadScript = (script: string) => {
    setBotScript(script)
    sendMessageToWebview({
      type: 'load-script',
      script: script
    })
  }

  // Check if we're currently on the game route
  const isGameRoute = router.state.location.pathname === '/game'

  useEffect(() => {
    const webview = webviewRef.current as any
    if (!webview) return

    // Add event listeners for webview lifecycle
    const onLoadStart = () => {
      console.log('Webview: Load started')
      setWebviewStatus('Loading...')
    }

    const onLoadStop = () => {
      console.log('Webview: Load stopped')
      setWebviewStatus('Loaded')
    }

    const onDidFinishLoad = () => {
      console.log('Webview: Did finish load')
      setWebviewStatus('Ready')
      setConnectionStatus('Connected')
    }

    const onDidFailLoad = (event: any) => {
      console.error('Webview: Load failed', event)
      setWebviewStatus(`Failed: ${event.errorDescription || 'Unknown error'}`)
      setConnectionStatus('Error')
    }

    const onDomReady = () => {
      console.log('Webview: DOM ready')
      if (isGameRoute) {
        webview.openDevTools()
      }
    }

    const onConsoleMessage = (event: any) => {
      console.log('Webview console:', event.message)
    }

    const onDidStartNavigation = (event: any) => {
      console.log('Webview: Navigation started to', event.url)
    }

    // Listen for messages from webview
    const onIpcMessage = (event: any) => {
      console.log('DEBUGWEBVIEW: Received IPC message from webview:', event.channel, event.args)
      setMessages((prev) => [
        ...prev,
        {
          direction: 'from-webview',
          data: { channel: event.channel, args: event.args },
          timestamp: Date.now()
        }
      ])

      // Handle specific message types
      if (event.channel === 'webview-ready') {
        setConnectionStatus('Connected')
        sendMessageToWebview({
          type: 'load-script',
          script: botScript
        })
      } else if (event.channel === 'webpage-message') {
        console.log('Host: Received message from webpage:', event.args[0])
        const { message } = event.args[0]
        if (message && message.event === 'bot-script-loaded') {
          if (message.status === 'success') {
            setIsScriptActive(true)
          } else {
            setIsScriptActive(false)
          }
        }
      }
    }

    // Add event listeners
    webview.addEventListener('did-start-loading', onLoadStart)
    webview.addEventListener('did-stop-loading', onLoadStop)
    webview.addEventListener('did-finish-load', onDidFinishLoad)
    webview.addEventListener('did-fail-load', onDidFailLoad)
    webview.addEventListener('dom-ready', onDomReady)
    webview.addEventListener('did-start-navigation', onDidStartNavigation)
    webview.addEventListener('ipc-message', onIpcMessage)

    // Cleanup event listeners
    return () => {
      webview.removeEventListener('did-start-loading', onLoadStart)
      webview.removeEventListener('did-stop-loading', onLoadStop)
      webview.removeEventListener('did-finish-load', onDidFinishLoad)
      webview.removeEventListener('did-fail-load', onDidFailLoad)
      webview.removeEventListener('dom-ready', onDomReady)
      webview.removeEventListener('did-start-navigation', onDidStartNavigation)
      webview.removeEventListener('ipc-message', onIpcMessage)
    }
  }, [isGameRoute, botScript])

  const contextValue: GameWebviewContextType = {
    webviewRef,
    isScriptActive,
    sendMessageToWebview,
    loadScript,
    botScript,
    setBotScript
  }

  return (
    <GameWebviewContext.Provider value={contextValue}>
      {/* Persistent webview - always in DOM but hidden when not on game route */}
      <webview
        ref={webviewRef}
        src="http://localhost:3000"
        className="fixed inset-0 w-full h-full z-40"
        style={{
          display: isGameRoute ? 'flex' : 'none',
          minHeight: '100%',
          minWidth: '100%'
        }}
        allowpopups={true}
        webpreferences="allowRunningInsecureContent=false,webSecurity=true"
        preload="../../../apps/preload/dist/webview-preload.mjs"
      />
      {children}
    </GameWebviewContext.Provider>
  )
}
