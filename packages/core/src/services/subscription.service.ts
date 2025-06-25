import { Effect, pipe } from 'effect'
import { DefaultLoggerLayer } from '../logger.js'
import { getUserId, updateSubscriptionStatus, isUserSubscribed } from '../refs/user.ref.js'
import { ElectronStoreUtil } from '../utils/electron-store.util.js'
import { shell } from 'electron'
import { APIService } from './api.service.js'
/**
 * Errors that can be thrown by the Subscription service
 */
export class SubscriptionServiceError extends Error {
  readonly _tag = 'SubscriptionServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionServiceError'
  }
}

/**
 * Error thrown when a feature requires a subscription but user doesn't have it
 */
export class SubscriptionRequiredError extends Error {
  readonly _tag = 'SubscriptionRequiredError'

  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionRequiredError'
  }
}

/**
 * Subscription status data
 */
export interface SubscriptionStatus {
  isSubscribed: boolean
  status?: string
  subscriptionId?: string
  currentPeriodEnd?: number
}

/**
 * Subscription service for managing subscription status and access
 */
export class SubscriptionService extends Effect.Service<SubscriptionService>()(
  'SubscriptionService',
  {
    dependencies: [DefaultLoggerLayer, APIService.Default],
    scoped: Effect.gen(function* (_) {
      yield* Effect.logInfo('💳 SubscriptionService started')

      const api = yield* APIService

      // Cache for subscription info
      let subscriptionCache: SubscriptionStatus | null = null
      let cacheExpiry: number = 0
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

      /**
       * Get the cached subscription status or fetch a new one
       */
      const getSubscriptionStatus = Effect.gen(function* () {
        // Check if we need to refresh the cache
        const now = Date.now()
        if (!subscriptionCache || now > cacheExpiry) {
          yield* Effect.logInfo('Fetching subscription status')

          try {
            const result = yield* api.executeRequest((client) =>
              client.subscription.checkMySubscription()
            )

            console.log('[SubscriptionService] getSubscriptionStatus', result)

            // Update cache
            subscriptionCache = result
            cacheExpiry = now + CACHE_DURATION

            // Update user ref with subscription status
            // yield* updateSubscriptionStatus(result.isSubscribed)
          } catch (error) {
            console.error('Failed to get subscription status:', error)
          }
        }

        return subscriptionCache
      })

      /**
       * Force refresh the subscription status from the API
       */
      const refreshSubscriptionStatus = Effect.gen(function* () {
        // Reset cache to force refresh
        subscriptionCache = null
        cacheExpiry = 0

        // Get fresh status
        const status = yield* getSubscriptionStatus

        console.log('[SubscriptionService] refreshSubscriptionStatus', status)

        // Ensure user ref is updated
        if (status) {
          yield* updateSubscriptionStatus(status.isSubscribed)
        }

        return status
      })

      /**
       * Create a checkout session and open it in the browser
       */
      const openCheckout = (priceId: string) =>
        Effect.gen(function* () {
          console.log('[DEBUGSTRIPE] openCheckout', priceId)
          try {
            // Get customer ID
            // const customerId = yield* getOrCreateCustomer

            // Create checkout session
            const result = yield* api.executeRequest((client) =>
              client.subscription.createCheckoutSession({
                priceId,
                successUrl: 'http://localhost/checkout-success',
                cancelUrl: 'http://localhost/checkout-cancel'
              })
            )

            console.log('[DEBUGSTRIPE] openCheckout', result)

            // Open checkout URL in browser
            shell.openExternal(result.checkoutUrl)

            return true
          } catch (error) {
            console.log('[DEBUGSTRIPE] openCheckout error', error)
            yield* Effect.logError('Failed to open checkout:', String(error))
            throw new SubscriptionServiceError(`Failed to open checkout: ${error}`)
          }
        })

      /**
       * Open billing portal in browser
       */
      const openBillingPortal = Effect.gen(function* () {
        try {
          // Create billing portal session

          const result = yield* api.executeRequest((client) =>
            client.subscription.createBillingPortal({
              returnUrl: 'http://localhost/billing-return'
            })
          )

          console.log('[DEBUGSTRIPE] openBillingPortal', result)

          // Open portal URL in browser
          shell.openExternal(result.portalUrl)

          return true
        } catch (error) {
          yield* Effect.logError('Failed to open billing portal:', String(error))
          throw new SubscriptionServiceError(`Failed to open billing portal: ${error}`)
        }
      })

      // Register a finalizer for cleanup
      yield* Effect.addFinalizer(() => Effect.logInfo('💳 Cleaning up SubscriptionService'))

      // Return the service API
      return {
        getSubscriptionStatus,
        refreshSubscriptionStatus,
        openCheckout,
        openBillingPortal
      }
    })
  }
) {}

/**
 * Live layer for SubscriptionService
 */
export const SubscriptionServiceLive = SubscriptionService.Default
