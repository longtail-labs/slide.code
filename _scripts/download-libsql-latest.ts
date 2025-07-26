#!/usr/bin/env node

/**
 * This script downloads libsql binaries for each platform and copies them to the bundled_modules directory.
 *
 * Usage:
 *   node download-libsql-latest.js <version>
 *
 * Example:
 *   node download-libsql-latest.js 0.6.0-pre.8
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

// Define platform interface
interface Platform {
  name: string
  dir: string
  filename: string
}

// Get version from command line or use default
const version = process.argv[2] || '0.6.0-pre.8'

// Define the platforms we need (using the new naming convention)
const platforms: Platform[] = [
  { name: 'darwin-arm64', dir: 'darwin-arm64', filename: 'libsql.darwin-arm64.node' },
  { name: 'darwin-x64', dir: 'darwin-x64', filename: 'libsql.darwin-x64.node' },
  { name: 'win32-x64-msvc', dir: 'win32-x64', filename: 'libsql.win32-x64-msvc.node' },
  { name: 'linux-x64-gnu', dir: 'linux-x64-gnu', filename: 'libsql.linux-x64-gnu.node' },
  { name: 'linux-arm64-gnu', dir: 'linux-arm64-gnu', filename: 'libsql.linux-arm64-gnu.node' }
]

// Base URL for GitHub releases
const baseUrl = `https://github.com/tursodatabase/libsql-js/releases/download/v${version}`

// Create the bundled_modules directory structure
const bundledModulesDir = path.join(process.cwd(), 'bundled_modules', 'libsql')
if (!fs.existsSync(bundledModulesDir)) {
  fs.mkdirSync(bundledModulesDir, { recursive: true })
}

// Download binary for each platform
async function downloadBinary(platform: Platform): Promise<void> {
  const platformDir = path.join(bundledModulesDir, platform.dir)
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true })
  }

  const fileUrl = `${baseUrl}/${platform.filename}`
  const outputPath = path.join(platformDir, 'index.node')

  console.log(`Downloading ${fileUrl}...`)

  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(outputPath)
    https
      .get(fileUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          https
            .get(response.headers.location as string, (redirectedResponse) => {
              redirectedResponse.pipe(file)
              file.on('finish', () => {
                file.close()
                console.log(`Downloaded ${platform.filename} to ${platformDir}/index.node`)
                resolve()
              })
            })
            .on('error', (err) => {
              fs.unlinkSync(outputPath)
              reject(err)
            })
        } else if (response.statusCode === 200) {
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            console.log(`Downloaded ${platform.filename} to ${platformDir}/index.node`)
            resolve()
          })
        } else {
          fs.unlinkSync(outputPath)
          reject(
            new Error(`Failed to download ${platform.filename}: HTTP status ${response.statusCode}`)
          )
        }
      })
      .on('error', (err) => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath)
        }
        reject(err)
      })
  })
}

// Main function to run the script
async function main(): Promise<void> {
  console.log(`Downloading libsql binaries for version ${version}...`)

  try {
    // Process each platform in sequence to avoid overwhelming the network
    for (const platform of platforms) {
      await downloadBinary(platform)
    }

    console.log('All libsql binaries downloaded successfully.')
    console.log(`Binaries are located in: ${bundledModulesDir}`)
  } catch (error) {
    console.error('Error downloading libsql binaries:', error)
    process.exit(1)
  }
}

main()
