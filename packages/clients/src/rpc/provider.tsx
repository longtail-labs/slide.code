import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRpcClient } from './impl.js'
import { Effect } from 'effect'
import type * as RpcClient from '@effect/rpc/RpcClient'
import { SlideRpcs } from '@slide.code/schema/requests'

// Use the proper client type from SlideRpcs
type SlideRpcClient = RpcClient.FromGroup<typeof SlideRpcs>

// Define a properly typed context for the RPC client
interface RpcContextType {
  // Use the SlideRpcClient type directly
  runRpcProgram: <T>(effectFn: (client: SlideRpcClient) => Effect.Effect<T, any, any>) => Promise<T>
  isConnected: boolean
  isConnecting: boolean
  connectionError: Error | null
}

// Create the context with a null default value
const RpcContext = createContext<RpcContextType | null>(null)

// Provider component with proper React 19 typing
interface RpcProviderProps {
  children: ReactNode
}

export const RpcProvider = ({ children }: RpcProviderProps): React.JSX.Element => {
  const rpcClient = useRpcClient()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<Error | null>(null)

  // Initialize the connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        // Try to run a simple program to test the connection
        await rpcClient.runRpcProgram(() => Effect.succeed(null))
        setIsConnected(true)
        setConnectionError(null)
      } catch (error) {
        setConnectionError(error instanceof Error ? error : new Error('Unknown connection error'))
        console.error('RPC connection failed:', error)
      } finally {
        setIsConnecting(false)
      }
    }

    initConnection()
  }, [])

  // Create a wrapper for runRpcProgram that maintains the same behavior
  // but provides better typing to callers
  const typedRunRpcProgram = <T,>(
    effectFn: (client: SlideRpcClient) => Effect.Effect<T, any, any>
  ): Promise<T> => {
    return rpcClient.runRpcProgram((client) => {
      // Cast the client to the proper type
      return effectFn(client as unknown as SlideRpcClient) as any
    })
  }

  // Context value with the typed wrapper
  const contextValue: RpcContextType = {
    runRpcProgram: typedRunRpcProgram,
    isConnected,
    isConnecting,
    connectionError
  }

  return React.createElement(RpcContext.Provider, { value: contextValue }, children)
}

// Custom hook to use the RPC context
export const useRpc = () => {
  const context = useContext(RpcContext)
  if (!context) {
    throw new Error('useRpc must be used within an RpcProvider')
  }
  return context
}
