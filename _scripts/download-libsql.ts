#!/usr/bin/env node

/**
 * This script downloads libsql binaries for each platform and extracts them to the bundled_modules directory.
 *
 * Usage:
 *   node download-libsql.js <version>
 *
 * Example:
 *   node download-libsql.js 0.5.0-pre.7
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { execSync } from 'child_process'

// Define platform interface
interface Platform {
  name: string
  dir: string
}

// Get version from command line or use default
const version = process.argv[2] || '0.5.17'

// Define the platforms we need
const platforms: Platform[] = [
  { name: 'darwin-arm64', dir: 'darwin-arm64' },
  { name: 'darwin-x64', dir: 'darwin-x64' },
  { name: 'win32-x64-msvc', dir: 'win32-x64' }
]

// Base URL for GitHub releases
const baseUrl = `https://github.com/tursodatabase/libsql-js/releases/download/v${version}`

// Create the bundled_modules directory structure
const bundledModulesDir = path.join(process.cwd(), 'bundled_modules', 'libsql')
if (!fs.existsSync(bundledModulesDir)) {
  fs.mkdirSync(bundledModulesDir, { recursive: true })
}

// Download and extract binaries for each platform
async function downloadAndExtract(platform: Platform): Promise<void> {
  const platformDir = path.join(bundledModulesDir, platform.dir)
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true })
  }

  const fileName = `libsql-${platform.name}-${version}.tgz`
  const fileUrl = `${baseUrl}/${fileName}`
  const outputPath = path.join(process.cwd(), fileName)

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
                console.log(`Downloaded ${fileName}`)

                try {
                  // Extract using tar
                  console.log(`Extracting ${fileName}...`)
                  const tempDir = path.join(process.cwd(), 'temp-extract')
                  if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true })
                  }

                  // Extract the .tgz file
                  execSync(`tar -xzf ${outputPath} -C ${tempDir}`)

                  // Copy the index.node file to the appropriate platform directory
                  const indexNodePath = path.join(tempDir, 'package', 'index.node')
                  if (fs.existsSync(indexNodePath)) {
                    fs.copyFileSync(indexNodePath, path.join(platformDir, 'index.node'))
                    console.log(`Copied index.node to ${platformDir}`)
                  } else {
                    console.error(
                      `Could not find index.node in extracted files for ${platform.name}`
                    )
                  }

                  // Clean up
                  fs.rmSync(tempDir, { recursive: true, force: true })
                  fs.unlinkSync(outputPath)

                  resolve()
                } catch (error) {
                  reject(error)
                }
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
            console.log(`Downloaded ${fileName}`)

            try {
              // Extract using tar
              console.log(`Extracting ${fileName}...`)
              const tempDir = path.join(process.cwd(), 'temp-extract')
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
              }

              // Extract the .tgz file
              execSync(`tar -xzf ${outputPath} -C ${tempDir}`)

              // Copy the index.node file to the appropriate platform directory
              const indexNodePath = path.join(tempDir, 'package', 'index.node')
              if (fs.existsSync(indexNodePath)) {
                fs.copyFileSync(indexNodePath, path.join(platformDir, 'index.node'))
                console.log(`Copied index.node to ${platformDir}`)
              } else {
                console.error(`Could not find index.node in extracted files for ${platform.name}`)
              }

              // Clean up
              fs.rmSync(tempDir, { recursive: true, force: true })
              fs.unlinkSync(outputPath)

              resolve()
            } catch (error) {
              reject(error)
            }
          })
        } else {
          fs.unlinkSync(outputPath)
          reject(new Error(`Failed to download ${fileName}: HTTP status ${response.statusCode}`))
        }
      })
      .on('error', (err) => {
        fs.unlinkSync(outputPath)
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
      await downloadAndExtract(platform)
    }

    console.log('All libsql binaries downloaded and extracted successfully.')
    console.log(`Binaries are located in: ${bundledModulesDir}`)
  } catch (error) {
    console.error('Error downloading or extracting libsql binaries:', error)
    process.exit(1)
  }
}

main()
