import { createLazyFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useReadWebview } from '@/hooks/useReadWebview'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

export const Route = createLazyFileRoute('/read')({
  component: ReadPage
})

function ReadPage() {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const { setWebview, setCanGoBack, goBack, goHome, canGoBack } = useReadWebview()

  useHotkeys('mod+[', goBack)

  useEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      setWebview(webview)

      const updateNavigationState = () => {
        setCanGoBack((webview as any).canGoBack())
      }

      webview.addEventListener('did-finish-load', updateNavigationState)
      webview.addEventListener('did-navigate', updateNavigationState)
      webview.addEventListener('did-navigate-in-page', updateNavigationState)

      return () => {
        webview.removeEventListener('did-finish-load', updateNavigationState)
        webview.removeEventListener('did-navigate', updateNavigationState)
        webview.removeEventListener('did-navigate-in-page', updateNavigationState)
        setWebview(null)
      }
    }
  }, [setWebview, setCanGoBack])

  return (
    <div className="w-full h-full bg-white dark:bg-[#0a0a0a] flex flex-col">
      <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-1 flex items-center gap-x-2">
        <Button variant="ghost" size="icon" onClick={goBack} disabled={!canGoBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={goHome}>
          <Home className="h-4 w-4" />
        </Button>
      </div>
      <webview
        ref={webviewRef}
        src="https://news.ycombinator.com/"
        className="w-full h-full"
        webpreferences="allowRunningInsecureContent=false,webSecurity=true"
      ></webview>
    </div>
  )
}
