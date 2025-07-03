import { app } from 'electron'
import path from 'path'
import { platform } from 'os'
import os from 'node:os'
// import { logger } from './logger/logger-main.js'

// Add TypeScript declaration for the Vite-injected global

// const pathsLogger = logger.createScoped('Paths')

// Directly access the global variable defined by Vite
// console.log('WTF PATHS', database.url)

// Add this constant at the top of the file
// const IS_PROD = process.env.NODE_ENV === 'production' || import.meta.env?.PROD === trueIS_P

export function getDrizzleFolder(): string {
  if (isPackaged()) {
    // pathsLogger.info('Drizzle folder packaged:', process.resourcesPath)
    return path.join(process.resourcesPath, 'drizzle')
  } else {
    // pathsLogger.info('Drizzle folder dev:', process.cwd())
    return path.join(process.cwd(), 'drizzle')
  }
}

export function getIconPath(): string {
  if (!isDev() || isPackaged()) {
    return path.join(process.resourcesPath, 'icon.png')
  } else {
    // In development, use the relative path
    const iconPath = path.join(process.cwd(), 'icons', 'slide-logo.png')
    return iconPath
  }
}

export function getPlatform() {
  switch (platform()) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux'
    case 'darwin':
    case 'sunos':
      return 'mac'
    case 'win32':
      return 'win'
    default:
      return null
  }
}

export function getBinariesPath() {
  const isPackaged = app.isPackaged

  const binariesPath = isPackaged
    ? path.join(process.resourcesPath, './bin')
    : path.join(app.getAppPath(), 'resources', getPlatform()!)

  return binariesPath
}

export function isDev(): boolean {
  return !isPackaged() && process.env.NODE_ENV === 'development'
}

export function isBeta(): boolean {
  return process.resourcesPath?.includes('Slide.beta.app')
}

export function isProd(): boolean {
  return process.resourcesPath?.includes('Slide.app')
}

export function isPackaged(): boolean {
  // Multiple ways to detect if we're in production/packaged mode
  return isProd() || isBeta() || app.isPackaged
}

export function getDatabasePath(inMemory?: boolean): string {
  // pathsLogger.info('[Paths]', {
  //   inMemory,
  //   isProd: isProd(),
  //   isDev: isDev(),
  //   mode: import.meta.env?.MODE,
  //   resourcesPath: process.resourcesPath,
  //   isPackaged: isPackaged()
  // })

  if (inMemory) {
    return ':memory:'
  }

  // Always use userData path in production/packaged mode
  if (isPackaged()) {
    return app.getPath('userData')
    // pathsLogger.info('Production: using userData path:', userDataPath)
  }

  // In development, use the configured path or fallback
  if (import.meta.env?.VITE_DATABASE_URL) {
    const devPath = path.join(process.cwd(), import.meta.env.VITE_DATABASE_URL)
    // pathsLogger.info('Development: using configured path:', devPath)
    return devPath
  }

  // Fallback path
  return path.join(app.getPath('userData'), 'slide')
}

export function getVibeDir(): string {
  return path.join(os.homedir(), 'Documents', 'vibe-dir')
}

export function getDefaultProjectsDir(): string {
  return path.join(getVibeDir(), 'projects')
}

export const paths = {
  data: (): string => {
    if (isPackaged()) {
      return app.getPath('userData')
    }
    return path.join(process.cwd(), '.database')
  }
}
