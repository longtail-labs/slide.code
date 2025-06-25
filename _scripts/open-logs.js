import { exec } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read package.json to get app name
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const appName = packageJson.name

function getLogPath() {
  const platform = process.platform
  const home = os.homedir()

  switch (platform) {
    case 'linux':
      return path.join(home, '.config', appName, 'logs/main.log')
    case 'darwin': // macOS
      return path.join(home, 'Library/Logs', appName, 'main.log')
    case 'win32':
      return path.join(home, 'AppData/Roaming', appName, 'logs/main.log')
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

function openLog() {
  const logPath = getLogPath()

  // Check if log file exists
  if (!fs.existsSync(logPath)) {
    console.error(`Log file not found at: ${logPath}`)
    return
  }

  const platform = process.platform

  // Use appropriate command based on platform
  const command =
    platform === 'win32'
      ? `start ${logPath}`
      : platform === 'darwin'
        ? `open ${logPath}`
        : `xdg-open ${logPath}`

  exec(command, (error) => {
    if (error) {
      console.error('Error opening log file:', error)
      return
    }
    console.log(`Opening log file at: ${logPath}`)
  })
}

openLog()
