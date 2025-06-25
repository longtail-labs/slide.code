// Export Encore generated client
export * from './encore.js'

import Client, { type BaseURL, Environment, Local } from './encore.js'

/**
 * Determine the base URL for the Encore API based on the current environment
 */
export function getEncoreBaseURL(): BaseURL {
  // Check the environment
  const nodeEnv = process.env.NODE_ENV
  const mode = process.env.MODE

  // For client-side code, check Vite environment variables if available
  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
  const viteDev = viteEnv?.DEV
  const viteProd = viteEnv?.PROD
  const viteMode = viteEnv?.MODE

  // Override from environment if specified
  const envOverride = process.env.VITE_ENCORE_API_URL || viteEnv?.VITE_ENCORE_API_URL
  if (envOverride) {
    return envOverride
  }

  // Determine environment
  if (viteDev || nodeEnv === 'development') {
    console.log('Using local development server')
    return Local // Local development server
  } else if (viteMode === 'beta' || mode === 'beta') {
    console.log('Using beta environment')
    return Environment('beta') // Beta environment
  } else if (viteProd || nodeEnv === 'production') {
    console.log('Using production environment')
    return Environment('prod') // Production environment
  }

  console.log('Using local development server')

  // Default to local if environment cannot be determined
  return Local
}

/**
 * Create an Encore client configured for the current environment
 */
export function createEncoreClient() {
  return new Client(getEncoreBaseURL())
}

/**
 * Create an Encore client configured for the current environment
 */
export function createAuthedEncoreClient(token: string | undefined) {
  return new Client(getEncoreBaseURL(), {
    auth: token ? { authorization: `Bearer ${token}` } : undefined
  })
}

// Default export of the environment-aware client
export const encoreClient = createEncoreClient()
