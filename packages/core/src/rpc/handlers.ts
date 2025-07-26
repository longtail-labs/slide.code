// handlers.ts
import { Effect, Layer } from 'effect'
import { SlideRpcs, Project } from '@slide.code/schema/requests'
import { DatabaseService } from '../services/database.service.js'
import { PubSubClient } from '../services/pubsub.service.js'
import {
  createInvalidateQuery,
  createTaskStart,
  createTaskContinue,
  createTaskStop
} from '@slide.code/schema/messages'
import { createProjectsInvalidation } from '@slide.code/schema'

import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { getVibeDir } from '@slide.code/shared'
import { ensureDirectory, sanitizePathName, pathExists } from '../utils/filesystem.util.js'
import { makeGitRepo } from '../resources/GitRepo/git-repo.resource.js'
import { dialog, shell, app } from 'electron'
import { createRequire } from 'node:module'
import log from 'electron-log'

const require = createRequire(import.meta.url)
const resolve = require.resolve

// Utility function to format database results for Drizzle
function toDrizzleResult(
  rows: Record<string, any> | Array<Record<string, any>> | null,
  method: 'all' | 'execute' | 'values' | 'run' | 'get'
): any[] | any {
  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    return method === 'get' ? null : []
  }

  if (method === 'get') {
    const row = Array.isArray(rows) ? rows[0] : rows
    return row ? Object.values(row) : null
  }

  return Array.isArray(rows) ? rows.map((row) => Object.values(row)) : [Object.values(rows)]
}

export const SlideLive = SlideRpcs.toLayer(
  Effect.gen(function* () {
    const dbService = yield* DatabaseService
    const pubsubClient = yield* PubSubClient

    return {
      // File handlers
      GetFileDiff: ({ path }) =>
        Effect.succeed(`--- a/${path}\\n+++ b/${path}\\n... diff for ${path}`),
      GetFileContent: ({ path }) =>
        Effect.tryPromise({
          try: () => fs.readFile(path, 'utf-8'),
          catch: (e) => (e as Error).message
        }),
      FileState: ({ path }) => Effect.succeed('modified'),
      ProjectFiles: ({ projectId }) => Effect.succeed('test'),

      // Project operations
      AddProject: ({ path: projectPath }) => {
        return Effect.gen(function* () {
          const projectName = path.basename(projectPath)

          // Ensure the project directory is a git repository
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: projectPath,
                branchName: 'master',
                useWorktree: false,
                autoInit: true
              })
            })
          )

          // Create the project in the database
          const projectData = {
            name: projectName,
            path: projectPath
          }

          const createdProject = yield* dbService.createProject(projectData)

          // Create and broadcast project invalidation message
          const projectsQueryKey = createProjectsInvalidation()
          const invalidateMessage = createInvalidateQuery(projectsQueryKey)
          yield* pubsubClient.publish(invalidateMessage)

          // Convert to RPC Project format
          return new Project({
            id: createdProject.id,
            name: createdProject.name,
            path: createdProject.path,
            createdAt: new Date(createdProject.createdAt),
            updatedAt: new Date(createdProject.updatedAt)
          })
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      SelectProjectDirectory: () => {
        return Effect.tryPromise({
          try: async (): Promise<string | null> => {
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory'],
              title: 'Select Project Directory'
            })

            if (result.canceled || result.filePaths.length === 0) {
              return null
            }

            const selectedPath = result.filePaths[0]
            return selectedPath || null
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return errorMessage
          }
        })
      },

      SelectFiles: () => {
        return Effect.tryPromise({
          try: async () => {
            const result = await dialog.showOpenDialog({
              properties: ['openFile', 'multiSelections'],
              title: 'Select Files',
              filters: [
                { name: 'All Files', extensions: ['*'] },
                {
                  name: 'Images',
                  extensions: [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'bmp',
                    'webp',
                    'svg',
                    'tiff',
                    'ico',
                    'JPG',
                    'JPEG',
                    'PNG',
                    'GIF',
                    'BMP',
                    'WEBP',
                    'SVG',
                    'TIFF',
                    'ICO'
                  ]
                },
                {
                  name: 'Documents',
                  extensions: [
                    'pdf',
                    'doc',
                    'docx',
                    'txt',
                    'md',
                    'rtf',
                    'odt',
                    'PDF',
                    'DOC',
                    'DOCX',
                    'TXT',
                    'MD',
                    'RTF',
                    'ODT'
                  ]
                },
                {
                  name: 'Code Files',
                  extensions: [
                    'js',
                    'ts',
                    'jsx',
                    'tsx',
                    'py',
                    'java',
                    'cpp',
                    'c',
                    'h',
                    'css',
                    'html',
                    'json',
                    'xml',
                    'yml',
                    'yaml'
                  ]
                },
                {
                  name: 'Text Files',
                  extensions: ['txt', 'md', 'csv', 'log']
                }
              ]
            })

            if (result.canceled || result.filePaths.length === 0) {
              return null
            }

            // Helper function to determine file type category
            const getFileType = (
              extension: string
            ): 'image' | 'document' | 'text' | 'code' | 'other' => {
              const normalizedExtension = extension.toLowerCase()

              const imageExts = [
                '.jpg',
                '.jpeg',
                '.png',
                '.gif',
                '.bmp',
                '.webp',
                '.svg',
                '.tiff',
                '.tif',
                '.ico'
              ]
              const docExts = ['.pdf', '.doc', '.docx', '.rtf', '.odt']
              const textExts = ['.txt', '.md', '.csv', '.log']
              const codeExts = [
                '.js',
                '.ts',
                '.jsx',
                '.tsx',
                '.py',
                '.java',
                '.cpp',
                '.c',
                '.h',
                '.css',
                '.html',
                '.json',
                '.xml',
                '.yml',
                '.yaml'
              ]

              if (imageExts.includes(normalizedExtension)) return 'image'
              if (docExts.includes(normalizedExtension)) return 'document'
              if (textExts.includes(normalizedExtension)) return 'text'
              if (codeExts.includes(normalizedExtension)) return 'code'
              return 'other'
            }

            // Helper function to get MIME type
            const getMimeType = (extension: string) => {
              const normalizedExtension = extension.toLowerCase()

              const mimeTypes: Record<string, string> = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.txt': 'text/plain',
                '.md': 'text/markdown',
                '.rtf': 'application/rtf',
                '.odt': 'application/vnd.oasis.opendocument.text',
                '.csv': 'text/csv',
                '.log': 'text/plain',
                '.js': 'text/javascript',
                '.ts': 'text/typescript',
                '.jsx': 'text/jsx',
                '.tsx': 'text/tsx',
                '.py': 'text/x-python',
                '.java': 'text/x-java-source',
                '.cpp': 'text/x-c++src',
                '.c': 'text/x-csrc',
                '.h': 'text/x-chdr',
                '.css': 'text/css',
                '.html': 'text/html',
                '.json': 'application/json',
                '.xml': 'application/xml',
                '.yml': 'application/x-yaml',
                '.yaml': 'application/x-yaml',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.tiff': 'image/tiff',
                '.tif': 'image/tiff',
                '.ico': 'image/x-icon'
              }
              return mimeTypes[normalizedExtension] || 'application/octet-stream'
            }

            // Convert selected files to FileAttachment format
            const fileAttachments = await Promise.all(
              result.filePaths.map(async (filePath) => {
                try {
                  const fileBuffer = await fs.readFile(filePath)
                  const stats = await fs.stat(filePath)
                  const fileName = path.basename(filePath)
                  const extension = path.extname(filePath).toLowerCase()

                  return {
                    fileName,
                    mimeType: getMimeType(extension),
                    base64Data: fileBuffer.toString('base64'),
                    size: stats.size,
                    fileType: getFileType(extension)
                  }
                } catch (error) {
                  throw error
                }
              })
            )

            return fileAttachments
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return errorMessage
          }
        })
      },

      CreateProject: ({ name }) => {
        return Effect.gen(function* () {
          const sanitizedName = sanitizePathName(name)
          const defaultProjectsDir = getVibeDir()
          const projectPath = path.join(defaultProjectsDir, sanitizedName)

          // Check if a project with this name already exists
          const directoryExists = yield* pathExists(projectPath)
          if (directoryExists) {
            return yield* Effect.fail(
              `A project with the name '${name}' already exists at: ${projectPath}`
            )
          }

          // Ensure the directory exists
          yield* ensureDirectory(projectPath)

          // Initialize git repository in the directory
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: projectPath,
                branchName: 'master',
                useWorktree: false,
                autoInit: true
              })
            })
          )

          // Create the project in the database
          const projectData = {
            name: name,
            path: projectPath
          }

          const createdProject = yield* dbService.createProject(projectData)

          // Create and broadcast project invalidation message
          const projectsQueryKey = createProjectsInvalidation()
          const invalidateMessage = createInvalidateQuery(projectsQueryKey)
          yield* pubsubClient.publish(invalidateMessage)

          // Convert to RPC Project format
          return new Project({
            id: createdProject.id,
            name: createdProject.name,
            path: createdProject.path,
            createdAt: new Date(createdProject.createdAt),
            updatedAt: new Date(createdProject.updatedAt)
          })
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      // Task operations
      StartTask: ({ projectId, prompt, useWorktree, model, permissionMode, attachments }) => {
        return Effect.gen(function* () {
          // Get the project from the database
          const project = yield* dbService.getProject(projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${projectId}`)
          }

          // Create a task in the database
          const taskData = {
            name: prompt,
            projectId,
            useWorktree: useWorktree || false,
            status: 'running' as const,
            branch: useWorktree ? 'feature/claude-task' : undefined
          }

          const createdTask = yield* dbService.createTask(taskData)

          // Publish TASK_START message
          const taskStartMessage = createTaskStart(
            createdTask.id,
            model,
            permissionMode,
            attachments
          )
          yield* pubsubClient.publish(taskStartMessage)

          return createdTask.id
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      ContinueTask: ({
        taskId,
        prompt,
        sessionId,
        model,
        permissionMode,
        fileComments,
        attachments
      }) => {
        return Effect.gen(function* () {
          // Publish TASK_CONTINUE message
          const taskContinueMessage = createTaskContinue(
            taskId,
            prompt,
            sessionId,
            model,
            permissionMode,
            fileComments,
            attachments
          )
          yield* pubsubClient.publish(taskContinueMessage)

          return true
        }).pipe(
          Effect.catchAll((error) => {
            return Effect.fail(String(error))
          })
        )
      },

      GetTaskDiff: ({ taskId, options }) => {
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Initialize git repo and get diff
          const diff = yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false
              })

              const diffResult = yield* gitRepo.gitDiffIncludingUntracked()
              return diffResult
            })
          )

          return diff
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      ArchiveTask: ({ taskId }) => {
        return Effect.gen(function* () {
          yield* dbService.archiveTask(taskId)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      UnarchiveTask: ({ taskId }) => {
        return Effect.gen(function* () {
          yield* dbService.unarchiveTask(taskId)
          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      StopTask: ({ taskId }) => {
        return Effect.gen(function* () {
          const taskStopMessage = createTaskStop(taskId)
          yield* pubsubClient.publish(taskStopMessage)
          return true
        })
      },

      DiscardChanges: ({ taskId }) => {
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Initialize git repo and discard changes
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false
              })

              yield* gitRepo.discardAllChanges()
            })
          )

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      CommitTask: ({ taskId }) => {
        return Effect.gen(function* () {
          // Get the task from database
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          // Get the project from database
          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          // Get the latest user prompt for the commit message
          const latestPrompt = yield* dbService.getLatestUserPromptForTask(taskId)
          let commitMessage = task.name

          if (latestPrompt && latestPrompt.event && latestPrompt.event.type === 'prompt') {
            const promptEvent = latestPrompt.event as any
            if (promptEvent.content) {
              commitMessage = promptEvent.content
            }
          }

          // Initialize git repo and commit changes
          yield* Effect.scoped(
            Effect.gen(function* () {
              const gitRepo = yield* makeGitRepo({
                repoPath: project.path,
                branchName: task.branch || 'master',
                useWorktree: task.useWorktree || false,
                autoInit: false
              })

              yield* gitRepo.add('.')
              yield* gitRepo.commit(commitMessage)
            })
          )

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      // External application operations
      OpenInGitHubDesktop: ({ taskId }) => {
        return Effect.gen(function* () {
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('open', ['-a', 'GitHub Desktop', pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', reject)
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  } else {
                    reject(new Error(`GitHub Desktop failed to open with exit code: ${code}`))
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open GitHub Desktop: ${error}`)
          })

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInFinder: ({ taskId }) => {
        return Effect.gen(function* () {
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('open', [pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', reject)
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  } else {
                    reject(new Error(`Finder failed to open with exit code: ${code}`))
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open Finder: ${error}`)
          })

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInTerminal: ({ taskId }) => {
        return Effect.gen(function* () {
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('open', ['-a', 'iTerm', pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', () => {
                  const fallbackChild = spawn('open', ['-a', 'Terminal', pathToOpen], {
                    stdio: 'ignore',
                    detached: true
                  })
                  fallbackChild.on('error', reject)
                  fallbackChild.on('exit', (code) => {
                    if (code === 0 || code === null) {
                      resolve()
                    } else {
                      reject(new Error(`Terminal failed to open with exit code: ${code}`))
                    }
                  })
                  fallbackChild.unref()
                })
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open terminal: ${error}`)
          })

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenInEditor: ({ taskId }) => {
        return Effect.gen(function* () {
          const task = yield* dbService.getTask(taskId)
          if (!task) {
            return yield* Effect.fail(`Task not found: ${taskId}`)
          }

          const project = yield* dbService.getProject(task.projectId)
          if (!project) {
            return yield* Effect.fail(`Project not found: ${task.projectId}`)
          }

          const pathToOpen =
            task.useWorktree && task.worktreeName
              ? path.join(getVibeDir(), 'worktrees', task.worktreeName)
              : project.path

          yield* Effect.tryPromise({
            try: () =>
              new Promise<void>((resolve, reject) => {
                const child = spawn('cursor', [pathToOpen], {
                  stdio: 'ignore',
                  detached: true
                })
                child.on('error', () => {
                  const fallbackChild = spawn('code', [pathToOpen], {
                    stdio: 'ignore',
                    detached: true
                  })
                  fallbackChild.on('error', reject)
                  fallbackChild.on('exit', (code) => {
                    if (code === 0 || code === null) {
                      resolve()
                    } else {
                      reject(new Error(`Editor failed to open with exit code: ${code}`))
                    }
                  })
                  fallbackChild.unref()
                })
                child.on('exit', (code) => {
                  if (code === 0 || code === null) {
                    resolve()
                  }
                })
                child.unref()
              }),
            catch: (error) => new Error(`Failed to open editor: ${error}`)
          })

          return true
        }).pipe(
          Effect.catchAll((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return Effect.fail(errorMessage)
          })
        )
      },

      OpenExternalLink: ({ url }) => {
        return Effect.tryPromise({
          try: () => shell.openExternal(url),
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return errorMessage
          }
        }).pipe(
          Effect.map(() => true),
          Effect.catchAll((error) => {
            return Effect.fail(String(error))
          })
        )
      },

      ExecuteQuery: ({ sql, params, method }) => {
        return Effect.tryPromise({
          try: async () => {
            const stmt = dbService.prepare(sql)
            const result = await stmt[method](...params)
            return { rows: toDrizzleResult(result, method) }
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return errorMessage
          }
        })
      },

      // System operations
      GetWebviewPreloadPath: () => {
        log.info('[RPC-HANDLER] 🔍 GetWebviewPreloadPath called')
        return Effect.sync(() => {
          const appPath = app.getAppPath()
          const isPackaged = app.isPackaged

          log.info('[RPC-HANDLER] 🔍 App path:', appPath)
          log.info('[RPC-HANDLER] 🔍 Is packaged:', isPackaged)

          if (isPackaged) {
            // In packaged app, construct path relative to app path
            // The build structure is: node_modules/@slide.code/preload/dist/webview-preload.mjs
            const webviewPath = path.join(
              appPath,
              'node_modules',
              '@slide.code',
              'preload',
              'dist',
              'webview-preload.mjs'
            )
            log.info('[RPC-HANDLER] 🔍 Packaged webview path:', webviewPath)
            return webviewPath
          } else {
            // In development, try to resolve normally first
            try {
              log.info('[RPC-HANDLER] 🔍 Attempting to resolve @slide.code/preload/webview-preload')
              const resolvedPath = resolve('@slide.code/preload/webview-preload')
              log.info('[RPC-HANDLER] 🔍 Resolved path:', resolvedPath)
              return resolvedPath
            } catch (error) {
              log.warn('[RPC-HANDLER] ⚠️ Failed to resolve webview-preload, trying fallback')
              // Fallback to build path
              const basePath = resolve('@slide.code/preload')
              const webviewPath = basePath.replace('/index.mjs', '/webview-preload.mjs')
              log.info('[RPC-HANDLER] 🔍 Fallback path:', webviewPath)
              return webviewPath
            }
          }
        }).pipe(
          Effect.catchAll((error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error('[RPC-HANDLER] ❌ Error in GetWebviewPreloadPath:', errorMessage)
            return Effect.fail(`Failed to resolve webview preload path: ${errorMessage}`)
          })
        )
      }
    }
  })
).pipe(Layer.provide(DatabaseService.Default), Layer.provide(PubSubClient.Default))
