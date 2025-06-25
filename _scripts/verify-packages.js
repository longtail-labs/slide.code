#!/usr/bin/env node

/**
 * Package Verification Tool
 *
 * This script verifies that all compiled files in your packages/ and widgets/
 * directories are also available in node_modules/@polka, to ensure your
 * optimization strategy will work correctly.
 *
 * Usage: node scripts/verify-packages.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Directories to check
const packagesDir = path.join(rootDir, 'packages')
const widgetsDir = path.join(rootDir, 'widgets')
const nodeModulesDir = path.join(rootDir, 'node_modules', '@polka')

// Output colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Track stats
const stats = {
  packagesChecked: 0,
  widgetsChecked: 0,
  missingInNodeModules: [],
  missingDistDirectories: [],
  htmlFiles: []
}

// Function to find all dist files in a directory
function findDistFiles(dir, baseDir = '') {
  const results = []

  try {
    if (!fs.existsSync(dir)) {
      return results
    }

    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const relativePath = path.join(baseDir, item)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        // If this is a dist directory, collect all files
        if (item === 'dist') {
          collectAllFiles(fullPath, relativePath, results)
        } else {
          // Otherwise keep searching for dist directories
          results.push(...findDistFiles(fullPath, relativePath))
        }
      } else if (item === 'index.html') {
        // Track HTML files specifically
        results.push({
          path: relativePath,
          type: 'html',
          size: stats.size
        })
      }
    }
  } catch (err) {
    console.error(`${colors.red}Error reading ${dir}: ${err.message}${colors.reset}`)
  }

  return results
}

// Collect all files in a directory (recursively)
function collectAllFiles(dir, baseDir, results) {
  try {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const relativePath = path.join(baseDir, item)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        collectAllFiles(fullPath, relativePath, results)
      } else {
        results.push({
          path: relativePath,
          type: getFileType(item),
          size: stats.size
        })
      }
    }
  } catch (err) {
    console.error(`${colors.red}Error reading ${dir}: ${err.message}${colors.reset}`)
  }
}

// Get file type based on extension
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.js') return 'js'
  if (ext === '.jsx') return 'jsx'
  if (ext === '.css') return 'css'
  if (ext === '.html') return 'html'
  if (ext === '.json') return 'json'
  if (ext === '.map') return 'map'
  return 'other'
}

// Check if a file exists in node_modules
function checkFileInNodeModules(file, packageName) {
  // Convert package path to node_modules path
  // e.g., ui/dist/index.js -> @polka/ui/dist/index.js
  const nodeModulesPath = path.join(
    nodeModulesDir,
    packageName,
    file.path.split('/').slice(1).join('/')
  )

  return fs.existsSync(nodeModulesPath)
}

// Format bytes to human-readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Process a directory of packages
async function processPackagesDirectory(dir, isWidgets = false) {
  try {
    if (!fs.existsSync(dir)) {
      console.warn(`${colors.yellow}Directory not found: ${dir}${colors.reset}`)
      return
    }

    const packages = fs.readdirSync(dir)

    for (const packageName of packages) {
      // Skip hidden directories and files
      if (packageName.startsWith('.')) continue

      const packagePath = path.join(dir, packageName)
      const packageStats = fs.statSync(packagePath)

      if (!packageStats.isDirectory()) continue

      // Find all dist files and HTML files
      const distFiles = findDistFiles(packagePath, packageName)

      if (distFiles.length === 0) {
        stats.missingDistDirectories.push(packageName)
        continue
      }

      // Track HTML files
      const htmlFiles = distFiles.filter((file) => file.type === 'html')
      stats.htmlFiles.push(...htmlFiles)

      // Check each dist file to see if it exists in node_modules
      const missingFiles = []
      let totalSize = 0

      for (const file of distFiles) {
        totalSize += file.size

        if (!checkFileInNodeModules(file, packageName)) {
          missingFiles.push(file)
        }
      }

      // Update stats
      if (isWidgets) {
        stats.widgetsChecked++
      } else {
        stats.packagesChecked++
      }

      if (missingFiles.length > 0) {
        stats.missingInNodeModules.push({
          packageName,
          missingFiles,
          totalSize
        })
      }

      console.log(
        `${colors.cyan}${isWidgets ? 'Widget' : 'Package'}: ${packageName}${colors.reset}`
      )
      console.log(`  Total files: ${distFiles.length}`)
      console.log(`  Size: ${formatBytes(totalSize)}`)
      console.log(
        `  Missing in node_modules: ${missingFiles.length > 0 ? colors.red + missingFiles.length + colors.reset : colors.green + '0' + colors.reset}`
      )
      if (missingFiles.length > 0) {
        console.log(`  ${colors.yellow}First few missing files:${colors.reset}`)
        missingFiles.slice(0, 3).forEach((file) => {
          console.log(`    - ${file.path}`)
        })
        if (missingFiles.length > 3) {
          console.log(`    - ... and ${missingFiles.length - 3} more`)
        }
      }
      console.log()
    }
  } catch (err) {
    console.error(`${colors.red}Error processing directory ${dir}: ${err.message}${colors.reset}`)
  }
}

// Main execution
async function main() {
  console.log(`${colors.magenta}=== Package Verification Tool ===${colors.reset}`)
  console.log(
    `Checking if compiled files in packages/ and widgets/ are available in node_modules/@polka\n`
  )

  // Process packages and widgets
  await processPackagesDirectory(packagesDir)
  await processPackagesDirectory(widgetsDir, true)

  // Summary
  console.log(`${colors.magenta}=== Summary ===${colors.reset}`)
  console.log(`Packages checked: ${stats.packagesChecked}`)
  console.log(`Widgets checked: ${stats.widgetsChecked}`)
  console.log(
    `Packages/widgets missing dist directory: ${stats.missingDistDirectories.length > 0 ? colors.yellow + stats.missingDistDirectories.length + colors.reset : colors.green + '0' + colors.reset}`
  )
  console.log(
    `Packages/widgets with files missing in node_modules: ${stats.missingInNodeModules.length > 0 ? colors.red + stats.missingInNodeModules.length + colors.reset : colors.green + '0' + colors.reset}`
  )
  console.log(`HTML files found (important for widgets): ${stats.htmlFiles.length}`)

  // Display recommendations
  console.log(`\n${colors.magenta}=== Recommendations ===${colors.reset}`)

  if (stats.missingInNodeModules.length > 0) {
    console.log(
      `${colors.red}Some compiled files exist in packages/ or widgets/ but not in node_modules/@polka${colors.reset}`
    )
    console.log(`Options to fix this:`)
    console.log(
      `1. Run a full build to ensure all files are compiled and linked correctly: npm run build`
    )
    console.log(
      `2. Modify your conveyor.conf to include these specific files from packages/ or widgets/`
    )
    console.log(
      `3. Check your package.json files to ensure they include the right "files" entries\n`
    )
  } else if (stats.htmlFiles.length > 0) {
    console.log(
      `${colors.yellow}HTML files were found - make sure these are correctly included in your conveyor.conf${colors.reset}`
    )
    console.log(
      `The current configuration includes widget HTML files directly from the widgets/ directory.\n`
    )
  } else {
    console.log(
      `${colors.green}All looks good! Your optimization strategy should work well.${colors.reset}`
    )
    console.log(
      `You can safely use node_modules/@polka for the compiled files and remove the packages/ inputs.\n`
    )
  }

  // Final advice
  if (stats.missingDistDirectories.length > 0) {
    console.log(
      `${colors.yellow}Note: These packages/widgets have no dist directory:${colors.reset}`
    )
    stats.missingDistDirectories.slice(0, 5).forEach((dir) => {
      console.log(`  - ${dir}`)
    })
    if (stats.missingDistDirectories.length > 5) {
      console.log(`  - ... and ${stats.missingDistDirectories.length - 5} more`)
    }
    console.log(`Make sure to build these packages if they should have compiled outputs.\n`)
  }
}

main().catch((err) => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`)
  process.exit(1)
})
