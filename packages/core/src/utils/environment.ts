import { app } from 'electron'
import { exec } from 'child_process'
import { readFile } from 'fs'
import { platform, release, totalmem, freemem, cpus, uptime } from 'os'
import { isBeta, isProd, isDev } from '../utils/index.js'

/**
 * Interface defining the environment information to be collected
 */
export interface EnvironmentInfo {
  isDebug: boolean
  locale: string
  appVersion: string
  osName: string
  osVersion: string
  engineName: string
  engineVersion: string
  nodeVersion: string
  architecture?: string
  // Additional metrics
  totalMemoryGB?: number
  freeMemoryGB?: number
  deviceType?: string
  cpuModel?: string
  cpuCores?: number
  gpuInfo?: string
  systemUptimeHours?: number
  timezone?: string
  // Release channel
  isBeta?: boolean
  isProd?: boolean
  isDev?: boolean
}

/**
 * Get comprehensive environment information about the current system
 * @returns Promise with environment information
 */
export async function getEnvironmentInfo(): Promise<EnvironmentInfo> {
  const [osName, osVersion] = await getOperatingSystem()

  // Get GPU information
  let gpuInfo: string | undefined
  try {
    if (platform() === 'darwin') {
      gpuInfo = await getGPUInfoMac()
    } else if (platform() === 'win32') {
      gpuInfo = await getGPUInfoWindows()
    }
  } catch (error) {
    // Ignore errors when getting GPU info
  }

  // Get CPU info
  const cpuDetails = cpus()
  const cpuModel = cpuDetails.length > 0 ? cpuDetails[0]?.model?.trim() || 'Unknown' : 'Unknown'
  const cpuCores = cpuDetails.length

  // Get memory information
  const totalMemoryGB = Math.round((totalmem() / (1024 * 1024 * 1024)) * 10) / 10 // Round to 1 decimal
  const freeMemoryGB = Math.round((freemem() / (1024 * 1024 * 1024)) * 10) / 10 // Round to 1 decimal

  // Calculate system uptime in hours
  const systemUptimeHours = Math.round((uptime() / 3600) * 10) / 10 // Round to 1 decimal

  // Detect device type
  const deviceType = getDeviceType()

  // Get timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Get system architecture
  const architecture = process.arch

  // Get release channel
  const isBetaVersion = isBeta()
  const isProdVersion = isProd()
  const isDevVersion = isDev()

  return {
    isDebug: !app.isPackaged,
    locale: app.getLocale(),
    appVersion: app.getVersion(),
    osName,
    osVersion,
    engineName: 'Chromium',
    engineVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    architecture,
    // Additional metrics
    totalMemoryGB,
    freeMemoryGB,
    deviceType,
    cpuModel,
    cpuCores,
    gpuInfo,
    systemUptimeHours,
    timezone,
    // Release channel
    isBeta: isBetaVersion,
    isProd: isProdVersion,
    isDev: isDevVersion
  }
}

/**
 * Get the operating system name and version
 * @returns Promise with OS name and version as tuple
 */
async function getOperatingSystem(): Promise<[string, string]> {
  switch (platform()) {
    case 'win32':
      return ['Windows', release()]
    case 'darwin':
      const macOSVersion = await getMacOSVersion()
      return ['macOS', macOSVersion]
    default:
      return await getLinuxInfo()
  }
}

/**
 * Get macOS version using sw_vers command
 * @returns Promise with macOS version string
 */
async function getMacOSVersion(): Promise<string> {
  try {
    return await new Promise<string>((resolve, reject) => {
      exec('/usr/bin/sw_vers -productVersion', (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout.trim())
      })
    })
  } catch (ex) {
    return release() // Fallback to node's OS release
  }
}

/**
 * Get Linux distribution name and version
 * @returns Promise with Linux distro name and version
 */
async function getLinuxInfo(): Promise<[string, string]> {
  try {
    const content = await new Promise<string>((resolve, reject) => {
      readFile('/etc/os-release', 'utf8', (error, output) => {
        if (error) {
          reject(error)
          return
        }
        resolve(output)
      })
    })

    const lines = content.split('\n')
    const osData: Record<string, string> = {}

    for (const line of lines) {
      const [key, value] = line.split('=')
      if (key && value) {
        osData[key] = value.replace(/"/g, '') // Remove quotes if present
      }
    }

    const osName = osData['NAME'] ?? 'Linux'
    const osVersion = osData['VERSION_ID'] ?? ''

    return [osName, osVersion]
  } catch {
    return ['Linux', release()] // Fallback to node's OS release
  }
}

/**
 * Get GPU info for macOS systems
 */
async function getGPUInfoMac(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      'system_profiler SPDisplaysDataType | grep "Chipset Model:" | awk \'{print $3, $4, $5}\'',
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout.trim())
      }
    )
  })
}

/**
 * Get GPU info for Windows systems
 */
async function getGPUInfoWindows(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('wmic path win32_VideoController get name', (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      // Parse out the header line and get just the name
      const lines = stdout
        .split('\n')
        .filter((line) => line.trim() !== '' && line.trim() !== 'Name')
      resolve(lines[0]?.trim() || 'Unknown')
    })
  })
}

/**
 * Determine if running on desktop/laptop/other
 */
function getDeviceType(): string {
  // This is an approximation - no perfect way to detect in Electron
  const laptopPatterns = ['MacBook', 'Laptop', 'Notebook', 'Portable', 'Book']

  try {
    if (platform() === 'darwin') {
      // Try to detect MacBook vs Mac desktop
      const modelName = process.env.APPLE_MODEL_NAME || ''
      if (modelName.includes('MacBook')) {
        return 'Laptop'
      } else if (
        modelName.includes('iMac') ||
        modelName.includes('Mac Pro') ||
        modelName.includes('Mac mini')
      ) {
        return 'Desktop'
      }
    } else if (platform() === 'win32') {
      // Could add more sophisticated Windows detection here
      const totalRAM = totalmem()
      const cpuCount = cpus().length
      if (totalRAM < 8 * 1024 * 1024 * 1024 && cpuCount <= 4) {
        // Lower spec machines are more likely to be laptops
        return 'Laptop'
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return 'Desktop' // Default to desktop
}
