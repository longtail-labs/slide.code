import React, { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useFilePicker } from 'use-file-picker'
import ActionBarPresenter from './ActionBarPresenter'
import { useStartTask, useProjects, useAddProject, useCreateProject } from '@slide.code/clients'
import type { Project } from '@slide.code/schema'

const ActionBar = () => {
  const navigate = useNavigate()
  const startTaskMutation = useStartTask()
  const addProjectMutation = useAddProject()
  const createProjectMutation = useCreateProject()
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects()
  const resolveRef = useRef<((value: string | null) => void) | null>(null)

  const { openFilePicker } = useFilePicker({
    readAs: 'DataURL',
    multiple: false,
    directory: true,
    onFilesSuccessfullySelected: async ({ plainFiles }) => {
      if (resolveRef.current) {
        const file = plainFiles[0] as File & { path: string }
        if (file && file.path) {
          try {
            console.log('Selected project path:', file.path)
            const newProject = await addProjectMutation.mutateAsync({ path: file.path })
            resolveRef.current(newProject.id)
          } catch (error) {
            console.error('Failed to add project:', error)
            resolveRef.current(null)
          }
        } else {
          console.warn('Could not determine directory path from selection.')
          resolveRef.current(null)
        }
        resolveRef.current = null
      }
    },
    onFilesRejected: () => {
      if (resolveRef.current) {
        console.log('File selection was rejected.')
        resolveRef.current(null)
        resolveRef.current = null
      }
    }
  })

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
          onSuccess: (newProject) => {
            console.log('Project created:', newProject)
            resolve(newProject)
          },
          onError: (error) => {
            console.error('Failed to create project:', error)
            reject(error)
          }
        }
      )
    })
  }

  const handleSelectExistingProject = (): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      openFilePicker()
    })
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
      isAddingProject={addProjectMutation.isPending}
    />
  )
}

export default ActionBar
