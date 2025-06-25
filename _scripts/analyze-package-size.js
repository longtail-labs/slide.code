#!/usr/bin/env node

/**
 * Package Size Analyzer for Electron Apps
 *
 * This script analyzes the size distribution of your packaged Electron app
 * to help identify opportunities for further optimization.
 *
 * Usage:
 *   1. Build your app with Conveyor
 *   2. Run: node scripts/analyze-package-size.js <path-to-app-resources>
 *     Example: node scripts/analyze-package-size.js dist/mac/Slide.app/Contents/Resources
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Default path if none provided
const defaultPath = '../dist/mac/Slide.app/Contents/Resources'
const appPath = process.argv[2] || path.resolve(__dirname, defaultPath)

console.log(`Analyzing package sizes in: ${appPath}`)

// Track sizes
const sizes = {
  totalSize: 0,
  byDirectory: {},
  largestFiles: [],
  nodeModulesBySize: {}
}

// Maximum number of largest files to track
const MAX_LARGEST_FILES = 20

// Walk the directory and collect sizes
function walkDir(dir, basePath = '') {
  try {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const relativePath = path.join(basePath, item)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        // Track directory size
        const dirKey = relativePath || 'root'
        if (!sizes.byDirectory[dirKey]) {
          sizes.byDirectory[dirKey] = 0
        }

        // If this is a node_module, track it separately
        if (relativePath.includes('node_modules/') && relativePath.split('/').length === 3) {
          const moduleName = relativePath.split('/')[1]
          if (!sizes.nodeModulesBySize[moduleName]) {
            sizes.nodeModulesBySize[moduleName] = 0
          }
        }

        walkDir(fullPath, relativePath)
      } else {
        // Track file size
        const fileSize = stats.size
        sizes.totalSize += fileSize

        // Add to largest files if it qualifies
        sizes.largestFiles.push({ path: relativePath, size: fileSize })
        sizes.largestFiles.sort((a, b) => b.size - a.size)
        if (sizes.largestFiles.length > MAX_LARGEST_FILES) {
          sizes.largestFiles.pop()
        }

        // Add to directory size
        const dirKey = basePath || 'root'
        sizes.byDirectory[dirKey] = (sizes.byDirectory[dirKey] || 0) + fileSize

        // If this is inside a node_module, add to its size
        if (basePath.includes('node_modules/')) {
          const parts = basePath.split('/')
          let moduleIdx = parts.indexOf('node_modules')
          if (moduleIdx >= 0 && moduleIdx + 1 < parts.length) {
            const moduleName = parts[moduleIdx + 1]
            sizes.nodeModulesBySize[moduleName] =
              (sizes.nodeModulesBySize[moduleName] || 0) + fileSize
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error accessing ${dir}: ${err.message}`)
  }
}

// Format bytes to human-readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Main execution
try {
  // Check if path exists
  if (!fs.existsSync(appPath)) {
    console.error(`Error: Path does not exist: ${appPath}`)
    console.log('Build your app first or provide the correct path to the app resources.')
    process.exit(1)
  }

  // Analyze
  walkDir(appPath)

  // Sort results
  const sortedDirs = Object.entries(sizes.byDirectory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)

  const sortedModules = Object.entries(sizes.nodeModulesBySize)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  // Display results
  console.log('\n===== PACKAGE SIZE ANALYSIS =====')
  console.log(`\nTotal Size: ${formatBytes(sizes.totalSize)}`)

  console.log('\n--- Largest Directories ---')
  sortedDirs.forEach(([dir, size], i) => {
    console.log(
      `${i + 1}. ${dir}: ${formatBytes(size)} (${((size / sizes.totalSize) * 100).toFixed(1)}%)`
    )
  })

  console.log('\n--- Largest Node Modules ---')
  sortedModules.forEach(([mod, size], i) => {
    console.log(
      `${i + 1}. ${mod}: ${formatBytes(size)} (${((size / sizes.totalSize) * 100).toFixed(1)}%)`
    )
  })

  console.log('\n--- Largest Individual Files ---')
  sizes.largestFiles.forEach(({ path: filePath, size }, i) => {
    console.log(`${i + 1}. ${filePath}: ${formatBytes(size)}`)
  })

  console.log('\n=== OPTIMIZATION SUGGESTIONS ===')
  console.log('1. Review large node modules and consider:')
  console.log('   - Moving them to devDependencies if not needed at runtime')
  console.log('   - Using lighter alternatives')
  console.log('   - Tree-shaking to include only used parts')
  console.log('2. Examine large individual files - can they be compressed or split?')
  console.log('3. Look for duplicate files or resources that might be in multiple packages')
} catch (err) {
  console.error(`Error analyzing package: ${err.message}`)
}
