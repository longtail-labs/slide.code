import { execSync } from 'child_process'
import os from 'os'

const platform = os.platform()

function compile() {
  try {
    switch (platform) {
      case 'darwin':
        execSync('npm run compile:keycapture:mac', { stdio: 'inherit' })
        break
      case 'win32':
        execSync('npm run compile:keycapture:windows', { stdio: 'inherit' })
        break
      case 'linux':
        execSync('npm run compile:keycapture:linux', { stdio: 'inherit' })
        break
      default:
        console.error('Unsupported platform:', platform)
        process.exit(1)
    }
  } catch (error) {
    console.error('Compilation failed:', error)
    process.exit(1)
  }
}

compile()
