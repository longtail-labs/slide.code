#!/usr/bin/env node

import { exec } from 'child_process'
import { getDatabasePath } from '../packages/database/dist/utils/databasePath.js'
// const { getDatabasePath } = require('../packages/database/dist/utils/databasePath.js')
// import path from 'path'
// import { fileURLToPath } from 'url'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))
// const projectRoot = path.join(__dirname, '..')

// Get the database directory path
const dbPath = getDatabasePath()
console.log('Database path:', dbPath)

// Determine the platform-specific open command
const openCommand =
  process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open'

// Create the command to open the directory
const command = `${openCommand} "${dbPath}"`

// Execute the command
exec(command, (error) => {
  if (error) {
    console.error('Error opening database directory:', error)
    process.exit(1)
  }
  console.log('Opening database directory...')
  process.exit(0)
})
