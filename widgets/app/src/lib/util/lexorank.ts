import { LexoRank } from 'lexorank'
import type { TaskObject } from '@polka/schema'

export const LexoRankUtil = {
  /**
   * Get a rank string for a new item at the start of a list
   */
  getFirstRank(): string {
    return LexoRank.min().toString()
  },

  /**
   * Get a rank string for a new item at the end of a list
   */
  getLastRank(): string {
    return LexoRank.max().toString()
  },

  /**
   * Get a rank string for a new item after the last item in a list
   */
  getNextRank(currentRank: string): string {
    return LexoRank.parse(currentRank).genNext().toString()
  },

  /**
   * Get a rank string for an item being moved between two other items
   */
  getBetweenRank(prevRank: string, nextRank: string): string {
    return LexoRank.parse(prevRank).between(LexoRank.parse(nextRank)).toString()
  },

  /**
   * Calculate a new rank for an item being moved to a specific index
   */
  calculateNewRank(items: TaskObject[], targetIndex: number): string {
    const prevItem = items[targetIndex - 1]
    const nextItem = items[targetIndex + 1]

    if (prevItem && nextItem) {
      return this.getBetweenRank(prevItem.rank, nextItem.rank)
    }

    if (prevItem) {
      return this.getNextRank(prevItem.rank)
    }

    if (nextItem) {
      return this.getFirstRank()
    }

    return LexoRank.middle().toString()
  }
}
