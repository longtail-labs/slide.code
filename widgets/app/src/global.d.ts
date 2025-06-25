import type { AppState } from '@slide.code/schema/state'
import type React from 'react'
import type { WebViewElement } from './types/webview'
import type Electron from 'electron'

declare global {
  interface Window {
    electron: null
  }

  namespace JSX {
    interface IntrinsicElements {
      // webview: React.DetailedHTMLProps<React.HTMLAttributes<WebViewElement>, WebViewElement> & {
      webview: Electron.WebviewTag & {
        src?: string
        style?: React.CSSProperties
        webpreferences?: string
        useragent?: string
      }
    }
  }

  interface HTMLElementTagNameMap {
    webview: WebViewElement
  }
}
