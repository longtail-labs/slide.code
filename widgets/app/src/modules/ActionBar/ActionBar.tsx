import React, { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import ActionBarPresenter from './ActionBarPresenter'
import { useStartTask, useProjects, useAddProject, useCreateProject, useSelectProjectDirectory } from '@slide.code/clients'
import type { Project } from '@slide.code/schema'

const ActionBar = () => {
  const navigate = useNavigate()
  const startTaskMutation = useStartTask()
  const addProjectMutation = useAddProject()
  const createProjectMutation = useCreateProject()
  const selectDirectoryMutation = useSelectProjectDirectory()
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects()

  const handlePlay = async (details: {
    prompt: string
    projectId: string
    useWorktree?: boolean
  }) => {
    console.log('handlePlay called with:', details)

    const taskData = {
      prompt: details.prompt,
      projectId: details.projectId,
      useWorktree: details.useWorktree
    }

    startTaskMutation.mutate(taskData, {
      onSuccess: (taskId: string) => {
        console.log('Started new task:', taskId)
        const fakeObjectId = 'object-' + Date.now()
        navigate({
          to: '/working/$taskId',
          params: { taskId },
          search: { openObjectIds: [fakeObjectId], activeObjectId: fakeObjectId }
        })
      },
      onError: (error: Error) => {
        console.error('Failed to start task:', error)
      }
    })
  }

  const handleCreateProject = async (projectName: string): Promise<Project> => {
    console.log('Creating project with name:', projectName)

    return new Promise<Project>((resolve, reject) => {
      createProjectMutation.mutate(
        { name: projectName },
        {
          onSuccess: (rpcProject) => {
            console.log('Project created:', rpcProject)
            // Convert RPC Project to database Project format
            const dbProject: Project = {
              id: rpcProject.id,
              name: rpcProject.name,
              path: rpcProject.path,
              createdAt: rpcProject.createdAt.toISOString(),
              updatedAt: rpcProject.updatedAt.toISOString()
            }
            resolve(dbProject)
          },
          onError: (error) => {
            console.error('Failed to create project:', error)
            reject(error)
          }
        }
      )
    })
  }

  const handleSelectExistingProject = async (): Promise<string | null> => {
    try {
      console.log('Opening directory selection dialog...')
      const selectedPath = await selectDirectoryMutation.mutateAsync()
      
      if (!selectedPath) {
        console.log('Directory selection cancelled')
        return null
      }

      console.log('Selected project path:', selectedPath)
      const rpcProject = await addProjectMutation.mutateAsync({ path: selectedPath })
      return rpcProject.id
    } catch (error) {
      console.error('Failed to select or add project:', error)
      return null
    }
  }

  return (
    <ActionBarPresenter
      onPlay={handlePlay}
      onCreateProject={handleCreateProject}
      onSelectExistingProject={handleSelectExistingProject}
      projects={projects}
      suggestions={[]}
      isLoading={startTaskMutation.isPending || isLoadingProjects}
      isCreatingProject={createProjectMutation.isPending}
      isAddingProject={addProjectMutation.isPending || selectDirectoryMutation.isPending}
    />
  )
}

export default ActionBar
