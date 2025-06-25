import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { Version } from './version.js'
import { execFile } from 'child_process'
import { Effect } from 'effect'
import log from 'electron-log'

// Lazy-loaded libconveyor function
let conveyor_check_for_updates: any = null

/**
 * Get the current application version using Electron's app.getVersion()
 */
export function getCurrentVersion(): Version {
  try {
    const ver = app.getVersion()
    const parts = ver.split('.')
    const revision = parts.length >= 4 ? parseInt(parts[3]!, 10) : 0
    return new Version(parts.slice(0, 3).join('.'), revision)
  } catch (error) {
    return new Version('0.0.0')
  }
}

/**
 * Check if the update check UI can be triggered.
 * @returns Effect that resolves to true if update checking is available, false otherwise
 */
export const canTriggerUpdateCheckUI = Effect.tryPromise({
  try: async () => {
    if (isWindows()) {
      const updateExePath = getUpdateExePath()
      const exists = fs.existsSync(updateExePath)
      log.info(`[DEBUGUPDATE] Windows update exe exists: ${exists}, path: ${updateExePath}`)
      return exists
    }

    if (isLinux()) {
      return false
    }

    if (isMacOS()) {
      // Log OS details
      log.info(`[DEBUGUPDATE] macOS: ${process.platform} ${process.arch}`)

      // Try multiple potential paths for the Sparkle framework
      const possibleSparkleFrameworkPaths = [
        // Standard paths for Electron apps
        path.join(app.getAppPath(), '..', '..', 'Frameworks', 'Sparkle.framework'),
        path.join(app.getAppPath(), '..', 'Frameworks', 'Sparkle.framework'),
        // Path based on app executable location
        path.join(path.dirname(app.getPath('exe')), '..', 'Frameworks', 'Sparkle.framework'),
        // Absolute path version of the app executable path
        path.join(path.dirname(process.execPath), '..', 'Frameworks', 'Sparkle.framework')
      ]

      // Check if Sparkle framework exists
      let sparkleExists = false
      let foundFrameworkPath = ''
      for (const frameworkPath of possibleSparkleFrameworkPaths) {
        if (fs.existsSync(frameworkPath)) {
          sparkleExists = true
          foundFrameworkPath = frameworkPath
          log.info(`[DEBUGUPDATE] Found Sparkle framework at: ${frameworkPath}`)
          break
        }
      }

      if (!sparkleExists) {
        log.warn('[DEBUGUPDATE] Sparkle framework not found in any of the expected locations')
        return false
      }

      // Try multiple potential paths for libconveyor.dylib
      const libconveyorPaths = [
        // Standard paths in the app bundle
        path.join(app.getAppPath(), '..', '..', 'Frameworks', 'libconveyor.dylib'),
        path.join(app.getAppPath(), '..', '..', 'Frameworks', 'Squirrel.framework', 'Squirrel'),
        path.join(path.dirname(app.getPath('exe')), '..', 'Frameworks', 'libconveyor.dylib'),
        path.join(
          path.dirname(app.getPath('exe')),
          '..',
          'Frameworks',
          'Squirrel.framework',
          'Squirrel'
        ),
        // Additional path for absolute executable path resolution
        path.join(path.dirname(process.execPath), '..', 'Frameworks', 'libconveyor.dylib'),
        path.join(
          path.dirname(process.execPath),
          '..',
          'Frameworks',
          'Squirrel.framework',
          'Squirrel'
        )
      ]

      // Log all paths that actually exist
      for (const libPath of libconveyorPaths) {
        if (fs.existsSync(libPath)) {
          log.info(`[DEBUGUPDATE] Found potential library at: ${libPath}`)
        }
      }

      // Try to load the update function if not already loaded
      if (!conveyor_check_for_updates) {
        for (const libPath of libconveyorPaths) {
          if (!fs.existsSync(libPath)) {
            continue
          }

          try {
            log.info(`[DEBUGUPDATE] Attempting to load library function from: ${libPath}`)
            // Load the library function synchronously
            // const func = await loadLibraryFunction(libPath, 'void conveyor_check_for_updates()')
            // if (func) {
            //   log.info('[DEBUGUPDATE] Successfully loaded conveyor_check_for_updates function')
            //   conveyor_check_for_updates = func
            //   break
            // }
          } catch (error) {
            log.error(`[DEBUGUPDATE] Failed to load library function from ${libPath}: ${error}`)
            continue
          }
        }
      }

      // If we found Sparkle.framework but couldn't load the function,
      // return true anyway as a fallback, so manual update check works
      if (sparkleExists && !conveyor_check_for_updates) {
        log.warn(
          '[DEBUGUPDATE] Sparkle framework found but library function could not be loaded, enabling updates anyway'
        )
        return true
      }

      return !!conveyor_check_for_updates
    }

    // Unknown platform
    return false
  },
  catch: (error) => new Error(`Failed to check update availability: ${error}`)
})

/**
 * Triggers the update process. If there is an update available it will be applied automatically (on Windows) or prompt the user
 * (on macOS), and the app will be restarted if the update is applied.
 *
 * You should ensure the application is in a position to restart without the user losing data before calling this.
 *
 * @throws {Error} If update checks are unavailable.
 */
export const triggerUpdateCheckUI = Effect.gen(function* () {
  const updateAvailable = yield* canTriggerUpdateCheckUI
  if (!updateAvailable) {
    yield* Effect.fail(new Error('Update checks unavailable'))
    return
  }

  if (isWindows()) {
    const updateExePath = getUpdateExePath()
    yield* Effect.tryPromise({
      try: () =>
        new Promise<void>((resolve, reject) => {
          log.info(`[DEBUGUPDATE] Launching update check process: ${updateExePath}`)
          execFile(updateExePath, ['--update-check'], (error) => {
            if (error) {
              log.error(`[DEBUGUPDATE] Error launching update check: ${error}`)
              reject(new Error('Error triggering update check'))
            } else {
              log.info('[DEBUGUPDATE] Update check process launched successfully')
              resolve()
            }
          })
        }),
      catch: (error) => new Error(`Failed to trigger update check: ${error}`)
    })
  } else if (isMacOS()) {
    if (conveyor_check_for_updates) {
      try {
        yield* Effect.sync(() => {
          log.info('[DEBUGUPDATE] Triggering native macOS update check')
          conveyor_check_for_updates()
          log.info('[DEBUGUPDATE] Native update check triggered successfully')
        })
      } catch (error) {
        log.error(`[DEBUGUPDATE] Error during native update check: ${error}`)

        // Try fallback method if native method fails
        try {
          yield* Effect.sync(() => {
            log.info('[DEBUGUPDATE] Attempting fallback update check method')
            openUpdateURL()
          })
        } catch (fallbackError) {
          yield* Effect.fail(
            new Error(
              `Failed to trigger update: ${error instanceof Error ? error.message : String(error)}`
            )
          )
        }
      }
    } else {
      // We get here if canTriggerUpdateCheckUI returned true but we have no function
      // This means we found Sparkle.framework but couldn't load the function
      log.error(
        '[DEBUGUPDATE] Native update check function not available, attempting alternate approach'
      )

      try {
        yield* Effect.sync(() => {
          log.info('[DEBUGUPDATE] Using fallback update mechanism')
          openUpdateURL()
        })
      } catch (fallbackError) {
        yield* Effect.fail(new Error('All update check methods failed'))
      }
    }
  } else {
    yield* Effect.fail(new Error('Update check not implemented for this platform'))
  }
})

/**
 * Get the path to the updatecheck.exe file on Windows
 */
function getUpdateExePath(): string {
  return path.join(path.dirname(app.getPath('exe')), 'updatecheck.exe')
}

/**
 * Make an HTTP request that follows redirects
 * @param url The URL to request
 * @returns Effect with response data, status code, and headers
 */
function makeRequest(
  url: string
): Effect.Effect<{ data: string; statusCode: number; headers: http.IncomingHttpHeaders }, Error> {
  return Effect.tryPromise({
    try: () =>
      new Promise((resolve, reject) => {
        function fetchUrl(currentUrl: string) {
          const urlObj = new URL(currentUrl)
          const protocol = urlObj.protocol === 'https:' ? https : http

          log.info(`[DEBUGUPDATE] Making request to: ${currentUrl}`)
          protocol
            .get(currentUrl, (res) => {
              // Handle redirects
              if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                log.info(`[DEBUGUPDATE] Redirecting to: ${res.headers.location}`)
                return fetchUrl(res.headers.location)
              }

              let data = ''
              res.on('data', (chunk) => (data += chunk))
              res.on('end', () => {
                log.info(`[DEBUGUPDATE] Request completed with status: ${res.statusCode}`)
                resolve({
                  data,
                  statusCode: res.statusCode || 0,
                  headers: res.headers
                })
              })
            })
            .on('error', (error) => {
              log.error(`[DEBUGUPDATE] Request error: ${error}`)
              reject(error)
            })
        }

        fetchUrl(url)
      }),
    catch: (error) => new Error(`HTTP request failed: ${error}`)
  })
}

/**
 * Format a GitHub repository URL to point to the metadata.properties file
 * @param repoUrl GitHub repository URL
 * @returns Formatted URL pointing to metadata.properties
 */
function formatGitHubMetadataUrl(repoUrl: string): string {
  // Remove trailing slash if present
  const cleanUrl = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl

  // Check if the URL already contains /releases/
  if (cleanUrl.includes('/releases/')) {
    // If it has /releases/ but not /download/metadata.properties, fix it
    if (cleanUrl.includes('/releases/latest')) {
      if (!cleanUrl.includes('/download/')) {
        return `${cleanUrl}/download/metadata.properties`
      }
    }
    // If it already has the full path including /download/, just ensure it ends with metadata.properties
    if (!cleanUrl.endsWith('metadata.properties')) {
      return `${cleanUrl}${cleanUrl.endsWith('/') ? '' : '/'}metadata.properties`
    }
    return cleanUrl
  }

  // For a basic repo URL, add the full path
  return `${cleanUrl}/releases/latest/download/metadata.properties`
}

/**
 * Fetch the latest version from the update site
 * @param updateSiteURL The URL of the update site
 */
export const getLatestVersion = (updateSiteURL: string): Effect.Effect<Version, Error> => {
  return Effect.gen(function* () {
    log.info(`[DEBUGUPDATE] Fetching latest version from: ${updateSiteURL}`)

    if (!updateSiteURL) {
      return yield* Effect.fail(new Error('Update site URL is not provided'))
    }

    // Construct the URL to metadata.properties
    let metadataUrl: string

    // Handle GitHub repository URLs
    if (updateSiteURL.includes('github.com')) {
      metadataUrl = formatGitHubMetadataUrl(updateSiteURL)
    } else {
      // For non-GitHub URLs, construct the path as before
      const url = new URL(updateSiteURL)
      url.pathname = path.join(url.pathname, 'metadata.properties')
      metadataUrl = url.toString()
    }

    log.info(`[DEBUGUPDATE] Fetching metadata from: ${metadataUrl}`)

    // Make the request with redirect handling
    const response = yield* makeRequest(metadataUrl)
    log.info(`[DEBUGUPDATE] Received response with status code: ${response.statusCode}`)

    const props = parseProperties(response.data)

    if (!props['app.version']) {
      log.error('[DEBUGUPDATE] Cannot find app.version key in metadata.properties')
      return yield* Effect.fail(new Error('Cannot find app.version key in metadata.properties'))
    } else {
      const ver = props['app.version']
      const revision = parseInt(props['app.revision'] || '0', 10)
      log.info(`[DEBUGUPDATE] Latest version: ${ver} (revision: ${revision})`)
      return new Version(ver, revision)
    }
  })
}

/**
 * Parse properties file format (key=value)
 * @param data The properties file content
 */
function parseProperties(data: string): Record<string, string> {
  return data.split('\n').reduce(
    (acc, line) => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=').map((s) => s.trim())
        if (key && value) acc[key] = value
      }
      return acc
    },
    {} as Record<string, string>
  )
}

/**
 * Check if update is available by comparing versions
 * @param currentVersion Current version of the app
 * @param latestVersion Latest version available
 */
export function isUpdateAvailable(currentVersion: Version, latestVersion: Version): boolean {
  const result = currentVersion.compareTo(latestVersion) < 0
  log.info(
    `[DEBUGUPDATE] Update check: Current version ${currentVersion.toString()}, Latest version ${latestVersion.toString()}, Update available: ${result}`
  )
  return result
}

/**
 * Determine if the app is running on macOS
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin'
}

/**
 * Determine if the app is running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Determine if the app is running on Linux
 */
export function isLinux(): boolean {
  return process.platform === 'linux'
}

/**
 * Fallback mechanism to open the update URL directly
 * This is a last resort when native methods fail
 */
function openUpdateURL(): void {
  try {
    const { shell } = require('electron')
    const { dialog } = require('electron')

    log.info('[DEBUGUPDATE] Showing manual update dialog')

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Check for Updates',
        message: 'Would you like to check for updates?',
        detail:
          'The automatic update system is not working. Click OK to visit our website to check for updates manually.',
        buttons: ['OK', 'Cancel']
      })
      .then(({ response }: { response: number }) => {
        if (response === 0) {
          // Replace with your actual update URL
          const updateURL = 'https://yourapp.com/downloads'
          log.info(`[DEBUGUPDATE] Opening update URL: ${updateURL}`)
          shell.openExternal(updateURL)
        }
      })
      .catch((error: Error) => {
        log.error('[DEBUGUPDATE] Error showing dialog:', error)
      })
  } catch (error) {
    log.error('[DEBUGUPDATE] Failed to open update URL:', error)
    throw error
  }
}
