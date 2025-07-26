export * from './ipc/app-ready.ref.js'
export * from './ipc/user.ref.js'
// Export Claude ref functions with different names to avoid conflicts
export {
  ClaudeRef,
  ClaudeRefLive,
  getClaudeRef,
  getClaudeConfig,
  updateClaudeExecutablePath,
  updateClaudeAuthStatus,
  updateClaudeStats,
  syncClaudeUsageStats,
  addMcpServer as addClaudeMcpServer,
  removeMcpServer as removeClaudeMcpServer,
  toggleMcpServer as toggleClaudeMcpServer,
  updateMcpServers as updateClaudeMcpServers,
  getMcpServers as getClaudeMcpServers
} from './ipc/claude.ref.js'

import { Layer } from 'effect'
import { AppReadyRefLive } from './ipc/app-ready.ref.js'
import { UserRef, UserRefLive } from './ipc/user.ref.js'
import { ClaudeRefLive } from './ipc/claude.ref.js'

/**
 * Combined layer for all refs
 */
export const RefsLayer = Layer.mergeAll(AppReadyRefLive, UserRefLive, ClaudeRefLive)

// export { UpdateRef } from './ipc/update.ref.js'
export { UserRef } from './ipc/user.ref.js'
