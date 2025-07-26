import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useStartTask,
  useProjects,
  useCreateProject,
  useAddProject,
  useSelectProjectDirectory,
  useDeleteProject
} from '@slide.code/clients'
import { FileAttachment } from '@slide.code/schema'
import ActionBarPresenter from './ActionBarPresenter'
import { toast } from 'sonner'

interface ActionBarProps {
  onTaskStart?: (taskId: string) => void
  onShow?: () => void
}

export const ActionBar: React.FC<ActionBarProps> = ({ onTaskStart, onShow }) => {
  const queryClient = useQueryClient()
  const startTaskMutation = useStartTask()
  const createProjectMutation = useCreateProject()
  const addProjectMutation = useAddProject()
  const selectDirectoryMutation = useSelectProjectDirectory()
  const deleteProjectMutation = useDeleteProject()
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects()

  const handlePlay = async (details: {
    prompt: string
    projectId: string
    useWorktree?: boolean
    model?: string
    permissionMode?: string
    attachments?: FileAttachment[]
  }) => {
    try {
      console.log('[ActionBar] Starting task with:', details)

      const taskId = await startTaskMutation.mutateAsync({
        projectId: details.projectId,
        prompt: details.prompt,
        useWorktree: details.useWorktree,
        model: details.model,
        permissionMode: details.permissionMode,
        attachments: details.attachments
      })

      console.log('[ActionBar] Task started:', taskId)
      onTaskStart?.(taskId)
      toast.success('Task started successfully!')
    } catch (error) {
      console.error('[ActionBar] Error starting task:', error)
      toast.error('Failed to start task')
    }
  }

  const handleCreateProject = async (projectName: string) => {
    try {
      console.log('[ActionBar] Creating project:', projectName)
      const newProject = await createProjectMutation.mutateAsync({ name: projectName })

      // Invalidate and refetch projects query to ensure new project appears in the list
      await queryClient.invalidateQueries({ queryKey: ['projects'] })

      toast.success(`Project "${projectName}" created successfully!`)
      console.log('[ActionBar] Project created and queries invalidated:', newProject)

      return newProject
    } catch (error) {
      console.error('[ActionBar] Error creating project:', error)
      toast.error('Failed to create project')
      throw error
    }
  }

  const handleSelectExistingProject = async (): Promise<string | null> => {
    try {
      console.log('[ActionBar] Opening directory selection dialog...')
      const selectedPath = await selectDirectoryMutation.mutateAsync()

      if (!selectedPath) {
        console.log('[ActionBar] Directory selection cancelled')
        return null
      }

      console.log('[ActionBar] Selected project path:', selectedPath)
      const rpcProject = await addProjectMutation.mutateAsync({ path: selectedPath })

      // Invalidate and refetch projects query to ensure new project appears in the list
      await queryClient.invalidateQueries({ queryKey: ['projects'] })

      toast.success(`Project "${rpcProject.name}" added successfully!`)
      console.log('[ActionBar] Project added and queries invalidated:', rpcProject)

      return rpcProject.id
    } catch (error) {
      console.error('[ActionBar] Failed to select or add project:', error)
      toast.error('Failed to add project')
      return null
    }
  }

  const handleRemoveProject = async (projectId: string): Promise<void> => {
    try {
      console.log('[ActionBar] Removing project:', projectId)
      await deleteProjectMutation.mutateAsync(projectId)

      // Invalidate and refetch projects query to ensure deleted project is removed from the list
      await queryClient.invalidateQueries({ queryKey: ['projects'] })

      toast.success('Project removed successfully!')
      console.log('[ActionBar] Project removed and queries invalidated:', projectId)
    } catch (error) {
      console.error('[ActionBar] Error removing project:', error)
      toast.error('Failed to remove project')
      throw error
    }
  }

  return (
    <ActionBarPresenter
      onPlay={handlePlay}
      onCreateProject={handleCreateProject}
      onSelectExistingProject={handleSelectExistingProject}
      onRemoveProject={handleRemoveProject}
      projects={projects}
      suggestions={[]}
      isLoading={isLoadingProjects || startTaskMutation.isPending}
      isCreatingProject={createProjectMutation.isPending}
      isAddingProject={addProjectMutation.isPending || selectDirectoryMutation.isPending}
      isDeletingProject={deleteProjectMutation.isPending}
    />
  )
}

export default ActionBar
