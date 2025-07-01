import { Effect, Duration } from 'effect'
import { BaseWindow, WebContentsView } from 'electron'
import log from 'electron-log'
import { listenTo } from '../utils/listenTo.js'
import { createRequire } from 'node:module'
import { PubSubClient } from '../services/pubsub.service.js'
import { markAppReady, markAppError, AppReadyRefLive } from '../refs/ipc/app-ready.ref.js'
import {
  createSetWindowTitle,
  createGetAppInfo,
  createShowUpdateDialog,
  createInvalidateQuery,
  createTaskStart
} from '@slide.code/schema/messages'
import { UserRef } from '../refs/ipc/user.ref.js'
import { findClaudeCodeExecutable } from '../effects/findClaudeCodeExecutable.effect.js'
import { DatabaseService, DatabaseServiceLive } from '../services/database.service.js'
import type { TaskInsert, ChatMessageInsert } from '@slide.code/schema'

const require = createRequire(import.meta.url)
const resolve = require.resolve

/**
 * Combined flow that handles app launch and task work
 * Uses route navigation instead of separate windows
 * Tests all communication systems: RPC, PubSub, and IPCRef
 */
export const AppLaunchedFlow = listenTo('AppReady', 'AppLaunchedFlow', (message) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('🚀 Starting AppLaunchedFlow - Creating BaseWindow', message._tag)
    log.info('[APP-FLOW] 🚀 Starting AppLaunchedFlow - Creating BaseWindow')

    // Test Database Service
    yield* Effect.logInfo('🗄️ Testing DatabaseService')
    log.info('[APP-FLOW] 🗄️ Testing DatabaseService')
    try {
      const dbService = yield* DatabaseService

      const projects = yield* dbService.getProjects()

      console.log('!!!PROJECTS', projects)

      // Clear existing data for clean test
      // yield* Effect.sync(() => tasks.removeMany({}))
      // yield* Effect.sync(() => chatMessages.removeMany({}))
      log.info('[APP-FLOW] 🗄️ Cleared existing tasks and messages')

      // Create test task using helper function
      // const testTask: TaskInsert = {
      //   name: 'Test Task from AppLaunchedFlow',
      //   status: 'working'
      // }

      // Use the helper function for type-safe insertion
      // const insertedTask = yield* Effect.sync(() => insertTask(tasks, testTask))
      // console.log('insertedTask', insertedTask)
      // log.info('[APP-FLOW] 🗄️ Inserted new task:', JSON.stringify(insertedTask, null, 2))

      // // Test inserting a chat message
      // if (insertedTask && insertedTask.id) {
      //   const testMessage: ChatMessageInsert = {
      //     taskId: insertedTask.id,
      //     event: {
      //       type: 'user',
      //       message: 'Hello, database!',
      //       parent_tool_use_id: null,
      //       session_id: 'session-test-123'
      //     }
      //   }

      //   const insertedMessage = yield* Effect.sync(() =>
      //     insertChatMessage(chatMessages, testMessage)
      //   )
      //   log.info('[APP-FLOW] 🗄️ Inserted new message:', JSON.stringify(insertedMessage, null, 2))

      //   // Test ORM relationship
      //   yield* Effect.sleep(Duration.millis(100)) // Give a moment for reactivity if needed
      //   const taskFromDb = yield* Effect.sync(() => tasks.findOne({ id: insertedTask.id }))

      //   if (taskFromDb) {
      //     log.info(`[APP-FLOW] 🗄️ Found task by ID: ${taskFromDb.name}`)
      //     const messagesForTask = yield* Effect.sync(() => taskFromDb.getMessages().fetch())
      //     log.info(
      //       `[APP-FLOW] 🗄️ Fetched ${messagesForTask.length} message(s) via ORM method:`,
      //       JSON.stringify(messagesForTask, null, 2)
      //     )
      //   } else {
      //     log.warn('[APP-FLOW] 🗄️ Could not find the task back from the DB.')
      //   }
      // }

      yield* Effect.logInfo('🗄️ Database test completed successfully')
      log.info('[APP-FLOW] 🗄️ Database test completed successfully')
    } catch (dbError) {
      yield* Effect.logError('🗄️ Error during database test', dbError)
      log.error('[APP-FLOW] 🗄️ Database test error:', dbError)
    }

    // Get services for testing
    const pubsub = yield* PubSubClient
    const userRef = yield* UserRef

    // Test Claude Code service configuration and detect executable
    yield* Effect.logInfo('🤖 Testing Claude Code service configuration')
    log.info('[APP-FLOW] 🤖 Testing Claude Code service in app flow')

    // First, try to detect and configure Claude executable
    yield* Effect.logInfo('🤖 Attempting to detect Claude executable')
    log.info('[APP-FLOW] 🤖 Starting Claude executable detection')

    try {
      const detectedPath = yield* findClaudeCodeExecutable
      if (detectedPath) {
        yield* Effect.logInfo(`🤖 Successfully detected Claude at: ${detectedPath}`)
        yield* userRef.updateClaudeCodeExecutablePath(detectedPath)
        log.info(`[APP-FLOW] 🤖 Claude executable detected and configured: ${detectedPath}`)
      } else {
        yield* Effect.logWarning('🤖 Could not detect Claude executable automatically')
        log.warn('[APP-FLOW] 🤖 Claude executable detection failed - may need manual configuration')
      }
    } catch (detectionError) {
      yield* Effect.logError('🤖 Error during Claude executable detection', detectionError)
      log.error('[APP-FLOW] 🤖 Claude executable detection error:', detectionError)
    }

    const userState = yield* userRef.ref.get()
    const claudeConfig = userState.claudeCode
    yield* Effect.logInfo('🤖 Current Claude Code config', claudeConfig)
    log.info('[APP-FLOW] 🤖 Claude Code working directory:', userState.vibeDirectory)
    log.info(
      '[APP-FLOW] 🤖 Claude Code executable path:',
      claudeConfig?.executablePath || 'not configured'
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
          webviewTag: true,
          sandbox: false,
          allowRunningInsecureContent: false,
          webSecurity: true,
          // Enable additional features for webview functionality
          experimentalFeatures: true
        }
      })

      // Add the view to the window
      baseWindow.contentView.addChildView(webContentsView)

      // Set the view bounds to fill the entire window
      const { width, height } = baseWindow.getBounds()
      webContentsView.setBounds({ x: 0, y: 0, width, height })

      // Load the app HTML file using the WebContentsView
      yield* Effect.if(process.env.MODE === 'development' && !!process.env.VITE_DEV_SERVER_URL, {
        onTrue: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadURL(process.env.VITE_DEV_SERVER_URL!)
          ).pipe(Effect.tap(() => Effect.logInfo('Loaded from Vite Dev Server'))),
        onFalse: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadFile(resolve('@slide.code/app'))
          ).pipe(Effect.tap(() => Effect.logInfo('Loaded from file')))
      })

      // webContentsView.webContents.loadFile(resolve('@slide.code/app'))

      webContentsView.webContents.openDevTools()

      // Sleep briefly to ensure window is ready
      yield* Effect.sleep(Duration.millis(5000))
      console.log('MARKING APP READY')

      yield* markAppReady

      // Test TaskStartListener after app is ready
      // yield* Effect.fork(
      //   Effect.gen(function* () {
      //     console.log('[APP-FLOW] ⏳ Waiting 3 seconds before testing TaskStartListener')
      //     yield* Effect.sleep(Duration.millis(3000))

      //     console.log('[APP-FLOW] 🧪 Testing TaskStartListener with fake task creation')
      //     yield* Effect.logInfo('[APP-FLOW] 🧪 Testing TaskStartListener with fake task creation')

      //     try {
      //       const dbService = yield* DatabaseService

      //       // Get the specific project
      //       const projectId = '697ccaf7-d07b-416a-b824-680bca4a45a9'
      //       console.log('[APP-FLOW] 🔧 Getting project by ID:', projectId)

      //       const project = yield* dbService.getProject(projectId)
      //       if (!project) {
      //         console.error('[APP-FLOW] ❌ Project not found:', projectId)
      //         return
      //       }

      //       console.log('[APP-FLOW] ✅ Project found:', project.name, 'at path:', project.path)

      //       // Create a test task
      //       const taskData = {
      //         name: 'Create a sample typescript script to add two numbers',
      //         projectId: projectId,
      //         useWorktree: false,
      //         status: 'working' as const,
      //         branch: undefined
      //       }

      //       console.log('[APP-FLOW] 🔧 Creating test task:', taskData)
      //       const createdTask = yield* dbService.createTask(taskData)
      //       console.log('[APP-FLOW] ✅ Test task created:', createdTask.id)

      //       // Publish TASK_START message
      //       const taskStartMessage = createTaskStart(createdTask.id)
      //       console.log('[APP-FLOW] 📢 Publishing TASK_START message for task:', createdTask.id)
      //       yield* pubsub.publish(taskStartMessage)
      //       console.log('[APP-FLOW] ✅ TASK_START message published successfully')
      //     } catch (error) {
      //       console.error('[APP-FLOW] ❌ Error testing TaskStartListener:', error)
      //       yield* Effect.logError('[APP-FLOW] ❌ Error testing TaskStartListener', error)
      //     }
      //   })
      // )

      // Show the window once the content has finished loading
      // webContentsView.webContents.once('did-finish-load', () => {
      //   baseWindow.show()
      //   log.info('[APP-FLOW] BaseWindow shown successfully after content loaded')

      //   // Start communication systems testing after window is loaded
      //   setTimeout(() => {
      //     testCommunicationSystemsSimple()
      //   }, 2000)
      // })

      // setTimeout(() => {
      //   console.log('TESTING COMMUNICATION SYSTEMS')
      //   testCommunicationSystemsSimple()
      // }, 2000)

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

      // Simplified communication systems test function
      const testCommunicationSystemsSimple = () => {
        log.info('[APP-FLOW] 🧪 Starting simplified communication systems test')

        // 1. Test IPCRef - App Ready State
        // setTimeout(() => {
        //   log.info('[APP-FLOW] 📡 Testing IPCRef - Setting app ready state')
        //   SlideRuntime.runPromise(
        //     markAppReady.pipe(
        //       Effect.provide(AppReadyRefLive),
        //       Effect.provide(IPCRefService.Default)
        //     )
        //   )
        //     .then(() => {
        //       log.info('[APP-FLOW] 📡 App ready state set successfully')
        //     })
        //     .catch((error) => {
        //       log.error('[APP-FLOW] ❌ Error setting app ready state:', error)
        //     })
        // }, 1000)

        // 2. Test PubSub - Publish various messages
        setTimeout(() => {
          log.info('[APP-FLOW] 📢 Testing PubSub - Publishing messages')

          Effect.runPromise(
            pubsub.publish(createSetWindowTitle('SlideCode - Communication Test Active'))
          )
            .then(() => {
              log.info('[APP-FLOW] 📢 Published SetWindowTitle message')
            })
            .catch((error) => {
              log.error('[APP-FLOW] ❌ Error publishing SetWindowTitle:', error)
            })

          setTimeout(() => {
            Effect.runPromise(pubsub.publish(createGetAppInfo(true)))
              .then(() => {
                log.info('[APP-FLOW] 📢 Published GetAppInfo message')
              })
              .catch((error) => {
                log.error('[APP-FLOW] ❌ Error publishing GetAppInfo:', error)
              })
          }, 1000)

          setTimeout(() => {
            Effect.runPromise(pubsub.publish(createShowUpdateDialog(false)))
              .then(() => {
                log.info('[APP-FLOW] 📢 Published ShowUpdateDialog message')
              })
              .catch((error) => {
                log.error('[APP-FLOW] ❌ Error publishing ShowUpdateDialog:', error)
              })
          }, 2000)

          // Test query invalidation
          setTimeout(() => {
            log.info('[APP-FLOW] 🔄 Testing query invalidation from main process')
            const queryInvalidationMessage = createInvalidateQuery(['test-query-from-main'])
            Effect.runPromise(pubsub.publish(queryInvalidationMessage))
              .then(() => {
                log.info(
                  '[APP-FLOW] 🔄 Published query invalidation message:',
                  queryInvalidationMessage
                )
              })
              .catch((error) => {
                log.error('[APP-FLOW] ❌ Error publishing query invalidation:', error)
              })
          }, 3000)
        }, 3000)

        // 3. Test periodic PubSub messages
        setTimeout(() => {
          log.info('[APP-FLOW] 🔄 Starting periodic PubSub messages test')

          setInterval(() => {
            const timestamp = new Date().toLocaleTimeString()
            const periodicMessage = createSetWindowTitle(`SlideCode - Periodic Test ${timestamp}`)
            Effect.runPromise(pubsub.publish(periodicMessage))
              .then(() => {
                log.info('[APP-FLOW] 🔄 Published periodic PubSub message')
              })
              .catch((error) => {
                log.error('[APP-FLOW] 🔄 Error publishing periodic message:', error)
              })
          }, 10000)

          // Also test periodic query invalidation
          setInterval(() => {
            const timestamp = new Date().toLocaleTimeString()
            const periodicQueryInvalidation = createInvalidateQuery([`periodic-test-${timestamp}`])
            Effect.runPromise(pubsub.publish(periodicQueryInvalidation))
              .then(() => {
                log.info(
                  '[APP-FLOW] 🔄 Published periodic query invalidation:',
                  periodicQueryInvalidation
                )
              })
              .catch((error) => {
                log.error('[APP-FLOW] 🔄 Error publishing periodic query invalidation:', error)
              })
          }, 15000) // Every 15 seconds for query invalidation
        }, 5000)

        log.info('[APP-FLOW] 🧪 All communication systems tests initiated')
      }

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
