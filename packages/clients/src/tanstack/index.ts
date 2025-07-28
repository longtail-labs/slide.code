import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { compress, decompress } from 'lz-string'
import { PubsubClient } from '../pubsub/index.js'
import {
  createInvalidateQuery,
  MessageTypes,
  type InvalidateQueryMessage
} from '@slide.code/schema/messages'

// Create a localStorage persister with compression
export const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : null,
  key: 'POLKA_QUERY_CACHE', // Custom key for localStorage
  serialize: (data) => compress(JSON.stringify(data)),
  deserialize: (data) => JSON.parse(decompress(data)),
  retry: (props) => {
    // If storage is full, remove oldest queries except favicon data
    if (props.errorCount <= 2) {
      const client = props.persistedClient
      const queries = client.clientState.queries.filter(
        (query: any) => !query.queryKey[0].toString().includes('domain-favicon')
      )
      return {
        ...client,
        clientState: {
          ...client.clientState,
          queries
        }
      }
    }
    return undefined
  }
})

// Configure the query client with caching only for favicons
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      gcTime: 0, // Default to no caching
      staleTime: 0 // Default to always stale
    },
    mutations: {
      networkMode: 'always'
    }
  }
})

// Add favicon-specific defaults
queryClient.setQueryDefaults(['domain-favicon' as const], {
  gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
  staleTime: 1000 * 60 * 60 * 24 * 7 // 7 days
})

// Setup persistence
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 30 // Keep persisted data for 30 days
  })
}

// Extend QueryClient type to include our custom method
declare module '@tanstack/react-query' {
  interface QueryClient {
    invalidateQueriesRemote: (queryKey: any) => Promise<void>
  }
}

// Set up the invalidateQueriesRemote method using PubSub
QueryClient.prototype.invalidateQueriesRemote = async function (queryKey: any) {
  // First invalidate locally
  this.invalidateQueries({ queryKey })

  // Send invalidation message through PubSub to other processes
  const pubsub = PubsubClient.getInstance()
  await pubsub.publish(createInvalidateQuery(queryKey))
}

// Track if listener is already set up to avoid duplicate subscriptions
let isQueryInvalidationListenerSetup = false

// Set up listener for query invalidations
export const setupQueryInvalidationsListener = () => {
  if (isQueryInvalidationListenerSetup) {
    return
  }

  const pubsub = PubsubClient.getInstance()

  pubsub.subscribe(MessageTypes.INVALIDATE_QUERY, {
    onData: (event: InvalidateQueryMessage) => {
      if (event && event.queryKey) {
        queryClient.invalidateQueries({ queryKey: event.queryKey })
      } else {
        console.warn(
          '[TANSTACK-QUERY] ⚠️ Received invalid query invalidation event (missing queryKey):',
          event
        )
      }
    },
    onError: (error: unknown) => {
      console.error('[TANSTACK-QUERY] ❌ ERROR IN QUERY INVALIDATION SUBSCRIPTION:', error)
    }
  })

  isQueryInvalidationListenerSetup = true
  console.log('[TANSTACK-QUERY] ✅ Query invalidation listener setup completed')
}

// Initialize the listener
console.log('[TANSTACK-QUERY] 🚀 Initializing query invalidation system')
setupQueryInvalidationsListener()
console.log('[TANSTACK-QUERY] ✅ Query invalidation system initialized')
