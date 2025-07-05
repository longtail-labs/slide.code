import { Effect, Layer } from 'effect'
import {
  loadDailyUsageData,
  loadSessionData,
  type DailyUsage as CcusageDailyUsage,
  type SessionUsage as CcusageSessionUsage
} from 'ccusage/data-loader'
import { calculateTotals, createTotalsObject } from 'ccusage/calculate-cost'
import type { DailyUsage, SessionUsage, TokenTotals, ModelBreakdown } from '@slide.code/schema'
import { DefaultLoggerLayer } from '../logger.js'
import log from 'electron-log'

/**
 * Errors that can be thrown by the Ccusage service
 */
export class CcusageServiceError extends Error {
  readonly _tag = 'CcusageServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'CcusageServiceError'
  }
}

/**
 * Options for loading usage data
 */
export interface LoadUsageOptions {
  /**
   * Path to Claude data directory (defaults to default Claude path)
   */
  claudePath?: string
  /**
   * Start date filter (YYYYMMDD format)
   */
  since?: string
  /**
   * End date filter (YYYYMMDD format)
   */
  until?: string
  /**
   * Maximum number of days to load
   */
  maxDays?: number
  /**
   * Maximum number of sessions to load
   */
  maxSessions?: number
}

/**
 * Service for integrating with the ccusage library to fetch Claude Code usage statistics
 */
export class CcusageService extends Effect.Tag('CcusageService')<
  CcusageService,
  {
    /**
     * Load daily usage data from Claude Code logs
     */
    loadDailyUsage: () => Effect.Effect<DailyUsage[], Error>

    /**
     * Load session usage data from Claude Code logs
     */
    loadSessionUsage: () => Effect.Effect<SessionUsage[], Error>

    /**
     * Load all usage data and calculate comprehensive stats
     */
    loadComprehensiveStats: () => Effect.Effect<
      {
        dailyUsage: DailyUsage[]
        sessionUsage: SessionUsage[]
        tokenTotals: TokenTotals
        modelsUsed: string[]
      },
      Error
    >
  }
>() {}

/**
 * Convert ccusage ModelBreakdown to our schema format
 */
const convertModelBreakdown = (ccusageBreakdown: any): ModelBreakdown => ({
  modelName: ccusageBreakdown.modelName as string,
  inputTokens: ccusageBreakdown.inputTokens,
  outputTokens: ccusageBreakdown.outputTokens,
  cacheCreationTokens: ccusageBreakdown.cacheCreationTokens,
  cacheReadTokens: ccusageBreakdown.cacheReadTokens,
  cost: ccusageBreakdown.cost
})

/**
 * Convert ccusage DailyUsage to our schema format
 */
const convertDailyUsage = (ccusageData: CcusageDailyUsage): DailyUsage => ({
  date: ccusageData.date as string,
  inputTokens: ccusageData.inputTokens,
  outputTokens: ccusageData.outputTokens,
  cacheCreationTokens: ccusageData.cacheCreationTokens,
  cacheReadTokens: ccusageData.cacheReadTokens,
  totalCost: ccusageData.totalCost,
  modelsUsed: ccusageData.modelsUsed as string[],
  modelBreakdowns: ccusageData.modelBreakdowns.map(convertModelBreakdown)
})

/**
 * Convert ccusage SessionUsage to our schema format
 */
const convertSessionUsage = (ccusageData: CcusageSessionUsage): SessionUsage => ({
  sessionId: ccusageData.sessionId as string,
  projectPath: ccusageData.projectPath as string,
  inputTokens: ccusageData.inputTokens,
  outputTokens: ccusageData.outputTokens,
  cacheCreationTokens: ccusageData.cacheCreationTokens,
  cacheReadTokens: ccusageData.cacheReadTokens,
  totalCost: ccusageData.totalCost,
  lastActivity: ccusageData.lastActivity as string,
  versions: ccusageData.versions as string[],
  modelsUsed: ccusageData.modelsUsed as string[],
  modelBreakdowns: ccusageData.modelBreakdowns.map(convertModelBreakdown)
})

/**
 * Implementation of the CcusageService
 */
const CcusageServiceLive = Layer.effect(
  CcusageService,
  Effect.sync(() => ({
    loadDailyUsage: () =>
      Effect.tryPromise({
        try: async () => {
          const data = await loadDailyUsageData()
          return data.map(convertDailyUsage)
        },
        catch: (error) => new Error(`Failed to load daily usage data: ${error}`)
      }),

    loadSessionUsage: () =>
      Effect.tryPromise({
        try: async () => {
          const data = await loadSessionData()
          return data.map(convertSessionUsage)
        },
        catch: (error) => new Error(`Failed to load session usage data: ${error}`)
      }),

    loadComprehensiveStats: () =>
      Effect.gen(function* () {
        const rawDailyData = yield* Effect.tryPromise({
          try: async () => await loadDailyUsageData(),
          catch: (error) => new Error(`Failed to load daily usage data: ${error}`)
        })

        const rawSessionData = yield* Effect.tryPromise({
          try: async () => await loadSessionData(),
          catch: (error) => new Error(`Failed to load session usage data: ${error}`)
        })

        // Log the raw data to understand what we're getting
        log.info('[CcusageService] 📊 Raw daily data count:', rawDailyData.length)
        log.info('[CcusageService] 📊 Raw session data count:', rawSessionData.length)

        // Log some sample data to understand the structure
        if (rawDailyData.length > 0) {
          log.info('[CcusageService] 📊 Sample daily data:', rawDailyData.slice(0, 2))
        }
        if (rawSessionData.length > 0) {
          log.info('[CcusageService] 📊 Sample session data:', rawSessionData.slice(0, 2))
        }

        // Calculate totals from daily data only (likely already aggregated)
        const dailyTotals = yield* Effect.try({
          try: () => {
            const totals = calculateTotals(rawDailyData)
            const totalsObj = createTotalsObject(totals)
            log.info('[CcusageService] 📊 Daily totals:', totalsObj)
            return totalsObj
          },
          catch: (error) => new Error(`Failed to calculate daily totals: ${error}`)
        })

        // Calculate totals from session data only
        const sessionTotals = yield* Effect.try({
          try: () => {
            const totals = calculateTotals(rawSessionData)
            const totalsObj = createTotalsObject(totals)
            log.info('[CcusageService] 📊 Session totals:', totalsObj)
            return totalsObj
          },
          catch: (error) => new Error(`Failed to calculate session totals: ${error}`)
        })

        // Calculate combined totals (what we were doing before - likely double counting)
        const combinedTotals = yield* Effect.try({
          try: () => {
            const combinedData = [...rawDailyData, ...rawSessionData]
            const totals = calculateTotals(combinedData)
            const totalsObj = createTotalsObject(totals)
            log.info('[CcusageService] 📊 Combined totals (likely double counted):', totalsObj)
            return totalsObj
          },
          catch: (error) => new Error(`Failed to calculate combined totals: ${error}`)
        })

        // Use daily totals as the authoritative source (avoiding double counting)
        const tokenTotals = {
          inputTokens: dailyTotals.inputTokens,
          outputTokens: dailyTotals.outputTokens,
          cacheCreationTokens: dailyTotals.cacheCreationTokens,
          cacheReadTokens: dailyTotals.cacheReadTokens,
          totalTokens: dailyTotals.totalTokens,
          totalCost: dailyTotals.totalCost
        }

        // Convert to our schema format
        const dailyUsage = rawDailyData.map(convertDailyUsage)
        const sessionUsage = rawSessionData.map(convertSessionUsage)

        // Extract unique models used across all data
        const modelsUsed = Array.from(
          new Set([
            ...dailyUsage.flatMap((d) => d.modelsUsed),
            ...sessionUsage.flatMap((s) => s.modelsUsed)
          ])
        )

        return {
          dailyUsage,
          sessionUsage,
          tokenTotals,
          modelsUsed
        }
      })
  }))
)

export { CcusageServiceLive }

/**
 * Helper functions for direct usage
 */

/**
 * Load daily usage data
 */
export const loadDailyUsage = (options: LoadUsageOptions = {}) =>
  Effect.gen(function* () {
    const service = yield* CcusageService
    return yield* service.loadDailyUsage()
  })

/**
 * Load session usage data
 */
export const loadSessionUsage = (options: LoadUsageOptions = {}) =>
  Effect.gen(function* () {
    const service = yield* CcusageService
    return yield* service.loadSessionUsage()
  })

/**
 * Get comprehensive usage data
 */
export const getComprehensiveUsage = (options: LoadUsageOptions = {}) =>
  Effect.gen(function* () {
    const service = yield* CcusageService
    return yield* service.loadComprehensiveStats()
  })
