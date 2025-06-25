#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function buildForConveyor() {
  console.log('Starting build process for Conveyor...')

  try {
    // Step 1: Build the application packages
    console.log('\n📦 Building all packages...')
    // execSync('npm run build:prod', { cwd: rootDir, stdio: 'inherit' })

    // Step 2: Create node_modules_build directory with optimized dependencies
    console.log('\n📦 Creating optimized node_modules...')

    // First remove any existing node_modules_build
    try {
      await fs.rm(path.join(rootDir, 'node_modules_build'), { recursive: true, force: true })
    } catch (err) {
      // Ignore if directory doesn't exist
    }

    // Create the directory
    await fs.mkdir(path.join(rootDir, 'node_modules_build'), { recursive: true })

    // Simplified approach: Copy the entire node_modules directory
    // This ensures all dependencies, including transitive ones, are included
    console.log('Copying all dependencies from node_modules...')

    // Get a list of all top-level directories in node_modules
    const nodeModulesPath = path.join(rootDir, 'node_modules')
    const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true })

    // Copy each top-level directory/package
    for (const entry of entries) {
      // Skip the .bin directory and any files (only copy packages)
      if (entry.name === '.bin' || !entry.isDirectory()) {
        continue
      }

      const sourcePath = path.join(nodeModulesPath, entry.name)
      const destPath = path.join(rootDir, 'node_modules_build', entry.name)

      try {
        console.log(`Copying package: ${entry.name}`)
        // Create necessary parent directories
        await fs.mkdir(path.dirname(destPath), { recursive: true })
        // Copy the dependency with all its contents
        execSync(`cp -R "${sourcePath}" "${destPath}"`, { stdio: 'inherit' })
      } catch (err) {
        console.warn(`Warning: Could not copy package ${entry.name}: ${err.message}`)
      }
    }

    // Step 3: Build the ASAR package
    console.log('\n📦 Building optimized ASAR package...')
    execSync('node scripts/build-asar.js', { cwd: rootDir, stdio: 'inherit' })

    // Step 4: Verify the ASAR package was created
    const asarPath = path.join(rootDir, 'dist', 'app.asar')
    const asarExists = await fs
      .access(asarPath)
      .then(() => true)
      .catch(() => false)

    if (!asarExists) {
      throw new Error('ASAR package was not created properly')
    }

    console.log(`\n✅ Build completed successfully! ASAR package is at: ${asarPath}`)
    console.log('\nYou can now use this ASAR package with Conveyor by updating your conveyor.conf')
  } catch (error) {
    console.error('\n❌ Build failed:', error)
    process.exit(1)
  }
}

buildForConveyor().catch(console.error)
