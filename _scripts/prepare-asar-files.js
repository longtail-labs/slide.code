#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { execSync } from 'child_process'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const buildDir = path.join(rootDir, 'build-app')

// Files and directories to include in the ASAR
const includes = [
  // Root files
  { src: 'package.json', dest: 'package.json' },
  { src: 'packages/entry-point.js', dest: 'packages/entry-point.js', customProcess: true },

  // Include only necessary files from node_modules
  {
    src: 'node_modules_build',
    dest: 'node_modules',
    exclude: [
      // Only exclude clearly non-essential files
      '**/.*',
      '**/*.md',
      '**/*.markdown',
      '**/*.txt',
      '**/*.log',
      '**/test/**',
      '**/tests/**',
      '**/docs/**',
      '**/doc/**',
      '**/example/**',
      '**/examples/**',
      '**/fixtures/**',
      '**/benchmark/**',
      '**/changelog/**'
      // Do not exclude anything that might be a code file or required dependency
    ]
  }
]

// Native modules that need to be unpacked (don't include in ASAR)
const nativeModules = [
  // '@libsql/client',
  // 'libsql',
  // 'koffi'
  // Add other native modules here
]

// Workspace packages to include in node_modules/@polka
const workspacePackages = [
  'main',
  'preload',
  'ui',
  'clients',
  'hooks',
  'db',
  'shared',
  'api',
  'schema',
  'types',
  'zutron',
  'trpc-electron'
]

// Widgets to include in node_modules/@polka
const widgets = ['action-bar', 'context-menu', 'header', 'planning', 'task-sidebar', 'toast']

async function copyDir(src, dest, exclude = [], preserveStructure = true) {
  console.log(`Copying directory: ${src} to ${dest}`)

  try {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      // Check if path should be excluded
      const relativePath = path.relative(rootDir, srcPath)
      if (
        exclude.some((pattern) => {
          if (pattern.startsWith('-')) {
            pattern = pattern.substring(1)
            return minimatch(relativePath, pattern)
          }
          return false
        })
      ) {
        console.log(`Skipping excluded path: ${relativePath}`)
        continue
      }

      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath, exclude, preserveStructure)
      } else if (entry.isSymbolicLink()) {
        try {
          // For symlinks, try to use cp -R command which handles symlinks properly
          execSync(`cp -R "${srcPath}" "${destPath}"`, { stdio: 'ignore' })
        } catch (err) {
          console.error(`Error copying symlink ${srcPath} to ${destPath}:`, err)
        }
      } else {
        try {
          // Create the destination directory if it doesn't exist
          await fs.mkdir(path.dirname(destPath), { recursive: true })
          await fs.copyFile(srcPath, destPath)
        } catch (err) {
          console.error(`Error copying file ${srcPath} to ${destPath}:`, err)
        }
      }
    }
  } catch (err) {
    console.error(`Error copying directory ${src}:`, err)
  }
}

// Simple implementation of minimatch-like globbing
function minimatch(input, pattern) {
  // This is a simplified version - in a real implementation, you'd use the actual minimatch package
  const regex = new RegExp(
    '^' + pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
  )
  return regex.test(input)
}

// Helper function to ensure directory exists
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

// Copy workspace package to node_modules/@polka
async function copyWorkspacePackage(packageName, isWidget = false) {
  const srcBasePath = isWidget ? 'widgets' : 'packages'
  const packageDir = path.join(rootDir, srcBasePath, packageName)
  const srcDistPath = path.join(packageDir, 'dist')
  const destPath = path.join(buildDir, 'node_modules', '@polka', packageName)

  // Check if the source dist directory exists
  try {
    await fs.access(srcDistPath)
  } catch (err) {
    console.warn(
      `Warning: Could not find dist directory for ${isWidget ? 'widget' : 'package'} ${packageName}: ${err.message}`
    )
    return false
  }

  // Read the original package.json to preserve exports structure
  let packageJson = {
    name: `@polka/${packageName}`,
    version: '0.0.1',
    type: 'module',
    main: './dist/index.js',
    exports: {
      '.': './dist/index.js',
      './package.json': './package.json'
    }
  }

  try {
    const originalPackageJsonPath = path.join(packageDir, 'package.json')
    const originalPackageJsonContent = await fs.readFile(originalPackageJsonPath, 'utf8')
    const originalPackageJson = JSON.parse(originalPackageJsonContent)

    // Preserve the original exports if they exist
    if (originalPackageJson.exports) {
      console.log(
        `Preserving exports for @polka/${packageName}:`,
        JSON.stringify(originalPackageJson.exports)
      )
      packageJson.exports = originalPackageJson.exports

      // Check if main is specified and preserve it
      if (originalPackageJson.main) {
        packageJson.main = originalPackageJson.main
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read original package.json for ${packageName}: ${err.message}`)
  }

  // Create the destination directory
  await ensureDir(destPath)

  // For trpc-electron and other packages that use subpaths,
  // we need to preserve the structure of the dist directory
  const distDirs = []
  try {
    const distEntries = await fs.readdir(srcDistPath, { withFileTypes: true })
    for (const entry of distEntries) {
      if (entry.isDirectory()) {
        distDirs.push(entry.name)
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read dist directory for ${packageName}: ${err.message}`)
  }

  // If we have subdirectories in dist, this might indicate subpath exports
  if (distDirs.length > 0) {
    console.log(`Found subdirectories in dist for ${packageName}: ${distDirs.join(', ')}`)

    // Copy the entire dist directory structure
    await copyDir(srcDistPath, path.join(destPath, 'dist'))
  } else {
    // For regular packages, just copy dist to dist
    await ensureDir(path.join(destPath, 'dist'))
    await copyDir(srcDistPath, path.join(destPath, 'dist'))
  }

  // Write the package.json
  await fs.writeFile(path.join(destPath, 'package.json'), JSON.stringify(packageJson, null, 2))

  return true
}

// Main function to prepare files for ASAR packaging
async function prepareFiles() {
  console.log('Preparing files for ASAR packaging...')

  // Clean build directory
  try {
    await fs.rm(buildDir, { recursive: true, force: true })
  } catch (err) {
    // Ignore if directory doesn't exist
  }

  // Create build directory
  await fs.mkdir(buildDir, { recursive: true })

  // Install @electron/asar if not already installed
  try {
    require('@electron/asar')
  } catch (err) {
    console.log('Installing @electron/asar...')
    execSync('npm install --no-save @electron/asar', { cwd: rootDir, stdio: 'inherit' })
  }

  // Process includes
  for (const item of includes) {
    const srcGlob = path.join(rootDir, item.src)
    const destBase = path.join(buildDir, item.dest)

    // Special handling for entry-point.js
    if (item.customProcess && item.src === 'packages/entry-point.js') {
      try {
        // Create the entry point content with proper ESM imports
        const entryPointContent = `// Entry point for the application
// This file uses ESM imports
import { initApp } from '@polka/main';

// Now initialize the app
initApp();
`

        // Write the entry point file
        await ensureDir(path.dirname(destBase))
        await fs.writeFile(destBase, entryPointContent)
        console.log('Custom entry-point.js created in build directory')
        continue
      } catch (err) {
        console.error('Error creating entry-point.js:', err)
      }
    }

    // Special handling for package.json
    if (item.src === 'package.json') {
      try {
        // Read the original package.json
        const packageJsonContent = await fs.readFile(srcGlob, 'utf8')
        const packageJson = JSON.parse(packageJsonContent)

        // Ensure type: module is included and entry point is correct
        const modifiedPackageJson = {
          ...packageJson,
          type: 'module',
          main: 'packages/entry-point.js',
          browser: 'packages/entry-point.js',
          // Do not include workspaces in the final package
          workspaces: undefined,
          // Only include production dependencies
          dependencies: packageJson.dependencies || {},
          devDependencies: undefined,
          scripts: {
            start: 'electron .'
          }
        }

        // Write modified package.json to build directory
        await ensureDir(path.dirname(destBase))
        await fs.writeFile(destBase, JSON.stringify(modifiedPackageJson, null, 2))
        console.log('Modified package.json written to build directory')
        continue
      } catch (err) {
        console.error('Error processing package.json:', err)
      }
    }

    // Handle glob patterns with simple matching
    if (srcGlob.includes('*')) {
      const srcDir = path.dirname(srcGlob)
      const pattern = path.basename(srcGlob)

      try {
        const entries = await fs.readdir(srcDir, { withFileTypes: true })
        for (const entry of entries) {
          if (minimatch(entry.name, pattern)) {
            const srcPath = path.join(srcDir, entry.name)
            const destPath = path.join(destBase, entry.name)

            try {
              const stats = await fs.stat(srcPath)

              if (stats.isDirectory()) {
                await copyDir(srcPath, destPath, item.exclude || [])
              } else {
                await ensureDir(path.dirname(destPath))
                await fs.copyFile(srcPath, destPath)
              }
            } catch (err) {
              console.warn(`Warning: Could not process ${srcPath}: ${err.message}`)
            }
          }
        }
      } catch (err) {
        console.warn(`Warning: Could not read directory ${srcDir}: ${err.message}`)
      }
    } else {
      // Handle direct file/directory copies
      const srcPath = path.join(rootDir, item.src)
      const destPath = path.join(buildDir, item.dest)

      try {
        const stat = await fs.stat(srcPath)

        if (stat.isDirectory()) {
          await copyDir(srcPath, destPath, item.exclude || [])
        } else {
          await ensureDir(path.dirname(destPath))
          await fs.copyFile(srcPath, destPath)
        }
      } catch (err) {
        console.warn(`Warning: Could not copy ${srcPath}: ${err.message}`)
      }
    }
  }

  // Create @polka directory in node_modules
  console.log('Setting up workspace packages in node_modules/@polka...')
  await ensureDir(path.join(buildDir, 'node_modules', '@polka'))

  // Copy each workspace package to node_modules/@polka
  for (const pkgName of workspacePackages) {
    console.log(`Setting up workspace package: @polka/${pkgName}`)
    await copyWorkspacePackage(pkgName)
  }

  // Copy each widget to node_modules/@polka
  for (const widgetName of widgets) {
    console.log(`Setting up widget: @polka/${widgetName}`)
    await copyWorkspacePackage(widgetName, true)
  }

  // Handle native modules - move them to unpacked directory
  for (const module of nativeModules) {
    const srcPath = path.join(buildDir, 'node_modules', module)
    const unpackedPath = path.join(
      buildDir,
      '..',
      'dist',
      'app.asar.unpacked',
      'node_modules',
      module
    )

    try {
      const exists = await fs
        .access(srcPath)
        .then(() => true)
        .catch(() => false)
      if (exists) {
        console.log(`Moving native module to unpacked: ${module}`)
        await ensureDir(path.dirname(unpackedPath))
        await copyDir(srcPath, unpackedPath)

        // Remove from build directory since it will be in unpacked
        await fs.rm(srcPath, { recursive: true, force: true })
      }
    } catch (err) {
      console.warn(`Warning: Could not process native module ${module}: ${err.message}`)
    }
  }

  console.log('Files prepared successfully for ASAR packaging')
}

// Run the preparation
prepareFiles().catch((err) => {
  console.error('Error preparing files:', err)
  process.exit(1)
})
