import { Effect } from 'effect'
import { app } from 'electron'

export const configurePerformanceOptimizations = Effect.sync(() => {
  const switches = [
    'enable-gpu-rasterization',
    'enable-zero-copy',
    'enable-accelerated-video-decode',
    'ignore-gpu-blocklist',
    'enable-native-gpu-memory-buffers',
    'enable-gpu-memory-buffer-video-frames',
    'enable-high-resolution-scrolling',
    'enable-smooth-scrolling',
    'disable-renderer-backgrounding',
    'disable-background-timer-throttling',
    'force_high_performance_gpu'
  ]

  switches.forEach((s) => app.commandLine.appendSwitch(s))
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')
  app.commandLine.appendSwitch('disk-cache-size', (100 * 1024 * 1024).toString())
  app.setMaxListeners(25)
})
