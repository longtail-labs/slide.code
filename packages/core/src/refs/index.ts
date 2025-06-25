export * from './theme.ref.js'
export * from './update.ref.js'

import { Layer } from 'effect'

import { ThemeRefLive } from './theme.ref.js'
import { UpdateRefLive } from './update.ref.js'
import { UserRefLive } from './user.ref.js'
/**
 * Combined layer for all refs
 */
export const RefsLayer = Layer.mergeAll(ThemeRefLive, UpdateRefLive, UserRefLive)
