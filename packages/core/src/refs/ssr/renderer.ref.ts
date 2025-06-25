import { Effect, Ref, Runtime, Fiber, Stream } from 'effect'
import { app, protocol } from 'electron'
import { SlideRuntime } from '../../index.js'
import { PassThrough, Readable } from 'node:stream'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { shell } from 'electron'
import { toggleTheme, ThemeRef, onThemeChange } from '../../refs/ipc/theme.ref.js'
import {
  Message,
  MessageTypes,
  deserializeMessage,
  deserializeMessageObject,
  serializeMessage
} from '@slide.code/schema/messages'
import { PubSubClient } from '../../services/pubsub.service.js'

// Get the directory name of the current module
const require = createRequire(import.meta.url)
const resolve = require.resolve

// Theme state (can be moved to a more appropriate place later)
let isDarkMode = true

export type RouteHandler = (request: Request, url: URL) => Response | Promise<Response>
export type EffectRouteHandler = (
  request: Request,
  url: URL
) => Effect.Effect<Response, never, never>

// Command handler type for processing arbitrary JSON commands
export type CommandHandler = (
  command: string,
  params: Record<string, unknown>
) => Effect.Effect<void, Error, never>

// Interface for renderer configuration
export interface SSRRendererOptions {
  rendererName: string
  debug?: boolean
}

// Return type for renderer initialization
export interface RendererInstance {
  basePath: string
}

// SSE connection type
interface SSEConnection {
  stream: PassThrough
  request: Request
}

// Renderer storage type
interface RendererStorage {
  basePath: string
  routes: Map<string, EffectRouteHandler>
  commands: Map<string, CommandHandler>
  sseConnections: Set<SSEConnection>
}

export class SSRRendererRef extends Effect.Service<SSRRendererRef>()('SSRRendererRef', {
  dependencies: [ThemeRef.Default, PubSubClient.Default],
  scoped: Effect.gen(function* () {
    const renderersRef = yield* Ref.make(new Map<string, RendererStorage>())
    const themeRef = yield* ThemeRef
    const pubsub = yield* PubSubClient

    // Service-level variables
    let changeSubscriptionFiber: Fiber.RuntimeFiber<unknown, unknown> | null = null

    const handleSSE = (rendererName: string, request: Request): Response => {
      const stream = new PassThrough()

      // Set up connection
      const connection: SSEConnection = { stream, request }
      const renderersMap = Effect.runSync(Ref.get(renderersRef))
      const renderer = renderersMap.get(rendererName)

      if (renderer) {
        renderer.sseConnections.add(connection)

        // Send initial connection message
        stream.write('event: connected\ndata: {"status": "connected"}\n\n')

        // Clean up on request abort
        request.signal.addEventListener('abort', () => {
          renderer.sseConnections.delete(connection)
          stream.end()
        })
      }

      // Convert Node.js stream to web ReadableStream
      const webStream = Readable.toWeb(stream)

      return new Response(webStream as unknown as BodyInit, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const handleCommand = (rendererName: string, body: unknown) =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[SSRRendererRef] Broadcasting command', rendererName, body)

        try {
          // First try to parse as a standard message from messages.ts
          try {
            const message =
              typeof body === 'string' ? deserializeMessage(body) : deserializeMessageObject(body)
            yield* pubsub.publish(message)
            return new Response(JSON.stringify({ success: true }), {
              headers: { 'Content-Type': 'application/json' }
            })
          } catch (e) {
            // If deserialization fails, continue with legacy format
            yield* Effect.logError(
              '[SSRRendererRef] Could not deserialize as standard message, trying legacy format'
            )
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError(`[SSRRendererRef] Command handling error: ${errorMessage}`)
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })

    const handleRequest = (request: Request) => {
      return Effect.gen(function* () {
        const url = new URL(request.url)
        const rendererName = url.hostname
        const pathname = url.pathname
        const method = request.method

        const renderersMap = yield* Ref.get(renderersRef)
        const renderer = renderersMap.get(rendererName)

        if (!renderer) {
          return new Response('Renderer not found', { status: 404 })
        }

        try {
          // Handle SSE requests
          if (pathname === '/events') {
            return handleSSE(rendererName, request)
          }

          // Handle client.js request
          if (pathname === '/client.js') {
            // Read the actual compiled JS file instead of returning the package path
            const clientPath = require.resolve('@polka/ssr-client/client.js')
            const clientJS = fs.readFileSync(clientPath, 'utf-8')
            return new Response(clientJS, {
              headers: { 'Content-Type': 'application/javascript' }
            })
          }

          if (pathname === '/client.css') {
            const clientPath = require.resolve('@polka/ssr-client/client.css')
            const clientCSS = fs.readFileSync(clientPath, 'utf-8')
            return new Response(clientCSS, {
              headers: { 'Content-Type': 'text/css' }
            })
          }
          // Handle command requests
          if (pathname === '/command' && method === 'POST') {
            const contentType = request.headers.get('Content-Type') || ''
            let body: unknown

            if (contentType.includes('application/json')) {
              body = yield* Effect.promise(() => request.json())
            } else {
              body = yield* Effect.promise(() => request.text())
            }

            return yield* handleCommand(rendererName, body)
          }

          const routeKey = `${method}:${pathname}`

          const handler = renderer.routes.get(routeKey)
          if (!handler) {
            return new Response('Route not found', { status: 404 })
          }

          return yield* handler(request, url)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Effect.logError(`[SSRRendererRef] Request handling error: ${errorMessage}`)
          return new Response(`Server Error: ${errorMessage}`, { status: 500 })
        }
      })
    }

    const initializeHandlers = Effect.gen(function* () {
      yield* Effect.logInfo('[SSRRendererRef] Initializing protocol handlers')

      protocol.handle('app', (request: Request) => {
        return SlideRuntime.runPromise(handleRequest(request))
      })

      // Setup theme change listener (moved to service level)
      changeSubscriptionFiber = yield* Effect.fork(
        Stream.runForEach(
          Stream.changes(Stream.map(themeRef.ref.changes, (state) => state.effectiveTheme)),
          (theme) =>
            Effect.gen(function* () {
              yield* broadcastGlobalEvent('theme', {
                isDark: theme === 'dark'
              })
            })
        )
      )

      yield* Effect.logInfo('[SSRRendererRef] Protocol handlers initialized')
    })

    // Initialize a new renderer with SSR capabilities
    const initializeRenderer = (rendererName: string) => {
      return Effect.gen(function* () {
        yield* Effect.logInfo(`[SSRRendererRef] Initializing renderer: ${rendererName}`)

        // Ensure app is ready before proceeding
        if (!app.isReady()) {
          yield* Effect.promise(() => app.whenReady())
        }

        // Check if renderer already exists
        const renderersMap = yield* Ref.get(renderersRef)
        if (renderersMap.has(rendererName)) {
          yield* Effect.logInfo(`[SSRRendererRef] Renderer ${rendererName} already exists`)
          const existingRenderer = renderersMap.get(rendererName)!
          return {
            basePath: existingRenderer.basePath
          }
        }

        // Use renderer name as the base path
        const basePath = `/${rendererName.toLowerCase()}`

        // Store renderer information with empty SSE connections set
        renderersMap.set(rendererName, {
          basePath,
          routes: new Map(),
          commands: new Map(),
          sseConnections: new Set()
        })
        yield* Ref.set(renderersRef, renderersMap)

        return {
          basePath
        }
      })
    }

    const registerRoute = (
      rendererName: string,
      path: string,
      handler: EffectRouteHandler,
      method: string = 'GET'
    ) => {
      return Effect.gen(function* () {
        const renderersMap = yield* Ref.get(renderersRef)
        const renderer = renderersMap.get(rendererName)

        if (!renderer) {
          return Effect.fail(new Error(`Renderer ${rendererName} not initialized`))
        }

        // Ensure path starts with a slash
        const normalizedPath = path.startsWith('/') ? path : `/${path}`
        const routeKey = `${method.toUpperCase()}:${normalizedPath}`

        // Register the route
        renderer.routes.set(routeKey, handler)
        yield* Effect.logInfo(
          `[SSRRendererRef] Registered route ${routeKey} for renderer ${rendererName}`
        )

        return Effect.succeed(true)
      })
    }

    const registerCommand = (rendererName: string, command: string, handler: CommandHandler) => {
      return Effect.gen(function* () {
        const renderersMap = yield* Ref.get(renderersRef)
        const renderer = renderersMap.get(rendererName)

        if (!renderer) {
          return Effect.fail(new Error(`Renderer ${rendererName} not initialized`))
        }

        // Register the command
        renderer.commands.set(command, handler)
        yield* Effect.logInfo(
          `[SSRRendererRef] Registered command ${command} for renderer ${rendererName}`
        )

        return Effect.succeed(true)
      })
    }

    // Broadcast an event to all SSE connections for a specific renderer
    const broadcastEvent = (
      rendererName: string,
      event: string,
      data: any
    ): Effect.Effect<void, Error> =>
      Effect.gen(function* () {
        const renderersMap = yield* Ref.get(renderersRef)
        const renderer = renderersMap.get(rendererName)

        if (!renderer) {
          return Effect.fail(new Error(`Renderer ${rendererName} not found`))
        }

        // Format content for SSE
        const content = typeof data === 'string' ? data : JSON.stringify(data)
        const formattedContent = content
          .split('\n')
          .map((line) => `data: ${line}`)
          .join('\n')

        const message = `event: ${event}\n${formattedContent}\n\n`

        for (const connection of renderer.sseConnections) {
          if (!connection.stream.destroyed) {
            try {
              connection.stream.write(message)
            } catch (error) {
              // Remove failed connection
              renderer.sseConnections.delete(connection)
            }
          }
        }
      })

    // Broadcast an event to all SSE connections across all renderers
    const broadcastGlobalEvent = (event: string, data: any): Effect.Effect<void> =>
      Effect.gen(function* () {
        const renderersMap = yield* Ref.get(renderersRef)

        // Format content for SSE
        const content = typeof data === 'string' ? data : JSON.stringify(data)
        const formattedContent = content
          .split('\n')
          .map((line) => `data: ${line}`)
          .join('\n')

        const message = `event: ${event}\n${formattedContent}\n\n`

        // Iterate through all renderers and their connections
        for (const renderer of renderersMap.values()) {
          for (const connection of renderer.sseConnections) {
            if (!connection.stream.destroyed) {
              try {
                connection.stream.write(message)
              } catch (error) {
                // Remove failed connection
                renderer.sseConnections.delete(connection)
              }
            }
          }
        }
      })

    // Register a finalizer at the service scope level
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[SSRRendererRef] 🧹 Cleaning up SSRRendererRef')

        // Clean up theme subscription fiber
        if (changeSubscriptionFiber) {
          yield* Fiber.interrupt(changeSubscriptionFiber)
          changeSubscriptionFiber = null
        }

        // Clean up renderers if needed
        // (Additional cleanup logic can be added here)

        yield* Effect.logInfo('[SSRRendererRef] 🧹 SSRRendererRef cleaned up successfully')
      })
    )

    return {
      initializeHandlers,
      initializeRenderer,
      registerRoute,
      registerCommand,
      broadcastEvent,
      broadcastGlobalEvent
    }
  })
}) {}

// Update UI fragment with error handling
// updateUIFragment: (
//   rendererName: string,
//   selector: string,
//   htmlContent: string
// ): Effect.Effect<boolean, Error> =>
//   Effect.gen(function* () {
//     if (!httpHandler) {
//       return Effect.fail(new Error('Protocol handler not initialized'))
//     }

//     const renderersMap = yield* Ref.get(renderersRef)
//     const renderer = renderersMap.get(rendererName)

//     if (!renderer) {
//       return Effect.fail(new Error(`Renderer ${rendererName} not initialized`))
//     }

//     try {
//       httpHandler.updateHTML(renderer.basePath, selector, htmlContent)
//       return Effect.succeed(true) // Explicitly succeed
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error)
//       yield* Effect.logError(`[SSRRendererRef] Failed to update UI fragment: ${errorMessage}`)
//       return Effect.fail(new Error(`Failed to update UI fragment: ${errorMessage}`))
//     }
//   }).pipe(Effect.flatten), // Flatten the nested Effect

// Broadcast event with error handling
// broadcastEvent: (
//   rendererName: string,
//   eventName: string,
//   data: any
// ): Effect.Effect<boolean, Error> =>
//   Effect.gen(function* () {
//     if (!httpHandler) {
//       return Effect.fail(new Error('Protocol handler not initialized'))
//     }

//     const renderersMap = yield* Ref.get(renderersRef)
//     const renderer = renderersMap.get(rendererName)

//     if (!renderer) {
//       return Effect.fail(new Error(`Renderer ${rendererName} not initialized`))
//     }

//     try {
//       const jsonContent = JSON.stringify(data)
//       httpHandler.broadcast(renderer.basePath, eventName, jsonContent)
//       return Effect.succeed(true) // Explicitly succeed
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error)
//       yield* Effect.logError(`[SSRRendererRef] Failed to broadcast event: ${errorMessage}`)
//       return Effect.fail(new Error(`Failed to broadcast event: ${errorMessage}`))
//     }
//   }).pipe(Effect.flatten), // Flatten the nested Effect

// // Clean up a specific renderer
// destroyRenderer: (rendererName: string): Effect.Effect<void, never> =>
//   Effect.gen(function* () {
//     const renderersMap = yield* Ref.get(renderersRef)
//     const renderer = renderersMap.get(rendererName)

//     if (renderer) {
//       // Close window but keep protocol handler
//       if (renderer.window) {
//         try {
//           // Use cleanup method
//           yield* Effect.sync(() => renderer.window.cleanup())
//         } catch (err) {
//           yield* Effect.logWarning(`Error closing window: ${err}`)
//         }
//       }

//       renderersMap.delete(rendererName)
//       yield* Ref.set(renderersRef, renderersMap)
//       yield* Effect.logInfo(`[SSRRendererRef] Renderer ${rendererName} cleaned up`)
//     }
//   }),

// // Clean up all renderers
// destroyAll: Effect.gen(function* () {
//   const renderersMap = yield* Ref.get(renderersRef)

//   // Close all windows
//   for (const [rendererName, renderer] of renderersMap.entries()) {
//     if (renderer.window) {
//       try {
//         // Use cleanup method
//         yield* Effect.sync(() => renderer.window.cleanup())
//       } catch (err) {
//         yield* Effect.logWarning(`Error closing window for ${rendererName}: ${err}`)
//       }
//     }
//   }

//   // Clear the renderers map
//   yield* Ref.set(renderersRef, new Map())

//   // Clean up protocol handlers
//   if (httpHandler) {
//     yield* httpHandler.cleanup()
//   }

//   yield* Effect.logInfo('[SSRRendererRef] All renderers cleaned up')
// })
// }
// })
//   accessors: true
// }) {}
