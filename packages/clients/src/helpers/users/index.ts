import { useQuery } from '@tanstack/react-query'
import { useRpc } from '../../rpc/provider.js'
import { Stream, Chunk } from 'effect'

/**
 * Hook for listing all users
 */
export const useUsers = () => {
  const { runRpcProgram, isConnected } = useRpc()

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Using the client with proper typing
      const usersChunk = await runRpcProgram((client) => {
        return Stream.runCollect(client.UserList())
      })

      return Chunk.toArray(usersChunk)
    },
    enabled: isConnected
  })
}

/**
 * Hook for getting a single user by ID
 */
export const useUser = (id: string) => {
  const { runRpcProgram, isConnected } = useRpc()

  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      return await runRpcProgram((client) => {
        return client.UserById({ id })
      })
    },
    enabled: Boolean(id) && isConnected
  })
}
