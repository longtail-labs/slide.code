import { createLazyFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'

import { useState, useEffect, useRef } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/classNames'

// We'll use a relative path to the preload script

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

const GameScreen = () => {
  const [webviewStatus, setWebviewStatus] = useState('Loading...')
  const [connectionStatus, setConnectionStatus] = useState('Not Connected')
  const [messages, setMessages] = useState<any[]>([])
  const webviewRef = useRef<HTMLElement>(null)
  const [isScriptActive, setIsScriptActive] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [botScript, setBotScript] = useState(() => {
    return localStorage.getItem('botScript') || DEFAULT_BOT_SCRIPT
  })

  useEffect(() => {
    localStorage.setItem('botScript', botScript)
  }, [botScript])

  const handleSaveScript = () => {
    sendMessageToWebview({
      type: 'load-script',
      script: botScript
    })
    setIsEditorOpen(false)
  }

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
      webview.openDevTools()
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
    // webview.addEventListener('console-message', onConsoleMessage)
    webview.addEventListener('did-start-navigation', onDidStartNavigation)
    webview.addEventListener('ipc-message', onIpcMessage)

    // Cleanup event listeners
    return () => {
      webview.removeEventListener('did-start-loading', onLoadStart)
      webview.removeEventListener('did-stop-loading', onLoadStop)
      webview.removeEventListener('did-finish-load', onDidFinishLoad)
      webview.removeEventListener('did-fail-load', onDidFailLoad)
      webview.removeEventListener('dom-ready', onDomReady)
      // webview.removeEventListener('console-message', onConsoleMessage)
      webview.removeEventListener('did-start-navigation', onDidStartNavigation)
      webview.removeEventListener('ipc-message', onIpcMessage)
    }
  }, [])

  return (
    <motion.div
      className="relative h-full w-full bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Game WebView - Using a reliable test URL */}
      <webview
        ref={webviewRef}
        // src="https://bitsplat.fly.dev/"
        src="http://localhost:3000"
        className="w-full h-full"
        style={{ display: 'flex', minHeight: '100%', minWidth: '100%' }}
        allowpopups={true}
        webpreferences="allowRunningInsecureContent=false,webSecurity=true"
        preload="../../../apps/preload/dist/webview-preload.mjs"
      />

      {/* Bot Script Controls */}
      <div className="absolute bottom-24 left-4 z-50 flex items-center gap-2">
        <button
          className="bg-black/90 text-white p-2 px-3 rounded-full text-sm backdrop-blur-sm pointer-events-auto border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => setIsEditorOpen(true)}
        >
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              isScriptActive ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="font-medium">
            {isScriptActive ? 'Bot Script Active' : 'Bot Script Inactive'}
          </span>
        </button>
        <button
          onClick={() => {
            const webview = webviewRef.current as any
            if (webview) {
              webview.openDevTools()
            }
          }}
          className="bg-black/90 text-white p-2 px-3 rounded-full text-sm backdrop-blur-sm pointer-events-auto border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
        >
          Open Dev Console
        </button>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900/90 text-white border-gray-700 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Edit Bot Script</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Edit the Javascript code for your bot. The bot will run in a sandbox inside the game.
            The script will be saved and reloaded automatically.
          </p>
          <Textarea
            value={botScript}
            onChange={(e) => setBotScript(e.target.value)}
            className="flex-grow font-mono text-sm bg-black/50 border-gray-600 text-gray-200 focus:ring-blue-500"
            placeholder="on('update', (state) => { ... })"
          />
          <DialogFooter>
            <Button onClick={handleSaveScript} className="bg-blue-600 hover:bg-blue-700">
              Save and Reload Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export const Route = createLazyFileRoute('/game')({
  component: GameScreen
})
