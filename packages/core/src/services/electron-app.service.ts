import { app } from 'electron'
import { Effect, Queue, Stream } from 'effect'
import { SlideRuntime } from '../index.js'
import { DefaultLoggerLayer } from '../logger.js'

/**
 * All possible Electron app events
 */
export type AppEvent =
  | { _tag: 'ready'; launchInfo?: Record<string, any> }
  | { _tag: 'will-finish-launching' }
  | { _tag: 'window-all-closed' }
  | { _tag: 'before-quit' }
  | { _tag: 'will-quit' }
  | { _tag: 'quit'; exitCode: number }
  | { _tag: 'activate'; hasVisibleWindows: boolean }
  | { _tag: 'did-become-active' }
  | { _tag: 'did-resign-active' }
  | { _tag: 'new-window-for-tab' }
  | { _tag: 'browser-window-blur'; windowId: number }
  | { _tag: 'browser-window-focus'; windowId: number }
  | { _tag: 'browser-window-created'; windowId: number }
  | { _tag: 'web-contents-created'; webContentsId: number }
  | { _tag: 'certificate-error'; url: string; error: string }
  | { _tag: 'select-client-certificate'; url: string; certificateList: Electron.Certificate[] }
  | {
      _tag: 'login'
      url: string
      authInfo: Pick<Electron.AuthInfo, 'isProxy' | 'scheme' | 'host' | 'port' | 'realm'>
    }
  | { _tag: 'gpu-info-update' }
  | { _tag: 'render-process-gone'; webContentsId: number; reason: string }
  | { _tag: 'child-process-gone'; type: string; reason: string }
  | { _tag: 'accessibility-support-changed'; enabled: boolean }
  | { _tag: 'session-created'; sessionPartition: string }
  | { _tag: 'second-instance'; args: string[]; workingDirectory: string }
  | { _tag: 'desktop-capturer-get-sources' }
  | { _tag: 'shutdown'; signal: string }
  | { _tag: 'open-file'; path: string }
  | { _tag: 'open-url'; url: string }
  | {
      _tag: 'continue-activity'
      type: string
      userInfo: unknown
      details?: { webpageURL?: string }
    }
  | { _tag: 'will-continue-activity'; type: string }
  | { _tag: 'continue-activity-error'; type: string; error: string }
  | { _tag: 'activity-was-continued'; type: string; userInfo: unknown }
  | { _tag: 'update-activity-state'; type: string; userInfo: unknown }
  | { _tag: 'app-command'; event: Electron.Event; command: string }
  | { _tag: 'swipe'; event: Electron.Event; direction: string }
  | { _tag: 'rotate-gesture'; event: Electron.Event; rotation: number }
  | { _tag: 'sheet-begin' }
  | { _tag: 'sheet-end' }

/**
 * Errors that can be thrown by the ElectronEvent service
 */
export class ElectronEventServiceError extends Error {
  readonly _tag = 'ElectronEventServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'ElectronEventServiceError'
  }
}

/**
 * ElectronEventService for handling Electron app events
 */
export class ElectronEventService extends Effect.Service<ElectronEventService>()(
  'ElectronEventService',
  {
    dependencies: [DefaultLoggerLayer],
    scoped: Effect.gen(function* () {
      yield* Effect.logInfo('[ElectronEventService] 🔌 ElectronEventService started')

      // Create bounded queue for events
      const queue = yield* Queue.unbounded<AppEvent>()

      // Create event stream from queue
      const stream = Stream.fromQueue(queue)

      // Helper to publish events
      const publish = (event: AppEvent) => {
        console.log('DEBUGELECTRONEVENT PUBLISHING', JSON.stringify(event, null, 2))
        SlideRuntime.runSync(
          Effect.logInfo(`DEBUGELECTRONEVENT PUBLISHING`, JSON.stringify(event, null, 2)).pipe(
            Effect.andThen(() => Queue.offer(queue, event))
          )
        )
      }

      // Flag to prevent multiple quit attempts
      let isQuitting = false

      // Register a finalizer for cleanup
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Effect.logInfo('[ElectronEventService] 🔌 Cleaning up ElectronEventService')
          console.log('DEBUGELECTRONEVENTSERVICECLEANUP')
          app.removeAllListeners()
          yield* Effect.logInfo(
            '[ElectronEventService] 🔌 ElectronEventService cleaned up successfully'
          )
        })
      )

      // Initialize event listeners
      const initialize = Effect.sync(() => {
        // Basic app lifecycle events
        app.on('will-finish-launching', () => publish({ _tag: 'will-finish-launching' }))
        app.on('ready', (_: Electron.Event, launchInfo: Record<string, any>) =>
          publish({ _tag: 'ready', launchInfo })
        )
        app.on('window-all-closed', () => publish({ _tag: 'window-all-closed' }))
        app.on('before-quit', () => publish({ _tag: 'before-quit' }))
        app.on('will-quit', (event: Electron.Event) => {
          console.log('will-quit event triggered, isQuitting:', isQuitting)

          if (isQuitting) {
            console.log('will-quit: Already quitting, allowing default behavior')
            return // Allow the quit to proceed
          }

          event.preventDefault()
          isQuitting = true
          console.log('will-quit event handler: preventing default and starting async cleanup')

          // Publish the event to the queue for normal handling
          publish({ _tag: 'will-quit' })

          // Handle cleanup asynchronously
          SlideRuntime.runPromise(
            Effect.gen(function* () {
              yield* Effect.logInfo('will-quit: Async cleanup starting')

              // Try to dispose the runtime
              const disposeResult = yield* Effect.exit(SlideRuntime.disposeEffect)

              if (disposeResult._tag === 'Success') {
                yield* Effect.logInfo('will-quit: Runtime disposed successfully, allowing quit')
              } else {
                yield* Effect.logError('will-quit: Error disposing runtime:', disposeResult.cause)
              }

              // Allow the app to quit after cleanup
              yield* Effect.sync(() => {
                console.log('will-quit: Re-triggering quit after cleanup')
                app.quit()
                app.exit(0)

                // Fallback: if app.quit() doesn't work, force exit after a short delay
                // setTimeout(() => {
                //   console.log('will-quit: Fallback - forcing app exit')
                //   app.exit(0)
                // }, 500)
              })
            }).pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logError('will-quit: Critical error during cleanup:', error)
                  yield* Effect.sync(() => {
                    console.log('will-quit: Force quitting after error')
                    app.quit()
                  })
                })
              )
            )
          ).catch((error) => {
            console.error('will-quit: Failed to run cleanup effect:', error)
            app.quit() // Force quit if even the effect runtime fails
          })
        })
        app.on('quit', (_: Electron.Event, exitCode: number) => publish({ _tag: 'quit', exitCode }))
        app.on('activate', (_: Electron.Event, hasVisibleWindows: boolean) =>
          publish({ _tag: 'activate', hasVisibleWindows })
        )

        // macOS specific events
        app.on('did-become-active', () => publish({ _tag: 'did-become-active' }))
        app.on('did-resign-active', () => publish({ _tag: 'did-resign-active' }))
        app.on('new-window-for-tab', () => publish({ _tag: 'new-window-for-tab' }))
        app.on('open-file', (event: Electron.Event, path: string) => {
          event.preventDefault()
          publish({ _tag: 'open-file', path })
        })
        app.on('open-url', (event: Electron.Event, url: string) => {
          event.preventDefault()
          publish({ _tag: 'open-url', url })
        })
        app.on(
          'continue-activity',
          (
            event: Electron.Event,
            type: string,
            userInfo: unknown,
            details?: { webpageURL?: string }
          ) => {
            event.preventDefault()
            publish({ _tag: 'continue-activity', type, userInfo, details })
          }
        )
        app.on('will-continue-activity', (event: Electron.Event, type: string) => {
          event.preventDefault()
          publish({ _tag: 'will-continue-activity', type })
        })
        app.on('continue-activity-error', (_: Electron.Event, type: string, error: string) => {
          publish({ _tag: 'continue-activity-error', type, error })
        })
        app.on('activity-was-continued', (_: Electron.Event, type: string, userInfo: unknown) => {
          publish({ _tag: 'activity-was-continued', type, userInfo })
        })
        app.on(
          'update-activity-state',
          (event: Electron.Event, type: string, userInfo: unknown) => {
            event.preventDefault()
            publish({ _tag: 'update-activity-state', type, userInfo })
          }
        )
        app.on('app-command' as any, (event: Electron.Event, command: string) => {
          publish({ _tag: 'app-command', event, command })
        })
        app.on('swipe' as any, (event: Electron.Event, direction: string) => {
          publish({ _tag: 'swipe', event, direction })
        })
        app.on('rotate-gesture' as any, (event: Electron.Event, rotation: number) => {
          publish({ _tag: 'rotate-gesture', event, rotation })
        })
        app.on('sheet-begin' as any, () => {
          publish({ _tag: 'sheet-begin' })
        })
        app.on('sheet-end' as any, () => {
          publish({ _tag: 'sheet-end' })
        })

        // Window events
        app.on('browser-window-blur', (_, window) =>
          publish({ _tag: 'browser-window-blur', windowId: window.id })
        )
        app.on('browser-window-focus', (_, window) =>
          publish({ _tag: 'browser-window-focus', windowId: window.id })
        )
        app.on('browser-window-created', (_, window) =>
          publish({ _tag: 'browser-window-created', windowId: window.id })
        )

        // Web contents events
        app.on('web-contents-created', (_, contents) =>
          publish({ _tag: 'web-contents-created', webContentsId: contents.id })
        )

        // Security events
        app.on('certificate-error', (_, __, url, error) =>
          publish({ _tag: 'certificate-error', url, error })
        )
        app.on('select-client-certificate', (_, __, url, list) =>
          publish({ _tag: 'select-client-certificate', url, certificateList: list })
        )
        app.on(
          'login',
          (
            event: Electron.Event,
            _: Electron.WebContents,
            details: { url: string; pid: number },
            authInfo: Electron.AuthInfo,
            callback: () => void
          ) => {
            event.preventDefault()
            publish({
              _tag: 'login',
              url: details.url,
              authInfo: {
                isProxy: authInfo.isProxy,
                scheme: authInfo.scheme,
                host: authInfo.host,
                port: authInfo.port,
                realm: authInfo.realm
              }
            })
            callback()
          }
        )

        // Process events
        app.on('gpu-info-update', () => publish({ _tag: 'gpu-info-update' }))
        app.on('render-process-gone', (_, webContents, details) =>
          publish({
            _tag: 'render-process-gone',
            webContentsId: webContents.id,
            reason: details.reason
          })
        )
        app.on('child-process-gone', (_, details) =>
          publish({ _tag: 'child-process-gone', type: details.type, reason: details.reason })
        )

        // Accessibility
        app.on('accessibility-support-changed', (_, enabled) =>
          publish({ _tag: 'accessibility-support-changed', enabled })
        )

        // Session
        app.on('session-created', (session) => {
          const storagePath = session.getStoragePath()
          if (storagePath) {
            publish({ _tag: 'session-created', sessionPartition: storagePath })
          }
        })

        // Instance management
        app.on('second-instance', (_: Electron.Event, args: string[], workingDirectory: string) =>
          publish({ _tag: 'second-instance', args, workingDirectory })
        )
      })

      // Return service implementation
      return {
        queue,
        stream,
        initialize,
        isReady: Effect.sync(() => app.isReady()),
        whenReady: Effect.promise(() => app.whenReady()),
        quit: Effect.sync(() => app.quit()),
        exit: (code?: number) => Effect.sync(() => app.exit(code)),
        relaunch: (options?: { args?: string[]; execPath?: string }) =>
          Effect.sync(() => app.relaunch(options)),
        focus: (options?: { steal: boolean }) => Effect.sync(() => app.focus(options)),
        hide: Effect.sync(() => app.hide()),
        show: Effect.sync(() => app.show()),
        isHidden: Effect.sync(() => app.isHidden()),
        setAppUserModelId: (id: string) => Effect.sync(() => app.setAppUserModelId(id)),
        setActivationPolicy: (policy: 'regular' | 'accessory' | 'prohibited') =>
          Effect.sync(() => app.setActivationPolicy(policy)),
        configureHostResolver: (options: {
          enableBuiltInResolver?: boolean
          secureDnsMode?: 'off' | 'automatic' | 'secure'
          secureDnsServers?: string[]
          enableAdditionalDnsQueryTypes?: boolean
        }) => Effect.sync(() => app.configureHostResolver(options)),
        disableHardwareAcceleration: Effect.sync(() => app.disableHardwareAcceleration()),
        disableDomainBlockingFor3DAPIs: Effect.sync(() => app.disableDomainBlockingFor3DAPIs()),
        getAppMetrics: Effect.sync(() => app.getAppMetrics()),
        getGPUFeatureStatus: Effect.sync(() => app.getGPUFeatureStatus()),
        getGPUInfo: (infoType: 'basic' | 'complete') => Effect.sync(() => app.getGPUInfo(infoType)),
        setBadgeCount: (count?: number) => Effect.sync(() => app.setBadgeCount(count)),
        getBadgeCount: Effect.sync(() => app.getBadgeCount()),
        isUnityRunning: Effect.sync(() => app.isUnityRunning()),
        getLoginItemSettings: (options?: {
          type?: 'mainAppService' | 'agentService' | 'daemonService' | 'loginItemService'
          serviceName?: string
          path?: string
          args?: string[]
        }) => Effect.sync(() => app.getLoginItemSettings(options)),
        setLoginItemSettings: (settings: {
          openAtLogin?: boolean
          openAsHidden?: boolean
          type?: 'mainAppService' | 'agentService' | 'daemonService' | 'loginItemService'
          serviceName?: string
          path?: string
          args?: string[]
          enabled?: boolean
          name?: string
        }) => Effect.sync(() => app.setLoginItemSettings(settings)),
        isAccessibilitySupportEnabled: Effect.sync(() => app.isAccessibilitySupportEnabled()),
        setAccessibilitySupportEnabled: (enabled: boolean) =>
          Effect.sync(() => app.setAccessibilitySupportEnabled(enabled)),
        showAboutPanel: Effect.sync(() => app.showAboutPanel()),
        setAboutPanelOptions: (options: {
          applicationName?: string
          applicationVersion?: string
          copyright?: string
          version?: string
          credits?: string
          authors?: string[]
          website?: string
          iconPath?: string
        }) => Effect.sync(() => app.setAboutPanelOptions(options)),
        isEmojiPanelSupported: Effect.sync(() => app.isEmojiPanelSupported()),
        showEmojiPanel: Effect.sync(() => app.showEmojiPanel()),
        startAccessingSecurityScopedResource: (bookmarkData: string) =>
          Effect.sync(() => {
            const stopAccessing = app.startAccessingSecurityScopedResource(bookmarkData)
            stopAccessing()
          }),
        enableSandbox: Effect.sync(() => app.enableSandbox()),
        isInApplicationsFolder: Effect.sync(() => app.isInApplicationsFolder()),
        moveToApplicationsFolder: (options?: {
          conflictHandler?: (conflictType: string) => boolean
        }) => Effect.sync(() => app.moveToApplicationsFolder(options)),
        isSecureKeyboardEntryEnabled: Effect.sync(() => app.isSecureKeyboardEntryEnabled()),
        setSecureKeyboardEntryEnabled: (enabled: boolean) =>
          Effect.sync(() => app.setSecureKeyboardEntryEnabled(enabled)),
        setProxy: (config: Electron.ProxyConfig) => Effect.sync(() => app.setProxy(config)),
        resolveProxy: (url: string) => Effect.sync(() => app.resolveProxy(url)),
        setClientCertRequestPasswordHandler: (
          handler: (params: {
            hostname: string
            tokenName: string
            isRetry: boolean
          }) => Promise<string>
        ) => Effect.sync(() => app.setClientCertRequestPasswordHandler(handler)),
        getName: Effect.sync(() => app.getName()),
        getVersion: Effect.sync(() => app.getVersion())
      }
    })
  }
) {}

/**
 * Service interface for handling Electron app events
 * This interface is kept for backward compatibility
 */
export interface IElectronEventService {
  /**
   * Queue for publishing app events
   */
  readonly queue: Queue.Queue<AppEvent>

  /**
   * Stream of app events
   */
  readonly stream: Stream.Stream<AppEvent>

  /**
   * Initialize app event listeners
   */
  readonly initialize: Effect.Effect<void>

  /**
   * Check if app is ready
   */
  readonly isReady: Effect.Effect<boolean>

  /**
   * Wait for app to be ready
   */
  readonly whenReady: Effect.Effect<void>

  /**
   * Quit the app
   */
  readonly quit: Effect.Effect<void>

  /**
   * Force quit the app
   */
  readonly exit: (code?: number) => Effect.Effect<void>

  /**
   * Relaunch the app
   */
  readonly relaunch: (options?: { args?: string[]; execPath?: string }) => Effect.Effect<void>

  /**
   * Focus the app
   */
  readonly focus: (options?: { steal: boolean }) => Effect.Effect<void>

  /**
   * Hide the app (macOS only)
   */
  readonly hide: Effect.Effect<void>

  /**
   * Show the app (macOS only)
   */
  readonly show: Effect.Effect<void>

  /**
   * Check if app is hidden (macOS only)
   */
  readonly isHidden: Effect.Effect<boolean>

  /**
   * Set the app user model ID (Windows only)
   */
  readonly setAppUserModelId: (id: string) => Effect.Effect<void>

  /**
   * Set the activation policy (macOS only)
   */
  readonly setActivationPolicy: (
    policy: 'regular' | 'accessory' | 'prohibited'
  ) => Effect.Effect<void>

  /**
   * Configure host resolver
   */
  readonly configureHostResolver: (options: {
    enableBuiltInResolver?: boolean
    secureDnsMode?: 'off' | 'automatic' | 'secure'
    secureDnsServers?: string[]
    enableAdditionalDnsQueryTypes?: boolean
  }) => Effect.Effect<void>

  /**
   * Disable hardware acceleration
   */
  readonly disableHardwareAcceleration: Effect.Effect<void>

  /**
   * Disable domain blocking for 3D APIs
   */
  readonly disableDomainBlockingFor3DAPIs: Effect.Effect<void>

  /**
   * Get app metrics
   */
  readonly getAppMetrics: Effect.Effect<Electron.ProcessMetric[]>

  /**
   * Get GPU feature status
   */
  readonly getGPUFeatureStatus: Effect.Effect<Electron.GPUFeatureStatus>

  /**
   * Get GPU info
   */
  readonly getGPUInfo: (infoType: 'basic' | 'complete') => Effect.Effect<unknown>

  /**
   * Set badge count (Linux, macOS)
   */
  readonly setBadgeCount: (count?: number) => Effect.Effect<boolean>

  /**
   * Get badge count (Linux, macOS)
   */
  readonly getBadgeCount: Effect.Effect<number>

  /**
   * Check if running under Unity (Linux)
   */
  readonly isUnityRunning: Effect.Effect<boolean>

  /**
   * Get/Set login item settings
   */
  readonly getLoginItemSettings: (options?: {
    type?: 'mainAppService' | 'agentService' | 'daemonService' | 'loginItemService'
    serviceName?: string
    path?: string
    args?: string[]
  }) => Effect.Effect<Electron.LoginItemSettings>

  readonly setLoginItemSettings: (settings: {
    openAtLogin?: boolean
    openAsHidden?: boolean
    type?: 'mainAppService' | 'agentService' | 'daemonService' | 'loginItemService'
    serviceName?: string
    path?: string
    args?: string[]
    enabled?: boolean
    name?: string
  }) => Effect.Effect<void>

  /**
   * Check if accessibility support is enabled
   */
  readonly isAccessibilitySupportEnabled: Effect.Effect<boolean>

  /**
   * Set accessibility support enabled
   */
  readonly setAccessibilitySupportEnabled: (enabled: boolean) => Effect.Effect<void>

  /**
   * Show about panel
   */
  readonly showAboutPanel: Effect.Effect<void>

  /**
   * Set about panel options
   */
  readonly setAboutPanelOptions: (options: {
    applicationName?: string
    applicationVersion?: string
    copyright?: string
    version?: string
    credits?: string
    authors?: string[]
    website?: string
    iconPath?: string
  }) => Effect.Effect<void>

  /**
   * Check if emoji panel is supported
   */
  readonly isEmojiPanelSupported: Effect.Effect<boolean>

  /**
   * Show emoji panel
   */
  readonly showEmojiPanel: Effect.Effect<void>

  /**
   * Start accessing security scoped resource (MAS)
   */
  readonly startAccessingSecurityScopedResource: (bookmarkData: string) => Effect.Effect<void>

  /**
   * Enable sandbox mode
   */
  readonly enableSandbox: Effect.Effect<void>

  /**
   * Check if app is in Applications folder (macOS)
   */
  readonly isInApplicationsFolder: Effect.Effect<boolean>

  /**
   * Move to Applications folder (macOS)
   */
  readonly moveToApplicationsFolder: (options?: {
    conflictHandler?: (conflictType: string) => boolean
  }) => Effect.Effect<boolean>

  /**
   * Check/Set secure keyboard entry (macOS)
   */
  readonly isSecureKeyboardEntryEnabled: Effect.Effect<boolean>
  readonly setSecureKeyboardEntryEnabled: (enabled: boolean) => Effect.Effect<void>

  /**
   * Set proxy settings
   */
  readonly setProxy: (config: Electron.ProxyConfig) => Effect.Effect<void>

  /**
   * Resolve proxy for URL
   */
  readonly resolveProxy: (url: string) => Effect.Effect<Promise<string>>

  /**
   * Set client certificate request password handler
   */
  readonly setClientCertRequestPasswordHandler: (
    handler: (params: { hostname: string; tokenName: string; isRetry: boolean }) => Promise<string>
  ) => Effect.Effect<void>

  /**
   * Get the current application's name from package.json
   */
  readonly getName: Effect.Effect<string>

  /**
   * Get the current application's version from package.json
   */
  readonly getVersion: Effect.Effect<string>
}
