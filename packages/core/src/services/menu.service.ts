import { Menu, type MenuItemConstructorOptions } from 'electron'
import { Effect } from 'effect'
import { PubSubClient } from './pubsub.service.js'
import {
  createCheckForUpdates,
  createEnterFocusMode,
  createCopyCurrentUrl,
  createOpenCommandBar,
  createGoBack,
  createGoForward,
  createReload,
  createShareCurrentPage,
  createShareSlide,
  createZoomIn,
  createZoomOut,
  createResetZoom,
  createScrollToTop,
  createScrollToBottom,
  createToggleAudioMute,
  createFindInPage,
  createToggleDeveloperTools,
  createInspectElement,
  createCurrentObjectRemoved,
  createToggleTheme,
  createGoToNextObject,
  createGoToPreviousObject,
  createOpenSlideFolder,
  createShowCurrentTaskNote,
  createSaveSelectedTextToNote,
  createShowUpdateDialog
} from '@slide.code/schema/messages'
import { DefaultLoggerLayer } from '../logger.js'
import { SlideRuntime } from '../index.js'

/**
 * All possible menu events
 */
export type MenuEvent =
  | { _tag: 'open_settings' }
  | { _tag: 'share_current_object' }
  | { _tag: 'share_slide' }
  | { _tag: 'set_default_browser' }
  | { _tag: 'check_for_updates' }
  | { _tag: 'open_privacy_policy' }
  | { _tag: 'open_keyboard_shortcuts' }
  | { _tag: 'new_tab' }
  | { _tag: 'open_object_command_bar' }
  | { _tag: 'close_tab' }
  | { _tag: 'open_command_bar' }
  | { _tag: 'quick_switch_object'; taskId?: string }
  | { _tag: 'quick_switch_task' }
  | { _tag: 'print' }
  | { _tag: 'save_page_as'; path?: string; format?: string }
  | { _tag: 'save_as_pdf' }
  | { _tag: 'capture_page' }
  | { _tag: 'copy_current_url' }
  | { _tag: 'go_back' }
  | { _tag: 'go_forward' }
  | { _tag: 'go_to_previous_object' }
  | { _tag: 'go_to_next_object' }
  | { _tag: 'enter_focus_mode' }
  | { _tag: 'zoom_in' }
  | { _tag: 'zoom_out' }
  | { _tag: 'reset_zoom' }
  | { _tag: 'reload' }
  | { _tag: 'scroll_to_top' }
  | { _tag: 'scroll_to_bottom' }
  | { _tag: 'toggle_audio_mute' }
  | { _tag: 'find_in_page'; query?: string }
  | { _tag: 'toggle_developer_tools' }
  | { _tag: 'inspect_element'; x?: number; y?: number }
  | { _tag: 'toggle_dark_mode' }
  | { _tag: 'open_slide_folder' }
  | { _tag: 'go_to_note' }
  | { _tag: 'save_note' }
  | { _tag: 'save_and_go_to_note' }

/**
 * Errors that can be thrown by the Menu service
 */
export class MenuServiceError extends Error {
  readonly _tag = 'MenuServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'MenuServiceError'
  }
}

/**
 * MenuService for managing application menus
 */
export class MenuService extends Effect.Service<MenuService>()('MenuService', {
  dependencies: [PubSubClient.Default, DefaultLoggerLayer],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('🍔 MenuService started')

    const pubsub = yield* PubSubClient

    // Service state
    let menu: Menu | null = null

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🍔 Cleaning up MenuService resources')
        menu = null
        Menu.setApplicationMenu(null)
        yield* Effect.logInfo('🍔 Application menu cleaned up')
      })
    )

    /**
     * Publish a menu event
     */
    const publishMenuEvent = (event: MenuEvent) => {
      SlideRuntime.runPromise(Effect.logInfo(`Menu event: ${event._tag}`, JSON.stringify(event)))

      // Match on the event type and handle accordingly
      switch (event._tag) {
        case 'check_for_updates':
          // Publish the check for updates message to pubsub
          SlideRuntime.runFork(pubsub.publish(createShowUpdateDialog(true)))
          break
        case 'enter_focus_mode':
          // Publish the enter focus mode message to pubsub
          SlideRuntime.runFork(pubsub.publish(createEnterFocusMode()))
          break
        case 'copy_current_url':
          SlideRuntime.runFork(pubsub.publish(createCopyCurrentUrl()))
          break
        case 'quick_switch_task':
          SlideRuntime.runFork(pubsub.publish(createOpenCommandBar('view-tasks')))
          break
        case 'quick_switch_object':
          SlideRuntime.runFork(pubsub.publish(createOpenCommandBar('view-objects')))
          break
        case 'open_object_command_bar':
          SlideRuntime.runFork(pubsub.publish(createOpenCommandBar('current-object-actions')))
          break
        case 'open_command_bar':
          SlideRuntime.runFork(pubsub.publish(createOpenCommandBar()))
          break
        case 'new_tab':
          SlideRuntime.runFork(pubsub.publish(createOpenCommandBar('new-tab')))
          break
        case 'reload':
          SlideRuntime.runFork(pubsub.publish(createReload()))
          break
        case 'go_back':
          SlideRuntime.runFork(pubsub.publish(createGoBack()))
          break
        case 'go_forward':
          SlideRuntime.runFork(pubsub.publish(createGoForward()))
          break
        case 'share_slide':
          SlideRuntime.runFork(pubsub.publish(createShareSlide()))
          break
        case 'share_current_object':
          SlideRuntime.runFork(pubsub.publish(createShareCurrentPage()))
          break
        case 'close_tab':
          SlideRuntime.runFork(pubsub.publish(createCurrentObjectRemoved()))
          break
        case 'zoom_in':
          SlideRuntime.runFork(pubsub.publish(createZoomIn()))
          break
        case 'zoom_out':
          SlideRuntime.runFork(pubsub.publish(createZoomOut()))
          break
        case 'reset_zoom':
          SlideRuntime.runFork(pubsub.publish(createResetZoom()))
          break
        case 'scroll_to_top':
          SlideRuntime.runFork(pubsub.publish(createScrollToTop()))
          break
        case 'scroll_to_bottom':
          SlideRuntime.runFork(pubsub.publish(createScrollToBottom()))
          break
        case 'toggle_audio_mute':
          SlideRuntime.runFork(pubsub.publish(createToggleAudioMute()))
          break
        case 'find_in_page':
          SlideRuntime.runFork(pubsub.publish(createFindInPage(event.query)))
          break
        case 'toggle_developer_tools':
          SlideRuntime.runFork(pubsub.publish(createToggleDeveloperTools()))
          break
        case 'inspect_element':
          SlideRuntime.runFork(pubsub.publish(createInspectElement(event.x, event.y)))
          break
        case 'toggle_dark_mode':
          SlideRuntime.runFork(pubsub.publish(createToggleTheme()))
          break
        case 'go_to_next_object':
          SlideRuntime.runFork(pubsub.publish(createGoToNextObject()))
          break
        case 'go_to_previous_object':
          SlideRuntime.runFork(pubsub.publish(createGoToPreviousObject()))
          break
        case 'open_slide_folder':
          SlideRuntime.runFork(pubsub.publish(createOpenSlideFolder()))
          break
        case 'go_to_note':
          SlideRuntime.runFork(pubsub.publish(createShowCurrentTaskNote()))
          break
        case 'save_note':
          // Dispatch command to save selected text to note
          SlideRuntime.runFork(pubsub.publish(createSaveSelectedTextToNote()))
          break
        case 'save_and_go_to_note':
          // TODO: Implement save and go to note functionality
          break
        default:
          // Publish the event to pubsub
          // Effect.runPromise(pubsub.publish(event))
          break
      }
    }

    /**
     * Build the Polka menu
     */
    const buildPolkaMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'Polka',
        submenu: [
          { role: 'about' as const },
          // {
          //   label: 'Settings',
          //   accelerator: 'CmdOrCtrl+,',
          //   click: () => publishMenuEvent({ _tag: 'open_settings' })
          // },
          {
            label: 'Share Slide',
            click: () => publishMenuEvent({ _tag: 'share_slide' })
          },
          // {
          //   label: 'Set as Default Browser',
          //   click: () => publishMenuEvent({ _tag: 'set_default_browser' })
          // },
          { type: 'separator' as const },
          {
            label: 'Open Slide Folder',
            click: () => publishMenuEvent({ _tag: 'open_slide_folder' })
          },
          {
            label: 'Check for Updates',
            click: () => {
              // Also publish to the update service
              // Effect.runPromise(pubsub.publish(createCheckForUpdates()))
              publishMenuEvent({ _tag: 'check_for_updates' })
            }
          },
          { type: 'separator' as const },
          {
            label: 'Privacy Policy',
            click: () => publishMenuEvent({ _tag: 'open_privacy_policy' })
          },
          {
            label: 'Keyboard Shortcuts',
            accelerator: 'CmdOrCtrl+/',
            click: () => publishMenuEvent({ _tag: 'open_keyboard_shortcuts' })
          },
          { role: 'quit' as const }
        ]
      }
    }

    /**
     * Build the File menu
     */
    const buildObjectMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'Object',
        submenu: [
          {
            label: 'New Tab',
            accelerator: 'CmdOrCtrl+T',
            click: () => publishMenuEvent({ _tag: 'new_tab' })
          },
          {
            label: 'Go to Note',
            accelerator: 'CmdOrCtrl+N',
            click: () => publishMenuEvent({ _tag: 'go_to_note' })
          },
          {
            label: 'Open Object Command Bar',
            accelerator: 'CmdOrCtrl+L',
            click: () => publishMenuEvent({ _tag: 'open_object_command_bar' })
          },
          {
            label: 'Close Object',
            accelerator: 'CmdOrCtrl+W',
            click: () => publishMenuEvent({ _tag: 'close_tab' })
          },
          { type: 'separator' as const },
          {
            label: 'Open Command Bar',
            accelerator: 'CmdOrCtrl+K',
            click: () => publishMenuEvent({ _tag: 'open_command_bar' })
          },
          {
            label: 'Quick Switch Object',
            accelerator: 'CmdOrCtrl+P',
            click: () => publishMenuEvent({ _tag: 'quick_switch_object' })
          },
          {
            label: 'Quick Switch Task',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => publishMenuEvent({ _tag: 'quick_switch_task' })
          },
          { type: 'separator' as const },
          // {
          //   label: 'Print',
          //   click: () => publishMenuEvent({ _tag: 'print' })
          // },
          // {
          //   label: 'Save Page As...',
          //   click: () => publishMenuEvent({ _tag: 'save_page_as' })
          // },
          // {
          //   label: 'Save as PDF...',
          //   click: () => publishMenuEvent({ _tag: 'save_as_pdf' })
          // },
          // {
          //   label: 'Capture Page',
          //   click: () => publishMenuEvent({ _tag: 'capture_page' })
          // },
          {
            label: 'Share Current Object',
            accelerator: 'CmdOrCtrl+Alt+S',
            click: () => publishMenuEvent({ _tag: 'share_current_object' })
          },
          {
            label: 'Copy Current URL',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => publishMenuEvent({ _tag: 'copy_current_url' })
          }
        ]
      }
    }

    /**
     * Build the History menu
     */
    const buildHistoryMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'History',
        submenu: [
          {
            label: 'Go Back',
            accelerator: 'CmdOrCtrl+[',
            click: () => publishMenuEvent({ _tag: 'go_back' })
          },
          {
            label: 'Go Forward',
            accelerator: 'CmdOrCtrl+]',
            click: () => publishMenuEvent({ _tag: 'go_forward' })
          }
        ]
      }
    }

    /**
     * Build the View menu
     */
    const buildViewMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'View',
        submenu: [
          {
            label: 'Enter Focus Mode',
            accelerator: 'CmdOrCtrl+Shift+F',
            click: () => publishMenuEvent({ _tag: 'enter_focus_mode' })
          },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => publishMenuEvent({ _tag: 'zoom_in' })
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => publishMenuEvent({ _tag: 'zoom_out' })
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => publishMenuEvent({ _tag: 'reset_zoom' })
          },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => publishMenuEvent({ _tag: 'reload' })
          },
          { type: 'separator' as const },
          {
            label: 'Previous Object',
            accelerator: 'CmdOrCtrl+Shift+Up',
            click: () => publishMenuEvent({ _tag: 'go_to_previous_object' })
          },
          {
            label: 'Next Object',
            accelerator: 'CmdOrCtrl+Shift+Down',
            click: () => publishMenuEvent({ _tag: 'go_to_next_object' })
          },
          { type: 'separator' as const },
          {
            label: 'Scroll to Top',
            accelerator: 'CmdOrCtrl+Up',
            click: () => publishMenuEvent({ _tag: 'scroll_to_top' })
          },
          {
            label: 'Scroll to Bottom',
            accelerator: 'CmdOrCtrl+Down',
            click: () => publishMenuEvent({ _tag: 'scroll_to_bottom' })
          },
          { type: 'separator' as const },
          {
            label: 'Toggle Audio Mute',
            accelerator: 'CmdOrCtrl+Shift+M',
            click: () => publishMenuEvent({ _tag: 'toggle_audio_mute' })
          }
        ]
      }
    }

    /**
     * Build the Edit menu
     */
    const buildEditMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'Edit',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' as const },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          { role: 'delete' as const },
          { type: 'separator' as const },
          {
            label: 'Find',
            accelerator: 'CmdOrCtrl+F',
            click: () => publishMenuEvent({ _tag: 'find_in_page' })
          },
          { type: 'separator' as const },
          {
            label: 'Save Note',
            accelerator: 'CmdOrCtrl+S',
            click: () => publishMenuEvent({ _tag: 'save_note' })
          },
          {
            label: 'Save and Go to Note',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => publishMenuEvent({ _tag: 'save_and_go_to_note' })
          },
          { role: 'selectAll' as const }
        ]
      }
    }

    /**
     * Build the Developer menu
     */
    const buildDeveloperMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'Developer',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: 'Alt+CmdOrCtrl+I',
            click: () => publishMenuEvent({ _tag: 'toggle_developer_tools' })
          },
          {
            label: 'Inspect Element',
            click: () => publishMenuEvent({ _tag: 'inspect_element', x: 0, y: 0 })
          }
        ]
      }
    }

    /**
     * Build the Appearance menu
     */
    const buildAppearanceMenu = (): MenuItemConstructorOptions => {
      return {
        label: 'Appearance',
        submenu: [
          {
            label: 'Toggle Dark Mode',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => publishMenuEvent({ _tag: 'toggle_dark_mode' })
          }
        ]
      }
    }

    /**
     * Create the application menu
     */
    const createApplicationMenu = Effect.sync(() => {
      const template: MenuItemConstructorOptions[] = [
        buildPolkaMenu(),
        buildObjectMenu(),
        buildEditMenu(),
        buildViewMenu(),
        buildHistoryMenu(),
        buildAppearanceMenu(),
        buildDeveloperMenu()
      ]

      menu = Menu.buildFromTemplate(template)
      Menu.setApplicationMenu(menu)
      Effect.logInfo('Application menu created')
    }).pipe(Effect.provide(DefaultLoggerLayer))

    // Return the service API
    return {
      createApplicationMenu
      // cleanup is now handled by the finalizer
    }
  })
}) {}
