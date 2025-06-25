import { Effect, Duration } from 'effect'
import { BaseWindow, WebContentsView } from 'electron'
import log from 'electron-log'
import { listenTo } from '../utils/listenTo.js'
import { createRequire } from 'node:module'
import { ClaudeCodeService } from '../services/claude-code.service.js'

const require = createRequire(import.meta.url)
const resolve = require.resolve

/**
 * Combined flow that handles app launch and task work
 * Uses route navigation instead of separate windows
 */
export const AppLaunchedFlow = listenTo('AppReady', 'AppLaunchedFlow', (message) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Starting AppLaunchedFlow - Creating BaseWindow', message._tag)
    log.info('[APP-FLOW] Starting AppLaunchedFlow - Creating BaseWindow')

    // Get Claude Code service for additional testing
    const claudeCodeService = yield* ClaudeCodeService

    // Test Claude Code service configuration and detect executable
    yield* Effect.logInfo('🤖 Testing Claude Code service configuration')
    log.info('[APP-FLOW] 🤖 Testing Claude Code service in app flow')

    // First, try to detect and configure Claude executable
    yield* Effect.logInfo('🤖 Attempting to detect Claude executable')
    log.info('[APP-FLOW] 🤖 Starting Claude executable detection')

    try {
      const detectedPath = yield* claudeCodeService.detectAndConfigureClaudeExecutable()
      if (detectedPath) {
        yield* Effect.logInfo(`🤖 Successfully detected Claude at: ${detectedPath}`)
        log.info(`[APP-FLOW] 🤖 Claude executable detected and configured: ${detectedPath}`)
      } else {
        yield* Effect.logWarning('🤖 Could not detect Claude executable automatically')
        log.warn('[APP-FLOW] 🤖 Claude executable detection failed - may need manual configuration')
      }
    } catch (detectionError) {
      yield* Effect.logError('🤖 Error during Claude executable detection', detectionError)
      log.error('[APP-FLOW] 🤖 Claude executable detection error:', detectionError)
    }

    const currentConfig = yield* claudeCodeService.getConfig()
    yield* Effect.logInfo('🤖 Current Claude Code config', currentConfig)
    log.info('[APP-FLOW] 🤖 Claude Code working directory:', currentConfig.workingDirectory)
    log.info(
      '[APP-FLOW] 🤖 Claude Code executable path:',
      currentConfig.pathToClaudeCodeExecutable || 'not configured'
    )

    try {
      // Create the BaseWindow with appropriate options
      const baseWindow = new BaseWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: true, // Don't show until ready
        titleBarStyle: 'hiddenInset'
      })

      // Create a WebContentsView to load the app
      const webContentsView = new WebContentsView({
        webPreferences: {
          preload: resolve('@slide.code/preload'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false
        }
      })

      // Add the view to the window
      baseWindow.contentView.addChildView(webContentsView)

      // Set the view bounds to fill the entire window
      const { width, height } = baseWindow.getBounds()
      webContentsView.setBounds({ x: 0, y: 0, width, height })

      // Load the app HTML file using the WebContentsView
      yield* Effect.promise(() => webContentsView.webContents.loadFile(resolve('@slide.code/app')))
      // yield* Effect.promise(() => webContentsView.webContents.loadURL('https://google.com'))

      webContentsView.webContents.openDevTools()

      // Show the window once the content has finished loading
      webContentsView.webContents.once('did-finish-load', () => {
        baseWindow.show()
        log.info('[APP-FLOW] BaseWindow shown successfully after content loaded')
      })

      // Handle window closed event and cleanup WebContentsView
      baseWindow.on('closed', () => {
        log.info('[APP-FLOW] BaseWindow closed, cleaning up WebContentsView')
        if (!webContentsView.webContents.isDestroyed()) {
          webContentsView.webContents.close()
        }
      })

      // Handle window resize to update view bounds
      baseWindow.on('resized', () => {
        const bounds = baseWindow.getBounds()
        webContentsView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
      })

      yield* Effect.logInfo('BaseWindow created and app loaded successfully')
      log.info('[APP-FLOW] BaseWindow created and app loaded successfully')

      // Run Claude Code test after app window is created
      yield* Effect.logInfo('🤖 Running Claude Code test on app launch')
      log.info('[APP-FLOW] 🤖 About to execute Claude Code test script creation')

      // const claudeCodeResult = yield* Effect.fork(
      //   claudeCodeService
      //     .createSimpleScript(
      //       'calculates the sum of two numbers and logs the result with timestamps',
      //       'sum-calculator.ts'
      //     )
      //     .pipe(
      //       Effect.tap((messages) =>
      //         Effect.gen(function* () {
      //           yield* Effect.logInfo(`🤖 Claude Code completed with ${messages.length} messages`)
      //           log.info(
      //             `[APP-FLOW] 🤖 Claude Code execution completed with ${messages.length} messages`
      //           )

      //           // Log a summary of the results
      //           const successMessages = messages.filter(
      //             (m) => m.type === 'result' && (m as any).subtype === 'success'
      //           )
      //           if (successMessages.length > 0) {
      //             log.info('[APP-FLOW] 🤖 Claude Code script creation was successful!')
      //           } else {
      //             log.warn('[APP-FLOW] 🤖 Claude Code execution may not have been fully successful')
      //           }
      //         })
      //       ),
      //       Effect.catchAll((error) =>
      //         Effect.gen(function* () {
      //           yield* Effect.logError('🤖 Claude Code test failed', error)
      //           log.error('[APP-FLOW] 🤖 Claude Code test failed:', error)
      //         })
      //       )
      //     )
      // )

      yield* Effect.logInfo('🤖 Claude Code test started in background')
      log.info('[APP-FLOW] 🤖 Claude Code test execution initiated')

      return true
    } catch (error) {
      yield* Effect.logError(`Error creating BaseWindow: ${error}`)
      log.error('[APP-FLOW] Error creating BaseWindow:', error)
      return Effect.fail(`Failed to create BaseWindow: ${error}`)
    }
  })
)

/**
//  * Flow that navigates to working mode and manages working state
//  * Integrates both navigation and working environment management
//  */
// export const WorkOnTaskFlow = listenTo(MessageTypes.TASK_START, 'WorkOnTaskFlow', (message) =>
//   Effect.gen(function* () {
//     yield* Effect.logInfo('Starting WorkOnTaskFlow - Navigating to Working Mode')
//     log.info('[APP-FLOW] Starting WorkOnTaskFlow - Navigating to Working Mode')

//     const { taskId } = message

//     yield* Effect.logInfo(`Working on task: ${taskId}`)
//     log.info(`[APP-FLOW] Working on task: ${taskId}`)

//     try {
//       // Get the working ref for state management
//       const workingRef = yield* WorkingRef

//       // Check if there's already an active task
//       const currentState = yield* workingRef.getState()
//       if (
//         currentState.initialized &&
//         currentState.currentTaskId &&
//         currentState.currentTaskId !== taskId
//       ) {
//         yield* Effect.logInfo(
//           `Another task (${currentState.currentTaskId}) is already active. Cleaning up...`
//         )
//         log.info(
//           `[APP-FLOW] Another task (${currentState.currentTaskId}) is already active. Cleaning up...`
//         )
//         yield* workingRef.destroyAll
//       }

//       // Initialize the task environment (but without creating separate windows)
//       // This will set up the working state and prepare task data
//       log.info(`[APP-FLOW] Initializing task environment for: ${taskId}`)
//       yield* workingRef.initializeTaskEnvironment(taskId)

//       // Navigate the planning window to the working route
//       log.info(`[APP-FLOW] Navigating to working mode for task: ${taskId}`)
//       yield* PlanningRef.navigateToWorking(taskId)
//       // yield* PlanningRef.navigateToSearching(taskId)

//       yield* Effect.logInfo('Successfully navigated to working mode and initialized environment')
//       log.info('[APP-FLOW] Successfully navigated to working mode and initialized environment')

//       return true
//     } catch (error) {
//       yield* Effect.logError(`Error setting up working mode: ${error}`)
//       log.error('[APP-FLOW] Error setting up working mode:', error)
//       return Effect.fail(`Failed to set up working mode: ${error}`)
//     }
//   })
// )

// /**
//  * Flow that handles exiting task work mode
//  * Cleans up working state and navigates back to planning
//  * Supports skip functionality to find and navigate to next task
//  */
// export const ExitTaskFlow = listenTo(MessageTypes.TASK_EXITED, 'ExitTaskFlow', (message) =>
//   Effect.gen(function* () {
//     const isSkip = message.skip === true

//     yield* Effect.logInfo(
//       `Exiting task work mode - ${isSkip ? 'Skipping to next task' : 'Returning to planning'}`
//     )
//     log.info(
//       `[APP-FLOW] Exiting task work mode - ${isSkip ? 'Skipping to next task' : 'Returning to planning'}`
//     )

//     try {
//       // Get the working ref for cleanup
//       const workingRef = yield* WorkingRef

//       if (isSkip) {
//         // Skip functionality - search for next task
//         yield* Effect.logInfo(`Task skipped: ${message.taskId}`)
//         log.info(`[APP-FLOW] Task skipped: ${message.taskId}`)

//         try {
//           // Navigate to searching page first to show loading state
//           log.info(`[APP-FLOW] Navigating to searching page for task: ${message.taskId}`)
//           yield* PlanningRef.navigateToSearching(message.taskId)

//           // Find the next task
//           log.info('[APP-FLOW] Finding next task...')
//           const nextTask = yield* getNextTask(message.taskId).pipe(
//             Effect.catchAll((error) => {
//               log.error('[APP-FLOW] Error finding next task:', error)
//               return Effect.succeed(null)
//             })
//           )

//           // Clean up the current task environment
//           log.info('[APP-FLOW] Cleaning up current task environment')
//           yield* workingRef.destroyAll

//           // Add a small delay to show the searching state
//           yield* Effect.sleep(Duration.millis(1500))

//           if (nextTask) {
//             yield* Effect.logInfo(`Found next task: ${nextTask.id} - ${nextTask.name}`)
//             log.info(`[APP-FLOW] Found next task: ${nextTask.id} - ${nextTask.name}`)

//             // Get pubsub client to start the next task
//             const pubsub = yield* PubSubClient

//             // Start the next task
//             log.info(`[APP-FLOW] Starting next task: ${nextTask.id}`)
//             yield* pubsub.publish(createTaskStart(nextTask.id))

//             yield* Effect.logInfo('Successfully started next task')
//             log.info('[APP-FLOW] Successfully started next task')
//           } else {
//             yield* Effect.logWarning('No next task found, returning to planning')
//             log.warn('[APP-FLOW] No next task found, returning to planning')

//             // Navigate back to planning if no next task found
//             yield* PlanningRef.navigateToPlanning()
//           }
//         } catch (error) {
//           yield* Effect.logError(`Failed to skip to next task: ${error}`)
//           log.error('[APP-FLOW] Failed to skip to next task:', error)

//           // Still clean up the current task even if there's an error
//           log.info('[APP-FLOW] Cleaning up current task after error')
//           yield* workingRef.destroyAll

//           // Navigate back to planning as fallback
//           log.info('[APP-FLOW] Navigating back to planning as fallback')
//           yield* PlanningRef.navigateToPlanning()
//         }
//       } else {
//         // Regular exit behavior - just clean up and return to planning
//         log.info('[APP-FLOW] Regular exit - cleaning up and returning to planning')
//         yield* PlanningRef.navigateToPlanning()
//         yield* Effect.sleep(Duration.millis(100))
//         yield* workingRef.destroyAll

//         yield* Effect.logInfo(
//           'Successfully cleaned up working state and navigated back to planning'
//         )
//         log.info('[APP-FLOW] Successfully cleaned up working state and navigated back to planning')
//       }

//       return true
//     } catch (error) {
//       yield* Effect.logError(`Error handling task exit: ${error}`)
//       log.error('[APP-FLOW] Error handling task exit:', error)
//       return Effect.fail(`Failed to handle task exit: ${error}`)
//     }
//   })
// )
