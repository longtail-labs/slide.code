import React, { useState, useEffect, useRef, createContext, useContext } from 'react'
import { useRouter } from '@tanstack/react-router'

interface WatchWebviewContextType {
  webviewRef: React.RefObject<any | null>
  isAudible: boolean
  stopPlayback: () => void
}

const WatchWebviewContext = createContext<WatchWebviewContextType | null>(null)

export const useWatchWebview = () => {
  const context = useContext(WatchWebviewContext)
  if (!context) {
    throw new Error('useWatchWebview must be used within a WatchWebviewProvider')
  }
  return context
}

export const WatchWebviewManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const webviewRef = useRef<any>(null)
  const [isAudible, setIsAudible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const isWatchRoute = router.state.location.pathname === '/watch'

  useEffect(() => {
    if (isWatchRoute && !hasLoaded && webviewRef.current) {
      webviewRef.current.src = 'https://www.tbpn.com/'
      setHasLoaded(true)
    }
  }, [isWatchRoute, hasLoaded])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const onMediaStartedPlaying = () => {
      console.log('onMediaStartedPlaying')
      setIsAudible(true)
    }

    const onMediaPaused = () => {
      setIsAudible(false)
    }

    webview.addEventListener('media-started-playing', onMediaStartedPlaying)
    webview.addEventListener('media-paused', onMediaPaused)

    return () => {
      if (webview) {
        webview.removeEventListener('media-started-playing', onMediaStartedPlaying)
        webview.removeEventListener('media-paused', onMediaPaused)
      }
    }
  }, [hasLoaded])

  const stopPlayback = () => {
    const webview = webviewRef.current
    if (webview && hasLoaded) {
      try {
        webview.executeJavaScript(`
          document.querySelectorAll('video, audio').forEach(v => v.pause());
        `)
        if (typeof webview.setAudioMuted === 'function') {
          webview.setAudioMuted(true)
        }
      } catch (error) {
        console.log('WebView not ready for executeJavaScript:', error)
      }
      setIsAudible(false)
    }
  }

  const contextValue: WatchWebviewContextType = {
    webviewRef,
    isAudible,
    stopPlayback
  }

  return (
    <WatchWebviewContext.Provider value={contextValue}>
      <webview
        ref={webviewRef}
        className="fixed inset-0 w-full h-full z-40"
        style={{
          display: isWatchRoute ? 'flex' : 'none',
          minHeight: '100%',
          minWidth: '100%'
        }}
        allowpopups={true}
        webpreferences="allowRunningInsecureContent=false,webSecurity=true"
        preload="../../../apps/preload/dist/webview-preload.mjs"
      />
      {children}
    </WatchWebviewContext.Provider>
  )
}
