import { Effect } from 'effect'
import { app } from 'electron'
import path from 'path'
import { APP_PROTOCOL } from '../values.js'

/**
 * Effect that registers the APP_PROTOCOL for deep linking
 */
export const registerDeepLinkingProtocol = Effect.gen(function* () {
  yield* Effect.logInfo(`🔗 Registering deep linking protocol: ${APP_PROTOCOL}`)

  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        yield* Effect.sync(() => {
          app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
            path.resolve(process.argv[1] ?? '')
          ])
        })
      }
    } else {
      yield* Effect.sync(() => app.setAsDefaultProtocolClient(APP_PROTOCOL))
    }

    yield* Effect.logInfo(`✅ Deep linking protocol ${APP_PROTOCOL} registered successfully`)
  } catch (error) {
    yield* Effect.logError(`❌ Failed to register deep linking protocol ${APP_PROTOCOL}`, error)
    return Effect.fail(`Failed to register deep linking protocol: ${error}`)
  }
})
