import { Effect, Duration, Schedule } from 'effect'
import log from 'electron-log'
import { ClaudeRef } from '../refs/ipc/claude.ref.js'

/**
 * Sync ccusage stats with intelligent caching and staleness checking
 * Only fetches new data if it hasn't been updated in the last 10 minutes
 */
export const syncCcusageStats = Effect.gen(function* () {
  yield* Effect.logInfo('📊 Starting background ccusage stats sync')
  log.info('[EFFECT] 📊 Starting background ccusage stats sync')

  const claudeRef = yield* ClaudeRef

  // Check if we need to update based on last sync time
  const claudeState = yield* claudeRef.ref.get()
  const lastSyncTime = claudeState.stats?.lastSyncTime
  const now = Date.now()
  const tenMinutesAgo = now - 10 * 60 * 1000 // 10 minutes in milliseconds
  
  log.info('[EFFECT] 📊 Sync cache check:', {
    lastSyncTime,
    now,
    tenMinutesAgo,
    isFresh: lastSyncTime && lastSyncTime > tenMinutesAgo,
    timeSinceLastSync: lastSyncTime ? now - lastSyncTime : 'never'
  })

  if (lastSyncTime && lastSyncTime > tenMinutesAgo) {
    yield* Effect.logInfo('📊 Ccusage stats are fresh, skipping sync')
    log.info('[EFFECT] 📊 Ccusage stats are fresh, skipping sync')
    return { synced: false, reason: 'data-fresh' }
  }

  log.info('[EFFECT] 📊 Calling claudeRef.syncUsageStats()')
  
  // Use the ClaudeRef's built-in sync method
  const syncResult = yield* claudeRef.syncUsageStats()
  
  if (syncResult) {
    yield* Effect.logInfo('📊 Ccusage stats synced successfully')
    log.info('[EFFECT] ✅ Ccusage stats synced successfully')
    return { synced: true }
  } else {
    yield* Effect.logWarning('📊 Ccusage stats sync returned false')
    log.warn('[EFFECT] ⚠️ Ccusage stats sync returned false')
    return { synced: false, reason: 'sync-failed' }
  }
})

/**
 * Start a background daemon that periodically syncs ccusage stats
 * Runs every 10 minutes with intelligent caching
 */
export const startCcusageBackgroundSync = Effect.gen(function* () {
  yield* Effect.logInfo('🔄 Starting ccusage background sync daemon')
  log.info('[EFFECT] 🔄 Starting ccusage background sync daemon')

  // Create a repeating schedule that runs every 10 minutes
  const schedule = Schedule.fixed(Duration.minutes(10))

  // Run the sync effect on the schedule
  const backgroundSync = syncCcusageStats.pipe(
    Effect.repeat(schedule),
    Effect.catchAll((error) => {
      log.error('[EFFECT] ❌ Background ccusage sync error:', error)
      return Effect.succeed(undefined)
    })
  )

  // Fork the background sync to run independently
  const fiber = yield* Effect.fork(backgroundSync)

  yield* Effect.logInfo('✅ Ccusage background sync daemon started')
  log.info('[EFFECT] ✅ Ccusage background sync daemon started')

  return fiber
})

/**
 * Run initial ccusage sync immediately and start background daemon
 */
export const initializeCcusageSync = Effect.gen(function* () {
  yield* Effect.logInfo('🚀 Initializing ccusage sync system')
  log.info('[EFFECT] 🚀 Initializing ccusage sync system')

  // Run initial sync immediately
  const initialSync = yield* syncCcusageStats

  // Start background daemon
  const backgroundFiber = yield* startCcusageBackgroundSync

  yield* Effect.logInfo('✅ Ccusage sync system initialized')
  log.info('[EFFECT] ✅ Ccusage sync system initialized, initial sync:', initialSync.synced)

  return { initialSync, backgroundFiber }
})
