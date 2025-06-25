#!/usr/bin/env node

/**
 * Built App Checker
 *
 * This script inspects your built Electron app to look for files that
 * shouldn't be included, like TypeScript source files, config files, etc.
 *
 * Usage:
 *   node scripts/check-built-app.js [path-to-app]
 *   Example: node scripts/check-built-app.js output/Slide.app/Contents/Resources/app
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Default path or use provided argument
const defaultPath = process.argv[2] || 'output/Slide.app/Contents/Resources/app'
const appPath = path.resolve(rootDir, defaultPath)

// File patterns that shouldn't be in the built app
const unwantedPatterns = [
  /\.ts$/, // TypeScript source files
  /\.tsx$/, // TypeScript React files
  /tsconfig\.json$/, // TypeScript config
  /\.map$/, // Source maps
  /vite\.config\.js$/, // Vite config
  /tailwind\.config\.js$/, // Tailwind config
  /postcss\.config\.js$/, // PostCSS config
  /eslint\.config\.js$/, // ESLint config
  /\.scss$/, // SCSS files
  /\.tsbuildinfo$/, // TS build info
  /\/src\//, // Source directories
  /\/test\//, // Test directories
  /\/__tests__\//, // Jest test directories
  /\.spec\./, // Test specs
  /\.test\./ // Test files
]

// Specific paths to check more carefully
const criticalPaths = [
  'node_modules/@polka' // Your workspace packages
]

// Track stats
const stats = {
  totalFiles: 0,
  unwantedFiles: [],
  largeFiles: [],
  polkaPackageStats: {}
}

const MAX_LARGE_FILES = 20
const LARGE_FILE_THRESHOLD = 1 * 1024 * 1024 // 1MB

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Walk the directory and check files
function walkAndCheck(dir, relativePath = '') {
  try {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const relPath = path.join(relativePath, item)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        // Check subdirectories
        walkAndCheck(fullPath, relPath)
      } else {
        // It's a file
        stats.totalFiles++

        // Check for unwanted file types
        const isUnwanted = unwantedPatterns.some((pattern) => pattern.test(relPath))
        if (isUnwanted) {
          stats.unwantedFiles.push(relPath)
        }

        // Track large files
        if (stats.size > LARGE_FILE_THRESHOLD) {
          stats.largeFiles.push({
            path: relPath,
            size: stats.size
          })

          // Keep only the largest files
          if (stats.largeFiles.length > MAX_LARGE_FILES) {
            stats.largeFiles.sort((a, b) => b.size - a.size)
            stats.largeFiles.pop()
          }
        }

        // Special tracking for @polka packages
        if (relPath.includes('node_modules/@polka/')) {
          const pkgName = relPath.split('node_modules/@polka/')[1].split('/')[0]

          if (!stats.polkaPackageStats[pkgName]) {
            stats.polkaPackageStats[pkgName] = {
              totalFiles: 0,
              unwantedFiles: [],
              totalSize: 0
            }
          }

          stats.polkaPackageStats[pkgName].totalFiles++
          stats.polkaPackageStats[pkgName].totalSize += stats.size

          if (isUnwanted) {
            stats.polkaPackageStats[pkgName].unwantedFiles.push(relPath)
          }
        }
      }
    }
  } catch (err) {
    console.error(`${colors.red}Error reading ${dir}: ${err.message}${colors.reset}`)
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
;(async function () {
  console.log(`${colors.magenta}=== Built App Checker ===${colors.reset}`)
  console.log(`Inspecting: ${appPath}\n`)

  // Check if path exists
  if (!fs.existsSync(appPath)) {
    console.error(`${colors.red}Error: Path does not exist: ${appPath}${colors.reset}`)
    console.log(`Build your app first or provide the correct path.`)
    process.exit(1)
  }

  // Start the check
  walkAndCheck(appPath)

  // Display results
  console.log(`${colors.magenta}=== Results ===${colors.reset}`)
  console.log(`Total files analyzed: ${stats.totalFiles}`)

  if (stats.unwantedFiles.length === 0) {
    console.log(`${colors.green}No unwanted files found! Your app is clean.${colors.reset}`)
  } else {
    console.log(
      `${colors.red}Found ${stats.unwantedFiles.length} files that shouldn't be in the build:${colors.reset}`
    )

    const groupedByExt = {}
    stats.unwantedFiles.forEach((file) => {
      const ext = path.extname(file) || 'unknown'
      if (!groupedByExt[ext]) {
        groupedByExt[ext] = []
      }
      groupedByExt[ext].push(file)
    })

    Object.keys(groupedByExt).forEach((ext) => {
      console.log(`  ${colors.yellow}${ext}:${colors.reset} ${groupedByExt[ext].length} files`)
      // Show a few examples
      groupedByExt[ext].slice(0, 3).forEach((file) => {
        console.log(`    - ${file}`)
      })
      if (groupedByExt[ext].length > 3) {
        console.log(`    - ... and ${groupedByExt[ext].length - 3} more`)
      }
    })
  }

  // Check @polka packages
  console.log(`\n${colors.magenta}=== @polka Package Analysis ===${colors.reset}`)

  const pkgNames = Object.keys(stats.polkaPackageStats)
  if (pkgNames.length === 0) {
    console.log(`${colors.yellow}No @polka packages found in the build.${colors.reset}`)
  } else {
    pkgNames.forEach((pkg) => {
      const pkgStats = stats.polkaPackageStats[pkg]
      console.log(`${colors.cyan}@polka/${pkg}:${colors.reset}`)
      console.log(`  Files: ${pkgStats.totalFiles}`)
      console.log(`  Size: ${formatBytes(pkgStats.totalSize)}`)

      if (pkgStats.unwantedFiles.length > 0) {
        console.log(
          `  ${colors.red}Unwanted files: ${pkgStats.unwantedFiles.length}${colors.reset}`
        )
        pkgStats.unwantedFiles.slice(0, 3).forEach((file) => {
          console.log(`    - ${file}`)
        })
        if (pkgStats.unwantedFiles.length > 3) {
          console.log(`    - ... and ${pkgStats.unwantedFiles.length - 3} more`)
        }
      } else {
        console.log(`  ${colors.green}No unwanted files${colors.reset}`)
      }
    })
  }

  // Large files
  console.log(`\n${colors.magenta}=== Largest Files ===${colors.reset}`)
  if (stats.largeFiles.length === 0) {
    console.log(`${colors.green}No unusually large files found.${colors.reset}`)
  } else {
    stats.largeFiles.sort((a, b) => b.size - a.size)
    stats.largeFiles.forEach((file, i) => {
      console.log(`${i + 1}. ${file.path}: ${formatBytes(file.size)}`)
    })
  }

  // Recommendations
  console.log(`\n${colors.magenta}=== Recommendations ===${colors.reset}`)

  if (stats.unwantedFiles.length > 0) {
    console.log(`${colors.yellow}1. Adjust your conveyor.conf remap rules:${colors.reset}`)
    console.log(`   - Make sure to exclude TypeScript files and configs`)
    console.log(`   - Be more specific with include patterns for @polka packages`)
    console.log(`   - Add exclusion patterns for specific file types found`)

    console.log(`\n${colors.yellow}2. Modify your package.json "files" field:${colors.reset}`)
    console.log(`   - Ensure each workspace package only includes dist files`)
    console.log(`   - Example: "files": ["dist", "package.json"]`)
  } else {
    console.log(
      `${colors.green}Your build looks clean! No source files or configs were found.${colors.reset}`
    )
  }
})().catch((err) => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`)
  process.exit(1)
})
