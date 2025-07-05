import { Effect, Duration, Schedule } from 'effect'
import log from 'electron-log'
import { CcusageService } from '../services/ccusage.service.js'
import { UserRef } from '../refs/ipc/user.ref.js'

/**
 * Sync ccusage stats with intelligent caching and staleness checking
 * Only fetches new data if it hasn't been updated in the last 10 minutes
 */
export const syncCcusageStats = Effect.gen(function* () {
  yield* Effect.logInfo('📊 Starting background ccusage stats sync')
  log.info('[EFFECT] 📊 Starting background ccusage stats sync')

  const userRef = yield* UserRef
  const ccusageService = yield* CcusageService

  // Check if we need to update based on last sync time
  const userState = yield* userRef.ref.get()
  const lastSyncTime = userState.claudeCode?.stats?.lastSyncTime
  const now = Date.now()
  const tenMinutesAgo = now - 10 * 60 * 1000 // 10 minutes in milliseconds

  if (lastSyncTime && lastSyncTime > tenMinutesAgo) {
    yield* Effect.logInfo('📊 Ccusage stats are fresh, skipping sync')
    log.info('[EFFECT] 📊 Ccusage stats are fresh, skipping sync')
    return { synced: false, reason: 'data-fresh' }
  }

  try {
    // Load comprehensive usage stats
    const usageStats = yield* ccusageService.loadComprehensiveStats().pipe(
      Effect.catchAll((error) => {
        log.info(
          '[EFFECT] ⚠️ CcusageService returned no data (likely no Claude usage yet):',
          error.message
        )
        return Effect.succeed({
          dailyUsage: [],
          sessionUsage: [],
          tokenTotals: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            totalTokens: 0,
            totalCost: 0
          },
          modelsUsed: []
        })
      })
    )

    // Update user state with new stats
    yield* userRef.ref.update((state) => ({
      ...state,
      claudeCode: {
        ...(state.claudeCode ?? {
          executablePath: null,
          lastDetected: null,
          stats: { totalRequests: 0, totalCost: 0, lastUsed: null, lastSyncTime: null }
        }),
        stats: {
          totalRequests: state.claudeCode?.stats?.totalRequests ?? 0,
          totalCost: usageStats.tokenTotals.totalCost,
          lastUsed: state.claudeCode?.stats?.lastUsed ?? null,
          lastSyncTime: now,
          tokenTotals: usageStats.tokenTotals,
          dailyUsage: usageStats.dailyUsage,
          sessionUsage: usageStats.sessionUsage,
          modelsUsed: usageStats.modelsUsed
        }
      }
    }))

    yield* Effect.logInfo('📊 Ccusage stats synced successfully')
    log.info('[EFFECT] ✅ Ccusage stats synced successfully:', {
      totalCost: usageStats.tokenTotals.totalCost,
      dailyUsageCount: usageStats.dailyUsage.length,
      sessionUsageCount: usageStats.sessionUsage.length,
      modelsUsed: usageStats.modelsUsed
    })

    return { synced: true, stats: usageStats }
  } catch (error) {
    yield* Effect.logError('📊 Error during ccusage stats sync', error)
    log.error('[EFFECT] ❌ Ccusage stats sync failed:', error)
    return { synced: false, reason: 'error', error }
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
