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

function clearLog() {
  const logPath = getLogPath()

  try {
    // Check if log file exists
    if (!fs.existsSync(logPath)) {
      console.error(`Log file not found at: ${logPath}`)
      return
    }

    // Clear the file by writing an empty string to it
    fs.writeFileSync(logPath, '')
    console.log(`Log file cleared at: ${logPath}`)
  } catch (error) {
    console.error('Error clearing log file:', error)
  }
}

clearLog()
