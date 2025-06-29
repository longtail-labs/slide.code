import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ActionBar } from '@/modules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  useRpc,
  PubsubClient,
  type Subscription,
  useAppReadyRef,
  useUsers,
  useUser
} from '@slide.code/clients'
import { Effect } from 'effect'
import { useQueryClient } from '@tanstack/react-query'

// Helper to get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// Initialize the PubSub client
const pubsubClient = PubsubClient.getInstance()

const PlanningMode: React.FC = () => {
  // State for component
  const [messages, setMessages] = useState<Array<{ id: number; type: string; data: any }>>([])
  const [messageCount, setMessageCount] = useState(0)
  const [windowTitle, setWindowTitle] = useState('')
  const [queryKeyInput, setQueryKeyInput] = useState('test-query')
  const [queryInvalidationCount, setQueryInvalidationCount] = useState(0)
  const [lastInvalidationFrom, setLastInvalidationFrom] = useState<'local' | 'remote' | null>(null)
  const [userIdInput, setUserIdInput] = useState('1')

  // RPC hook
  const { isConnected, isConnecting, connectionError } = useRpc()

  // IPCRef hook for app ready state
  const [appReady, setAppReady] = useAppReadyRef()

  // RPC queries for users
  const usersQuery = useUsers()
  const userQuery = useUser(userIdInput)

  useEffect(() => {
    if (userQuery.error) {
      console.error(
        `[PLANNING-SCREEN] ❌ useUser query failed for ID ${userIdInput}:`,
        getErrorMessage(userQuery.error)
      )
    }
    if (userQuery.data) {
      console.log(
        `[PLANNING-SCREEN] ✅ useUser query success for ID ${userIdInput}:`,
        userQuery.data
      )
    }
  }, [userQuery.error, userQuery.data, userIdInput])

  useEffect(() => {
    if (usersQuery.error) {
      console.error(
        '[PLANNING-SCREEN] ❌ useUsers query failed:',
        getErrorMessage(usersQuery.error)
      )
    }
    if (usersQuery.data) {
      console.log('[PLANNING-SCREEN] ✅ useUsers query success:', usersQuery.data)
    }
  }, [usersQuery.error, usersQuery.data])

  // Log app ready state changes
  useEffect(() => {
    console.log('[PLANNING-SCREEN] 📊 App Ready state changed:', {
      isReady: appReady?.isReady,
      error: appReady?.error,
      timestamp: appReady?.timestamp,
      fullState: appReady
    })
  }, [appReady])

  // TanStack Query client for testing invalidation
  const queryClient = useQueryClient()

  // Animation variants
  const variants = {
    initial: { scale: 0.95, opacity: 0.5 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.1 } },
    exit: { scale: 0.95, opacity: 0, transition: { duration: 0.1 } }
  }

  // Helper function to add messages
  const addMessage = (type: string, data: any) => {
    const newMessage = { id: messageCount, type, data }
    console.log('[PLANNING-SCREEN] 📥 Adding message to log:', {
      id: messageCount,
      type: type,
      timestamp: Date.now(),
      data: data
    })
    setMessages((prev) => [...prev.slice(-9), newMessage]) // Keep last 10 messages
    setMessageCount((prev) => prev + 1)
  }

  // Test PubSub functionality
  const testPubSub = () => {
    // Test publishing a window title change
    const newTitle = windowTitle || `Test Title ${Date.now()}`
    console.log('[PLANNING-SCREEN] 📢 Testing PubSub - publishing window title:', newTitle)
    pubsubClient.setWindowTitle(newTitle)
    addMessage('PUBSUB_PUBLISH', { action: 'setWindowTitle', title: newTitle })
  }

  // Test IPCRef functionality
  const testIPCRef = () => {
    console.log('[PLANNING-SCREEN] 📊 Testing IPCRef - toggling app ready state')
    if (setAppReady) {
      const newState = {
        isReady: !appReady?.isReady,
        error: appReady?.isReady ? 'Test error state' : null,
        timestamp: Date.now()
      }
      console.log('[PLANNING-SCREEN] 📊 Setting new app ready state:', newState)
      setAppReady(newState)
      addMessage('IPCREF_UPDATE', newState)
    } else {
      console.warn('[PLANNING-SCREEN] ❌ setAppReady is not available')
    }
  }

  // Test query invalidation functionality
  const testQueryInvalidation = async () => {
    const queryKey = [queryKeyInput]

    try {
      // Test local invalidation
      console.log('[PLANNING-SCREEN] 🔄 Testing local query invalidation')
      queryClient.invalidateQueries({ queryKey })
      setQueryInvalidationCount((prev) => prev + 1)
      setLastInvalidationFrom('local')
      addMessage('QUERY_INVALIDATE_LOCAL', { queryKey })

      // Test remote invalidation through PubSub
      console.log('[PLANNING-SCREEN] 🔄 Testing remote query invalidation via PubSub')
      if (queryClient.invalidateQueriesRemote) {
        await queryClient.invalidateQueriesRemote(queryKey)
        addMessage('QUERY_INVALIDATE_REMOTE', { queryKey })
      } else {
        // Fallback to direct PubSub message
        pubsubClient.invalidateQuery(queryKey)
        addMessage('QUERY_INVALIDATE_PUBSUB', { queryKey })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown invalidation error'
      console.error('[PLANNING-SCREEN] ❌ Query invalidation error:', error)
      addMessage('QUERY_INVALIDATE_ERROR', { error: errorMessage })
    }
  }

  // Set up PubSub subscriptions
  useEffect(() => {
    console.log('[PLANNING-SCREEN] 📡 Setting up PubSub subscriptions')
    const subscriptions: Subscription[] = []

    // Subscribe to various message types
    const messageTypes = [
      'SetWindowTitle',
      'ShowUpdateDialog',
      'Quit',
      'GetAppInfo',
      'InvalidateQuery'
    ] as const

    messageTypes.forEach((type) => {
      try {
        console.log(`[PLANNING-SCREEN] 📡 Subscribing to message type: ${type}`)
        const subscription = pubsubClient.subscribe(type, {
          onData: (message: any) => {
            console.log(`[PLANNING-SCREEN] 📥 Received ${type} message:`, {
              type: type,
              timestamp: Date.now(),
              message: message
            })
            console.log(
              `[PLANNING-SCREEN] 📥 Full ${type} message:`,
              JSON.stringify(message, null, 2)
            )

            // Special handling for InvalidateQuery messages
            if (type === 'InvalidateQuery') {
              console.log('[PLANNING-SCREEN] 🔄 Processing query invalidation from main process')
              setQueryInvalidationCount((prev) => prev + 1)
              setLastInvalidationFrom('remote')

              // The TanStack Query listener should automatically handle this,
              // but we'll track it here for demonstration
              if (message.queryKey) {
                console.log(
                  '[PLANNING-SCREEN] 🔄 Main process requested invalidation of:',
                  message.queryKey
                )
              }
            }

            addMessage(`PUBSUB_RECEIVED_${type}`, message)
          },
          onError: (error: any) => {
            console.error(`[PLANNING-SCREEN] ❌ Error in ${type} subscription:`, error)
            addMessage(`PUBSUB_ERROR_${type}`, { error: String(error) })
          }
        })
        subscriptions.push(subscription)
        console.log(`[PLANNING-SCREEN] ✅ Successfully subscribed to ${type}`)
      } catch (error) {
        console.error(`[PLANNING-SCREEN] ❌ Failed to subscribe to ${type}:`, error)
      }
    })

    console.log(`[PLANNING-SCREEN] 📡 Set up ${subscriptions.length} PubSub subscriptions`)

    // Cleanup subscriptions
    return () => {
      console.log('[PLANNING-SCREEN] 🧹 Cleaning up PubSub subscriptions')
      subscriptions.forEach((sub) => sub.unsubscribe())
    }
  }, [])

  // Test automatic message publishing
  useEffect(() => {
    const timer = setTimeout(() => {
      pubsubClient.requestAppInfo(true)
      addMessage('AUTO_PUBSUB', { action: 'requestAppInfo' })
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden bg-background"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Communication Systems Test</h1>
          <p className="text-muted-foreground">Testing RPC, PubSub, and IPCRef integration</p>
        </div>

        {/* System Status Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* RPC Status */}
          <Card>
            <CardHeader>
              <CardTitle>RPC System</CardTitle>
              <CardDescription>Effect RPC with tanstack-query</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div
                  className={`p-2 rounded text-sm ${
                    isConnected
                      ? 'bg-green-100 text-green-800'
                      : isConnecting
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  Status:{' '}
                  {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
                </div>
                {connectionError && (
                  <div className="p-2 rounded text-sm bg-red-100 text-red-800">
                    Error: {connectionError.message}
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold text-sm mb-2">Fetch All Users (UserList)</h4>
                  {usersQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  )}
                  {usersQuery.isSuccess && (
                    <p className="text-sm text-green-600">Success! Check console for data.</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-sm mb-2">Fetch User by ID (UserById)</h4>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="User ID (e.g., 1)"
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                    />
                  </div>
                  {userQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading user...</p>
                  )}
                  {userQuery.isSuccess && (
                    <p className="text-sm text-green-600">Success! Check console for data.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PubSub Status */}
          <Card>
            <CardHeader>
              <CardTitle>PubSub System</CardTitle>
              <CardDescription>IPC Pub/Sub Messaging</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-2 rounded text-sm bg-green-100 text-green-800">Status: Ready</div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Window title"
                    value={windowTitle}
                    onChange={(e) => setWindowTitle(e.target.value)}
                  />
                </div>
                <Button onClick={testPubSub} className="w-full">
                  Test PubSub
                </Button>
                <Button
                  onClick={() => pubsubClient.showUpdateDialog()}
                  variant="outline"
                  className="w-full"
                >
                  Show Update Dialog
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* IPCRef Status */}
          <Card>
            <CardHeader>
              <CardTitle>IPCRef System</CardTitle>
              <CardDescription>Reactive State Management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div
                  className={`p-2 rounded text-sm ${
                    appReady?.isReady
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  App Ready: {appReady?.isReady ? 'Yes' : 'No'}
                </div>
                {appReady?.error && (
                  <div className="p-2 rounded text-sm bg-red-100 text-red-800">
                    Error: {appReady.error}
                  </div>
                )}
                <Button onClick={testIPCRef} className="w-full">
                  Toggle App State
                </Button>
                <div className="text-xs text-muted-foreground">
                  Last update:{' '}
                  {appReady?.timestamp
                    ? new Date(appReady.timestamp).toLocaleTimeString()
                    : 'Never'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Query Invalidation Test */}
        <Card>
          <CardHeader>
            <CardTitle>Query Invalidation Test</CardTitle>
            <CardDescription>Test TanStack Query invalidation through PubSub</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Query Invalidation Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{queryInvalidationCount}</div>
                  <div className="text-sm text-muted-foreground">Total Invalidations</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      lastInvalidationFrom === 'local'
                        ? 'text-green-600'
                        : lastInvalidationFrom === 'remote'
                          ? 'text-purple-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {lastInvalidationFrom === 'local'
                      ? 'LOCAL'
                      : lastInvalidationFrom === 'remote'
                        ? 'REMOTE'
                        : 'NONE'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Source</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {messages.filter((m) => m.type.includes('INVALIDATE')).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Messages Logged</div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Query key"
                  value={queryKeyInput}
                  onChange={(e) => setQueryKeyInput(e.target.value)}
                />
                <Button onClick={testQueryInvalidation}>Invalidate Query</Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  🔵 <strong>Local:</strong> Invalidation triggered from this renderer
                </p>
                <p>
                  🟣 <strong>Remote:</strong> Invalidation triggered from main process via PubSub
                </p>
                <p>
                  📡 The main process will automatically send periodic invalidations every 15
                  seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Action Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Action Bar Component</CardTitle>
            <CardDescription>Original component integration</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionBar />
          </CardContent>
        </Card>

        <Separator />

        {/* Message Log */}
        <Card>
          <CardHeader>
            <CardTitle>Message Log</CardTitle>
            <CardDescription>Real-time communication events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet... Try testing the systems above.
                </div>
              ) : (
                messages
                  .slice()
                  .reverse()
                  .map((message) => (
                    <div key={message.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {message.type}
                        </span>
                        <span className="text-xs text-muted-foreground">#{message.id}</span>
                      </div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test All Systems Button */}
        <div className="text-center">
          <Button
            onClick={() => {
              usersQuery.refetch()
              userQuery.refetch()
              testPubSub()
              testIPCRef()
              testQueryInvalidation()
            }}
            size="lg"
            className="px-8"
          >
            Test All Systems
          </Button>
        </div>
      </main>
    </motion.div>
  )
}

export default PlanningMode
