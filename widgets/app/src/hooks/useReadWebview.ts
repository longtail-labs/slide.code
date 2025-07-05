import { create, StateCreator } from 'zustand'

export interface ReadWebviewState {
  webview: HTMLWebViewElement | null
  setWebview: (webview: HTMLWebViewElement | null) => void
  canGoBack: boolean
  setCanGoBack: (canGoBack: boolean) => void
  goBack: () => void
  goHome: () => void
}

export const useReadWebview = create<ReadWebviewState>(
  (set, get): ReadWebviewState => ({
    webview: null,
    setWebview: (webview: HTMLWebViewElement | null) => set({ webview }),
    canGoBack: false,
    setCanGoBack: (canGoBack: boolean) => set({ canGoBack }),
    goBack: () => {
      const { webview } = get()
      if (webview && (webview as any).canGoBack()) {
        ;(webview as any).goBack()
      }
    },
    goHome: () => {
      const { webview } = get()
      if (webview) {
        // Assuming the initial src is news.ycombinator.com
        ;(webview as any).src = 'https://news.ycombinator.com/'
      }
    }
  })
)
