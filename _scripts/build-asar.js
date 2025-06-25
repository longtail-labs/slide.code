#!/usr/bin/env node

import { createPackageWithOptions, listPackage } from '@electron/asar'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Helper function to ensure directory exists
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

async function buildAsar() {
  console.log('Building optimized ASAR package...')

  // Ensure output directory exists
  const outputDir = path.join(rootDir, 'dist')
  await ensureDir(outputDir)

  // First, run the prepare-asar-files.js script to gather all necessary files
  console.log('Preparing files for ASAR packaging...')
  try {
    execSync('node scripts/prepare-asar-files.js', {
      cwd: rootDir,
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('Failed to prepare files for ASAR packaging:', error)
    process.exit(1)
  }

  // Source directory now contains all the prepared files
  const sourceDir = path.join(rootDir, 'build-app')
  const outputAsar = path.join(outputDir, 'app.asar')
  const unpackedDir = path.join(outputDir, 'app.asar.unpacked')

  // Ensure the build-app directory exists
  const buildDirExists = await fs
    .access(sourceDir)
    .then(() => true)
    .catch(() => false)
  if (!buildDirExists) {
    console.error(`Error: Source directory ${sourceDir} does not exist. Preparation step failed.`)
    process.exit(1)
  }

  // Create the ASAR package with custom options
  const options = {
    // Unpack native modules and other files that need direct filesystem access
    unpack: '**/*.{node,dll,exe,so,dylib}',
    // Preserve package.json files with type: module
    transformPackageJson: false,
    // Add a transform function to preserve import specifiers
    transform: function (filePath) {
      // No transformation for ESM files
      return null // Return null for no transformation
    }
  }

  try {
    console.log(`Creating ASAR from ${sourceDir} to ${outputAsar}`)
    await createPackageWithOptions(sourceDir, outputAsar, options)
    console.log('ASAR package created successfully!')

    // Verify ASAR was created
    const asarExists = await fs
      .access(outputAsar)
      .then(() => true)
      .catch(() => false)
    if (!asarExists) {
      throw new Error('ASAR package was not created')
    }

    // Check for unpacked directory
    const unpackedExists = await fs
      .access(unpackedDir)
      .then(() => true)
      .catch(() => false)
    if (unpackedExists) {
      console.log(`Unpacked files directory exists at ${unpackedDir}`)
    } else {
      // Create unpacked directory if it doesn't exist
      console.log('Creating unpacked directory...')
      await ensureDir(unpackedDir)
    }

    // Get size of ASAR file
    const stats = await fs.stat(outputAsar)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`ASAR package size: ${sizeInMB} MB`)

    // Verify the contents of the ASAR package
    console.log('\nVerifying ASAR package contents...')
    const asarContents = await listPackage(outputAsar)

    // Check if node_modules/@polka directory exists
    if (asarContents['node_modules'] && asarContents['node_modules']['@polka']) {
      const polkaPackages = Object.keys(asarContents['node_modules']['@polka']).sort()
      console.log(`\nFound ${polkaPackages.length} @polka packages in node_modules/@polka:`)
      polkaPackages.forEach((pkg) => console.log(`  - @polka/${pkg}`))
    } else {
      console.warn('Warning: node_modules/@polka directory not found in ASAR!')
    }

    // Check if the entry point exists
    if (asarContents['packages'] && asarContents['packages']['entry-point.js']) {
      console.log('\nEntry point found: packages/entry-point.js')
    } else {
      console.warn('Warning: Entry point (packages/entry-point.js) not found in ASAR!')
    }

    console.log('\nASAR build complete! Files are ready to be used with Conveyor.')
  } catch (error) {
    console.error('Error creating ASAR package:', error)
    process.exit(1)
  }
}

buildAsar().catch((error) => {
  console.error('Unhandled error in buildAsar function:', error)
  process.exit(1)
})
