import {
  createSetWindowTitle,
  createShowUpdateDialog,
  createQuit,
  createGetAppInfo,
  createInvalidateQuery
} from '@slide.code/schema/messages'
import type { Message, MessageType, TypedMessage } from '@slide.code/schema/messages'

/**
 * Type for subscription status returned by subscribe methods
 */
export interface Subscription {
  unsubscribe: () => void
}

/**
 * PubsubClient for renderer process interaction with the main process
 * Provides functionality to:
 * 1. Send commands to the main process
 * 2. Subscribe to events/messages from the main process
 */
export class PubsubClient {
  private static instance: PubsubClient
  private handlers: Map<string, Set<(message: Message) => void>>
  private initialized: boolean = false
  private removeListener: (() => void) | null = null

  private constructor() {
    this.handlers = new Map()
    this.setupListener()
  }

  /**
   * Get the singleton instance of PubsubClient
   */
  public static getInstance(): PubsubClient {
    if (!PubsubClient.instance) {
      PubsubClient.instance = new PubsubClient()
    }
    return PubsubClient.instance
  }

  /**
   * Set up the IPC listener for incoming events
   */
  private setupListener(): void {
    if (this.initialized) return

    // Check if we're in a renderer context with access to IPC
    if (typeof window !== 'undefined' && window.pubsub) {
      if (typeof window.pubsub.subscribe === 'function') {
        console.debug('Setting up PubsubClient message listener')

        this.removeListener = window.pubsub.subscribe((message: Message) => {
          this.handleIncomingMessage(message)
        })

        this.initialized = true
      } else {
        console.warn('PubsubClient: window.pubsub.subscribe is not available')
      }
    } else {
      console.warn('PubsubClient: window.pubsub is not available')
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.initialized && this.removeListener) {
      this.removeListener()
      this.removeListener = null
      this.initialized = false
    }
  }

  /**
   * Handle incoming messages and distribute to subscribers
   */
  private handleIncomingMessage(message: Message): void {
    console.debug('Received message:', message)

    // Get the message type from the type property
    const messageType = message._tag

    // Dispatch to all handlers for this message type
    const handlers = this.handlers.get(messageType)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message)
        } catch (error) {
          console.error(`Error in message handler for ${messageType}:`, error)
        }
      }
    }
  }

  //
  // Message publishing methods
  //

  /**
   * Publish a message to the main process
   */
  public publish<T extends Message>(message: T): void {
    console.log('Publishing message:', message)
    if (!window.pubsub?.publish) {
      console.error('pubsub.publish is not available')
      return
    }

    console.log('Publishing message:', message)

    window.pubsub.publish(message)
  }

  /**
   * Set the window title
   */
  public setWindowTitle(title: string): void {
    this.publish(createSetWindowTitle(title))
  }

  /**
   * Show the update dialog
   */
  public showUpdateDialog(checkForUpdates = true): void {
    this.publish(createShowUpdateDialog(checkForUpdates))
  }

  /**
   * Quit the application
   */
  public quit(force = false): void {
    this.publish(createQuit(force))
  }

  /**
   * Send request for app info
   */
  public requestAppInfo(includeVersion = true): void {
    this.publish(createGetAppInfo(includeVersion))
  }

  /**
   * Invalidate a query
   */
  public invalidateQuery(queryKey: any[]): void {
    this.publish(createInvalidateQuery(queryKey))
  }

  //
  // Message subscription methods
  //

  /**
   * Subscribe to a specific message type
   *
   * @param messageType The message type tag to subscribe to
   * @param options Either a handler function or an object with handlers
   * @returns A subscription object with unsubscribe method
   *
   * @example
   * // Simple version
   * const sub = client.subscribe('TaskStart', msg => {
   *   console.log(msg.data.taskId);
   * });
   *
   * // With error handling
   * const sub = client.subscribe('TaskStart', {
   *   onData: msg => console.log(msg.data.taskId),
   *   onError: err => console.error(err)
   * });
   */
  public subscribe<T extends MessageType>(
    messageType: T,
    options:
      | ((message: TypedMessage<T>) => void)
      | {
          onData: (message: TypedMessage<T>) => void
          onError?: (error: unknown) => void
        }
  ): Subscription {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set())
    }

    const handlers = this.handlers.get(messageType)!

    // Process handler based on options type
    const handler = typeof options === 'function' ? options : options.onData

    const errorHandler = typeof options === 'function' ? undefined : options.onError

    // Create the actual handler function
    const typedHandler = ((message: Message) => {
      if (message._tag === messageType) {
        try {
          handler(message as TypedMessage<T>)
        } catch (error) {
          if (errorHandler) {
            errorHandler(error)
          } else {
            console.error(`Unhandled error in ${messageType} subscription:`, error)
          }
        }
      }
    }) as (message: Message) => void

    handlers.add(typedHandler)

    // Return a subscription object with unsubscribe method
    return {
      unsubscribe: () => {
        handlers.delete(typedHandler)
        if (handlers.size === 0) {
          this.handlers.delete(messageType)
        }
      }
    }
  }
}
