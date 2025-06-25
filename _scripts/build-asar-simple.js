#!/usr/bin/env node

import { createPackageWithOptions, listPackage } from '@electron/asar'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname)
const outputDir = path.join(rootDir, 'dist')
const asarPath = path.join(outputDir, 'app.asar')
const unpackedDir = path.join(outputDir, 'app.asar.unpacked')

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

  try {
    // Ensure output directory exists
    await ensureDir(outputDir)

    // Define the directories to include in the ASAR
    const tempDir = path.join(rootDir, 'temp-asar-build')
    await ensureDir(tempDir)

    // Create a structure for the ASAR package
    console.log('Creating temporary build structure...')

    // Copy package.json to the temp directory
    await fs.copyFile(path.join(rootDir, 'package.json'), path.join(tempDir, 'package.json'))

    // Copy entry point
    const entryPointDir = path.join(tempDir, 'packages')
    await ensureDir(entryPointDir)
    await fs.copyFile(
      path.join(rootDir, 'packages/entry-point.js'),
      path.join(entryPointDir, 'entry-point.js')
    )

    // Copy node_modules_build to node_modules in temp dir
    const nodeModulesDir = path.join(tempDir, 'node_modules')
    await ensureDir(nodeModulesDir)

    // Copy @polka modules
    const polkaDir = path.join(nodeModulesDir, '@polka')
    await ensureDir(polkaDir)

    // Copy main and ssr-client folders
    await fs.cp(path.join(rootDir, 'node_modules_build/@polka/main'), path.join(polkaDir, 'main'), {
      recursive: true
    })

    await fs.cp(
      path.join(rootDir, 'node_modules_build/@polka/ssr-client'),
      path.join(polkaDir, 'ssr-client'),
      { recursive: true }
    )

    // Copy koffi module
    await fs.cp(
      path.join(rootDir, 'node_modules_build/koffi'),
      path.join(nodeModulesDir, 'koffi'),
      { recursive: true }
    )

    // Copy kuzu module
    await fs.cp(path.join(rootDir, 'node_modules_build/kuzu'), path.join(nodeModulesDir, 'kuzu'), {
      recursive: true
    })

    // Create the ASAR package
    console.log(`Creating ASAR from ${tempDir} to ${asarPath}`)
    const options = {
      // Unpack native modules that need direct filesystem access
      unpack: '**/*.{node,dll,exe,so,dylib}',
      // Preserve package.json files
      transformPackageJson: false
    }

    await createPackageWithOptions(tempDir, asarPath, options)

    // Verify ASAR was created
    const asarExists = await fs
      .access(asarPath)
      .then(() => true)
      .catch(() => false)
    if (!asarExists) {
      throw new Error('ASAR package was not created')
    }

    // Get size of ASAR file
    const stats = await fs.stat(asarPath)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`ASAR package size: ${sizeInMB} MB`)

    // Verify the contents of the ASAR package
    console.log('\nVerifying ASAR package contents...')
    const asarContents = await listPackage(asarPath)

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

    // Clean up the temp directory
    await fs.rm(tempDir, { recursive: true, force: true })

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
