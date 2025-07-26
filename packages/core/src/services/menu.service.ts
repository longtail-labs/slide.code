import { Menu, type MenuItemConstructorOptions } from 'electron'
import { Effect } from 'effect'
import { PubSubClient } from './pubsub.service.js'
import { createOpenSlideFolder } from '@slide.code/schema/messages'
import { DefaultLoggerLayer } from '../logger.js'
import { SlideRuntime } from '../index.js'

/**
 * All possible menu events
 */
export type MenuEvent = { _tag: 'open_slide_folder' }

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
        case 'open_slide_folder':
          SlideRuntime.runFork(pubsub.publish(createOpenSlideFolder()))
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
          { type: 'separator' as const },
          {
            label: 'Open Slide Folder',
            click: () => publishMenuEvent({ _tag: 'open_slide_folder' })
          },
          { type: 'separator' as const },
          { role: 'quit' as const }
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
          { role: 'selectAll' as const }
        ]
      }
    }

    /**
     * Create the application menu
     */
    const createApplicationMenu = Effect.sync(() => {
      const template: MenuItemConstructorOptions[] = [buildPolkaMenu(), buildEditMenu()]

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
