import { Effect } from 'effect'
import { app, protocol } from 'electron'
import { APP_PROTOCOL } from '../values.js'

type CustomScheme = {
  scheme: string
  privileges: {
    standard?: boolean
    secure?: boolean
    supportFetchAPI?: boolean
    corsEnabled?: boolean
    stream?: boolean
    [key: string]: any
  }
}

/**
 * Default protocols to register for SSR renderers
 */
const DEFAULT_SSR_PROTOCOLS: CustomScheme[] = [
  // Main HTTP protocol for all renderers
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  },
  {
    scheme: 'file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
]

/**
 * Effect that registers SSR protocol schemes
 * Must be called before app.ready()
 */
export const registerSSRProtocols = Effect.gen(function* () {
  yield* Effect.logInfo('🔄 Registering SSR protocol schemes', DEFAULT_SSR_PROTOCOLS)

  // Check if app is ready (it shouldn't be)
  if (app.isReady()) {
    yield* Effect.logWarning(
      '⚠️ App is already ready! Schemes should be registered before app is ready'
    )
  }

  try {
    yield* Effect.sync(() => {
      // Register all protocols as privileged
      protocol.registerSchemesAsPrivileged(DEFAULT_SSR_PROTOCOLS)

      // Store a reference to our protocols that we want to ensure are always registered
      const ourProtocols = [...DEFAULT_SSR_PROTOCOLS]

      // Proxy the registerSchemesAsPrivileged function to ensure our protocols are always included
      // This prevents libraries like Sentry from overwriting our protocols
      const originalRegisterSchemesAsPrivileged = protocol.registerSchemesAsPrivileged

      // Override the function with our proxy
      // @ts-ignore - Type issues with Proxy in this context
      protocol.registerSchemesAsPrivileged = function (customSchemes: CustomScheme[]) {
        // Get unique schemes by merging our protocols with the new ones
        const existingSchemes = ourProtocols.map((p) => p.scheme)
        const filteredNewSchemes = customSchemes.filter((p) => !existingSchemes.includes(p.scheme))
        const combinedSchemes = [...ourProtocols, ...filteredNewSchemes]

        // Call the original function with the combined schemes
        return originalRegisterSchemesAsPrivileged.call(this, combinedSchemes)
      }
    })

    yield* Effect.logInfo('✅ SSR protocol schemes registered successfully')
  } catch (error) {
    yield* Effect.logError('❌ Failed to register SSR protocol schemes', error)
    return Effect.fail(`Failed to register SSR protocol schemes: ${error}`)
  }
})
