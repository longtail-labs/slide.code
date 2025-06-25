import { Effect, Context, Layer } from 'effect'
import { globalShortcut } from 'electron'
import { DefaultLoggerLayer } from '../logger.js'

export class GlobalShortcutService extends Effect.Service<GlobalShortcutService>()(
  'GlobalShortcutService',
  {
    dependencies: [DefaultLoggerLayer],
    scoped: Effect.gen(function* () {
      // const planningRef = yield* PlanningRef

      // Register finalizer for cleanup
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Effect.logInfo('[GlobalShortcutService] 🔌 Cleaning up GlobalShortcutService')
          globalShortcut.unregisterAll()
          yield* Effect.logInfo(
            '[GlobalShortcutService] 🔌 GlobalShortcutService cleaned up successfully'
          )
        })
      )

      // Initialize shortcut method
      const initialize = Effect.gen(function* () {
        yield* Effect.logInfo('[GlobalShortcutService] 🔑 Initializing shortcuts')

        // Register Alt+Shift+P to show planning window
        const shortcutKeys = 'CmdOrCtrl+Shift+>'

        // yield* Effect.sync(() => {
        //   const registered = globalShortcut.register(shortcutKeys, () => {
        //     Effect.runSync(
        //       Effect.gen(function* () {
        //         yield* Effect.logInfo(
        //           '[GlobalShortcutService] 🔑 Shortcut triggered: ' + shortcutKeys
        //         )
        //         const window = yield* planningRef.ref

        //         if (window.window) {
        //           yield* window.window.show()
        //           yield* window.window.focus()
        //         } else {
        //           // yield* planningRef.initializePlanningWindow
        //         }
        //       })
        //     )
        //   })

        //   if (!registered) {
        //     console.error(`Failed to register shortcut: ${shortcutKeys}`)
        //   } else {
        //     console.log(`Successfully registered shortcut: ${shortcutKeys}`)
        //   }
        // })

        yield* Effect.logInfo(
          `[GlobalShortcutService] 🔑 Registered global shortcut: ${shortcutKeys}`
        )
      })

      // Return service implementation
      return {
        initialize,
        isRegistered: (accelerator: string) =>
          Effect.sync(() => globalShortcut.isRegistered(accelerator))
      }
    })
  }
) {}

// Export the singleton instance
export const GlobalShortcutRef = Context.GenericTag<GlobalShortcutService>('GlobalShortcutService')
