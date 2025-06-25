import fs from 'fs'
import path from 'path'
import Module from 'module'

/**
 * Sets up Kuzu native modules to be loaded from Resources/kuzu directory
 * This is much simpler than the previous approach and expects the .node file
 * to be placed directly at Resources/kuzu/kuzujs.node
 */
export function setupNativeModules() {
  try {
    const resourcesPath = process.resourcesPath
    console.log(`Resources path: ${resourcesPath}`)

    // Setup for Kuzu - direct path to the .node file
    const kuzuNodePath = path.join(resourcesPath, 'kuzu', 'kuzujs.node')
    console.log(`Kuzu native module path: ${kuzuNodePath}`)

    // Check if the file exists
    if (!fs.existsSync(kuzuNodePath)) {
      console.error(`Kuzu native module not found at expected path: ${kuzuNodePath}`)
      return
    }

    console.log(`Found Kuzu native module at: ${kuzuNodePath}`)

    // Set environment variable to the directory containing the .node file
    const kuzuDir = path.dirname(kuzuNodePath)
    process.env.KUZU_NATIVE_MODULE_PATH = kuzuDir

    // Add to module search paths
    module.paths.unshift(path.dirname(kuzuDir))

    // Patch the Module._load function to intercept Kuzu module loads
    const originalRequire = Module._load

    Module._load = function (request, parent, isMain) {
      // Handle Kuzu module loading
      if (
        request === 'kuzu' ||
        request.endsWith('/kuzu') ||
        request.includes('kuzu/kuzujs.node') ||
        request.endsWith('kuzujs.node')
      ) {
        console.log(`Intercepting Kuzu module load request: ${request}`)

        // If requesting the .node file directly, redirect to our specific path
        if (request.endsWith('kuzujs.node')) {
          console.log(`Redirecting to: ${kuzuNodePath}`)

          if (fs.existsSync(kuzuNodePath)) {
            return originalRequire(kuzuNodePath, parent, isMain)
          }
        }
      }

      // For all other modules, use the original loader
      return originalRequire(request, parent, isMain)
    }

    console.log('Kuzu native module loading setup completed successfully')
  } catch (error) {
    console.error('Error setting up Kuzu module:', error)
  }
}
