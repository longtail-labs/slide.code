import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../drizzle/index.js'
import { eq } from 'drizzle-orm'
import { Project, projects, ProjectQueryKeys } from '@slide.code/schema'
import { Project as RpcProject } from '@slide.code/schema/requests'
import { useRpc } from '../../rpc/provider.js'

// Helper to get the pubsub client
// const getPubsub = () => PubsubClient.getInstance()

// Hook to list all projects
export const useProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ProjectQueryKeys.lists(),
    queryFn: async () => {
      console.log('[PROJECT-HELPERS] 📁 Fetching all projects')
      const result = await db.query.projects.findMany()
      console.log('[PROJECT-HELPERS] 📁 Projects fetched:', result)
      return result
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  })
}

// Hook to get a specific project
export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: ProjectQueryKeys.detail(projectId),
    queryFn: async () => {
      console.log('[PROJECT-HELPERS] 📁 Fetching project:', projectId)
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      })
      if (!project) {
        throw new Error(`Project with id ${projectId} not found`)
      }
      console.log('[PROJECT-HELPERS] 📁 Project fetched:', project)
      return project
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  })
}

// Hook to add a new project (with existing path)
export const useAddProject = () => {
  const queryClient = useQueryClient()

  return useMutation<Project, Error, { path: string }>({
    mutationFn: async (projectData: { path: string }) => {
      console.log('[PROJECT-HELPERS] ➕ Adding project:', projectData.path)
      // Node's path.basename is not available in renderer.
      // A simple split should work for most cases to extract name from path.
      const name = projectData.path.split(/[\\/]/).pop() || projectData.path
      const [newProject] = await db
        .insert(projects)
        .values({
          name,
          path: projectData.path
        })
        .returning()
      console.log('[PROJECT-HELPERS] ➕ Project added:', newProject.id)
      return newProject
    },
    onSuccess: async (newProject) => {
      console.log('[PROJECT-HELPERS] ✅ Project addition completed', newProject)
      // Invalidate and refetch projects list
      await queryClient.invalidateQueries({ queryKey: ProjectQueryKeys.lists() })

      // Broadcast invalidation to other processes
      // await pubsub.publish(createInvalidateQuery(projectQueryKeys.lists()))

      console.log('[PROJECT-HELPERS] ✅ Project addition completed and cache invalidated')
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
      console.log('[PROJECT-HELPERS] 🆕 Creating project:', projectData.name)
      const project = await runRpcProgram((client) => {
        return client.CreateProject(projectData)
      })
      console.log('[PROJECT-HELPERS] 🆕 Project created:', project.id)
      return project
    },
    onSuccess: async (newProject) => {
      console.log('[PROJECT-HELPERS] ✅ Project creation completed', newProject)
      // Invalidate and refetch projects list
      await queryClient.invalidateQueries({ queryKey: ProjectQueryKeys.lists() })

      // Note: RPC handler already broadcasts invalidation message via pubsub
      console.log('[PROJECT-HELPERS] ✅ Project creation completed and cache invalidated')
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
      console.log('[PROJECT-HELPERS] ✏️ Updating project:', updateData.projectId)
      const { projectId, ...updates } = updateData
      const [updatedProject] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, projectId))
        .returning()
      console.log('[PROJECT-HELPERS] ✏️ Project updated:', updatedProject.id)
      return updatedProject
    },
    onSuccess: async (updatedProject: Project) => {
      // Update the specific project in cache
      queryClient.setQueryData(ProjectQueryKeys.detail(updatedProject.id), updatedProject)

      // Invalidate projects list
      await queryClient.invalidateQueries({ queryKey: ProjectQueryKeys.lists() })

      console.log('[PROJECT-HELPERS] ✅ Project update completed and cache invalidated')
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
      console.log('[PROJECT-HELPERS] 🗑️ Deleting project:', projectId)
      await db.delete(projects).where(eq(projects.id, projectId))
      console.log('[PROJECT-HELPERS] 🗑️ Project deleted:', projectId)
      return projectId
    },
    onSuccess: async (deletedProjectId: string) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ProjectQueryKeys.detail(deletedProjectId) })

      // Invalidate projects list
      await queryClient.invalidateQueries({ queryKey: ProjectQueryKeys.lists() })

      console.log('[PROJECT-HELPERS] ✅ Project deletion completed and cache invalidated')
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

// TODO: The `ProjectFiles` RPC is a streaming endpoint which is not currently implemented.
// Commenting this out until it's ready.
// Hook to get project files
/*
export const useProjectFiles = (projectId: string) => {
  return useQuery({
    queryKey: [...projectQueryKeys.detail(projectId), 'files'],
    queryFn: async () => {
      console.log('[PROJECT-HELPERS] 📄 Fetching files for project:', projectId)

      try {
        // For now, return empty array - streaming implementation to be added later
        console.log('[PROJECT-HELPERS] 📄 ProjectFiles streaming implementation pending')
        return []
      } catch (error) {
        console.error('[PROJECT-HELPERS] ❌ Error fetching project files:', error)
        throw error
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  })
}
*/
