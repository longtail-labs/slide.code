import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../drizzle/index.js'
import { eq } from 'drizzle-orm'
import { Project, projects, QueryKeys, FileAttachment } from '@slide.code/schema'
import { Project as RpcProject } from '@slide.code/schema/requests'
import { useRpc } from '../../rpc/provider.js'

// Hook to list all projects
export const useProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: QueryKeys.projects(),
    queryFn: async () => {
      const result = await db.query.projects.findMany()
      return result
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  })
}

// Hook to get a specific project
export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: QueryKeys.project(projectId),
    queryFn: async () => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      })
      if (!project) {
        throw new Error(`Project with id ${projectId} not found`)
      }
      return project
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  })
}

// Hook to select project directory using Electron dialog
export const useSelectProjectDirectory = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<string | null, Error, void>({
    mutationFn: async () => {
      const selectedPath = await runRpcProgram((client) => {
        return client.SelectProjectDirectory()
      })
      return selectedPath
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error selecting directory:', error)
    }
  })
}

// Hook to select files using Electron dialog (supports all file types including images)
export const useSelectFiles = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<readonly FileAttachment[] | null, Error, void>({
    mutationFn: async () => {
      const selectedFiles = await runRpcProgram((client) => {
        return client.SelectFiles()
      })
      return selectedFiles
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error selecting files:', error)
    }
  })
}

// Hook to add a new project (with existing path)
export const useAddProject = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<RpcProject, Error, { path: string }>({
    mutationFn: async (projectData: { path: string }) => {
      const newProject = await runRpcProgram((client) => {
        return client.AddProject({ path: projectData.path })
      })
      return newProject
    },
    onSuccess: async () => {
      // Invalidate and refetch projects list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.projects() })

      // Note: RPC handler already broadcasts invalidation message via pubsub
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error adding project:', error)
    }
  })
}

// Hook to create a new project (with just a name)
// Uses RPC to create project directory, initialize git, and save to database
export const useCreateProject = () => {
  const queryClient = useQueryClient()
  const { runRpcProgram } = useRpc()

  return useMutation<RpcProject, Error, { name: string }>({
    mutationFn: async (projectData: { name: string }) => {
      const project = await runRpcProgram((client) => {
        return client.CreateProject(projectData)
      })
      return project
    },
    onSuccess: async () => {
      // Invalidate and refetch projects list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.projects() })

      // Note: RPC handler already broadcasts invalidation message via pubsub
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error creating project:', error)
    }
  })
}

// Hook to update a project
export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateData: { projectId: string; name?: string; path?: string }) => {
      const { projectId, ...updates } = updateData
      const [updatedProject] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, projectId))
        .returning()
      return updatedProject
    },
    onSuccess: async (updatedProject: Project) => {
      // Update the specific project in cache
      queryClient.setQueryData(QueryKeys.project(updatedProject.id), updatedProject)

      // Invalidate projects list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.projects() })
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error updating project:', error)
    }
  })
}

// Hook to delete a project
export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      await db.delete(projects).where(eq(projects.id, projectId))
      return projectId
    },
    onSuccess: async (deletedProjectId: string) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QueryKeys.project(deletedProjectId) })

      // Invalidate projects list
      await queryClient.invalidateQueries({ queryKey: QueryKeys.projects() })
    },
    onError: (error) => {
      console.error('[PROJECT-HELPERS] ❌ Error deleting project:', error)
    }
  })
}

// Helper function to get project statistics
export const getProjectStats = (projects: Project[]) => {
  return {
    total: projects.length
  }
}
