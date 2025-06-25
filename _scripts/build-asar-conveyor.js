#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createPackageWithOptions } from '@electron/asar'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
// Change 'build-app' to the folder that actually contains your built files.
const sourceDir = path.join(rootDir, 'packages')  // Update this if your built files are elsewhere
const distDir = path.join(rootDir, 'dist')
const asarPath = path.join(distDir, 'app.asar')

async function packageApp() {
  // Verify the source directory has files
  try {
    const items = await fs.readdir(sourceDir)
    console.log(`Found ${items.length} items in ${sourceDir}:`, items)
    if (items.length === 0) {
      console.error('Error: The source directory is empty. Nothing to package!')
      process.exit(1)
    }
  } catch (err) {
    console.error('Error reading source directory:', err)
    process.exit(1)
  }

  // Create output directory and build ASAR package
  await fs.mkdir(distDir, { recursive: true })
  console.log(`Creating ASAR archive from ${sourceDir} to ${asarPath}...`)
  await createPackageWithOptions(sourceDir, asarPath, { unpack: '**/*.node' })
  console.log(`ASAR package created at ${asarPath}`)
}

packageApp().catch(console.error)
