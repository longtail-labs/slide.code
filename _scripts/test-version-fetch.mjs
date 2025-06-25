// ES module imports
import http from 'http'
import https from 'https'
import path from 'path'
import { URL } from 'url'

// ===============================================
// Implementations from our utils/version.js
// ===============================================
class Version {
  constructor(version, revision = 0) {
    this.version = version
    this.revision = revision
  }

  compareTo(other) {
    const v1 = new ComparableVersion(this.version)
    const v2 = new ComparableVersion(other.version)
    const comparison = v1.compareTo(v2)

    if (comparison === 0) {
      return Math.sign(this.revision - other.revision)
    }

    return comparison
  }

  toString() {
    return `${this.version}${this.revision > 0 ? '.' + this.revision : ''}`
  }
}

class ComparableVersion {
  constructor(value) {
    this.value = value
    this.items = this.parseVersion(value)
  }

  parseVersion(version) {
    return version.split('.').map((item) => parseInt(item, 10) || 0)
  }

  compareTo(other) {
    const len = Math.max(this.items.length, other.items.length)

    for (let i = 0; i < len; i++) {
      const a = this.items[i] || 0
      const b = other.items[i] || 0

      if (a !== b) {
        return a < b ? -1 : 1
      }
    }

    return 0
  }

  toString() {
    return this.value
  }
}

// ===============================================
// Implementations from our utils/update-helpers.js
// ===============================================

/**
 * Parse properties file format (key=value)
 */
function parseProperties(data) {
  return data.split('\n').reduce((acc, line) => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=').map((s) => s.trim())
      if (key && value) acc[key] = value
    }
    return acc
  }, {})
}

/**
 * Make an HTTP request that follows redirects
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const fetchUrl = (currentUrl) => {
      console.log(`Fetching URL: ${currentUrl}`)

      const urlObj = new URL(currentUrl)
      const protocol = urlObj.protocol === 'https:' ? https : http

      protocol
        .get(currentUrl, (res) => {
          console.log(`Status Code: ${res.statusCode}`)
          console.log(`Headers: ${JSON.stringify(res.headers)}`)

          // Handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`Following redirect to: ${res.headers.location}`)
            return fetchUrl(res.headers.location)
          }

          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            resolve({ data, statusCode: res.statusCode, headers: res.headers })
          })
        })
        .on('error', (error) => {
          reject(error)
        })
    }

    fetchUrl(url)
  })
}

/**
 * Fetch the latest version from the update site with redirect handling
 */
async function getLatestVersion(updateSiteURL) {
  return new Promise(async (resolve, reject) => {
    try {
      // First, construct the URL to metadata.properties
      const metadataUrl = new URL(updateSiteURL)

      // For GitHub releases, we should first access the /latest tag to get the proper redirection
      if (
        metadataUrl.hostname === 'github.com' &&
        metadataUrl.pathname.includes('/releases/latest')
      ) {
        // Find the latest release tag
        const latestUrl = `${metadataUrl.toString()}/metadata.properties`
        console.log(`Trying to get metadata.properties from: ${latestUrl}`)

        const { data, statusCode } = await makeRequest(latestUrl)
        console.log('Response body:')
        console.log(data.substring(0, 500)) // Print first 500 chars

        try {
          const props = parseProperties(data)
          console.log('Parsed properties:', props)

          if (!props['app.version']) {
            reject(new Error('Cannot find app.version key in metadata.properties'))
          } else {
            const ver = props['app.version']
            const revision = parseInt(props['app.revision']) || 0
            resolve(new Version(ver, revision))
          }
        } catch (error) {
          reject(new Error(`Error parsing response: ${error.message}`))
        }
      } else {
        reject(new Error('URL format not supported. Expected GitHub releases URL'))
      }
    } catch (error) {
      console.error(`Request error: ${error.message}`)
      reject(error)
    }
  })
}

/**
 * Check if update is available by comparing versions
 */
function isUpdateAvailable(currentVersion, latestVersion) {
  return currentVersion.compareTo(latestVersion) < 0
}

// ===============================================
// Original getCurrentVersionFromRepository function (kept for reference)
// ===============================================
function getCurrentVersionFromRepository(updateSiteURL) {
  return new Promise((resolve, reject) => {
    const url = new URL(updateSiteURL)
    url.pathname = path.join(url.pathname, 'metadata.properties')

    console.log(`Fetching from URL: ${url.toString()}`)

    const protocol = url.protocol === 'https:' ? https : http

    protocol
      .get(url, (res) => {
        let data = ''

        // Log response status
        console.log(`Status Code: ${res.statusCode}`)
        console.log(`Headers: ${JSON.stringify(res.headers)}`)

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirected to: ${res.headers.location}`)
          // Handle redirects if needed
        }

        res.on('data', (chunk) => (data += chunk))

        res.on('end', () => {
          console.log('Response body:')
          console.log(data.substring(0, 500)) // Print first 500 chars to avoid overwhelming output

          try {
            const props = parseProperties(data)
            console.log('Parsed properties:', props)

            if (!props['app.version']) {
              reject(new Error('Cannot find app.version key in download site metadata.properties'))
            } else {
              const ver = props['app.version']
              const revision = parseInt(props['app.revision']) || 0
              resolve(new Version(ver, revision))
            }
          } catch (error) {
            reject(new Error(`Error parsing response: ${error.message}`))
          }
        })
      })
      .on('error', (error) => {
        console.error(`Request error: ${error.message}`)
        reject(error)
      })
  })
}

// ===============================================
// Test Configuration
// ===============================================

// Known working direct URL (from the redirect in your logs)
const directMetadataUrl =
  'https://github.com/longtail-labs/slide.releases.beta/releases/download/0.0.1741649632/metadata.properties'

// URL to test with
const updateSiteURL = 'https://github.com/longtail-labs/slide.releases.beta/releases/latest'

// Mock current version for update check testing
const currentVersion = new Version('0.0.1000000000')

// ===============================================
// Tests
// ===============================================

// Test 0: Direct test with the known URL (most reliable)
console.log('\n=== Test 0: Direct Metadata URL ===')
console.log(`Testing with direct URL from redirect: ${directMetadataUrl}`)

makeRequest(directMetadataUrl)
  .then(({ data }) => {
    console.log('Response body:')
    console.log(data.substring(0, 500))

    try {
      const props = parseProperties(data)
      console.log('Parsed properties:', props)

      if (!props['app.version']) {
        console.error('Cannot find app.version key in metadata.properties')
      } else {
        const ver = props['app.version']
        const revision = parseInt(props['app.revision']) || 0
        const version = new Version(ver, revision)

        console.log('Success! Version retrieved directly:')
        console.log(`Version: ${version.version}`)
        console.log(`Revision: ${version.revision}`)
        console.log(`String representation: ${version.toString()}`)

        // Test update availability
        const updateAvailable = isUpdateAvailable(currentVersion, version)
        console.log(`Update available: ${updateAvailable}`)
      }
    } catch (error) {
      console.error(`Error parsing response: ${error.message}`)
    }
  })
  .catch((error) => {
    console.error('Error retrieving metadata directly:', error.message)
  })

// Test 1: Test getLatestVersion with redirect handling
console.log('\n=== Test 1: getLatestVersion with improved redirect handling ===')
console.log(`Testing getLatestVersion with URL: ${updateSiteURL}`)

getLatestVersion(updateSiteURL)
  .then((version) => {
    console.log('Success! Version retrieved:')
    console.log(`Version: ${version.version}`)
    console.log(`Revision: ${version.revision}`)
    console.log(`String representation: ${version.toString()}`)

    // Now test if update is available
    console.log('\n=== Test 2: isUpdateAvailable ===')
    console.log(
      `Comparing current version (${currentVersion.toString()}) with latest (${version.toString()})`
    )

    const updateAvailable = isUpdateAvailable(currentVersion, version)
    console.log(`Update available: ${updateAvailable}`)

    if (updateAvailable) {
      console.log('✅ An update is available!')
    } else {
      console.log('❌ No update is needed.')
    }
  })
  .catch((error) => {
    console.error('Error retrieving version:')
    console.error(error.message)

    console.log('\n=== Troubleshooting suggestions ===')
    console.log('1. Check the specific GitHub repository URL structure')
    console.log(`2. Try with the direct URL: ${directMetadataUrl}`)
    console.log('3. Verify the metadata.properties file exists and is accessible')
    console.log('4. Examine network logs to identify any redirect or access issues')
  })

// For reference, also run the original function
console.log('\n=== Reference: Original getCurrentVersionFromRepository ===')

getCurrentVersionFromRepository(updateSiteURL + '/metadata.properties')
  .then((version) => {
    console.log('Success! Version retrieved using original method:')
    console.log(`Version: ${version.version}`)
    console.log(`Revision: ${version.revision}`)
    console.log(`String representation: ${version.toString()}`)
  })
  .catch((error) => {
    console.error('Error retrieving version using original method:')
    console.error(error.message)
  })
