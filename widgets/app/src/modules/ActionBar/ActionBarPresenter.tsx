import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  IconPlayerPlayFilled,
  IconLinkPlus,
  IconFolder,
  IconPhoto,
  IconPaperclip,
  IconGitBranch,
  IconX,
  IconFile,
  IconFileText,
  IconCode,
  IconFileTypePdf,
  IconTrash
} from '@tabler/icons-react'
import type { Project, ClaudeModelId, FileAttachment } from '@slide.code/schema'
import { DEFAULT_MODEL } from '@slide.code/schema'
import { useSelectedProjectStore } from '../../stores/selectedProjectStore'
import { ModelPicker } from '@/components/ModelPicker'
import { useSelectFiles } from '@slide.code/clients'

export interface Suggestion {
  icon: string
  text: string
}

export interface ActionBarProps {
  onPlay: (details: {
    prompt: string
    projectId: string
    useWorktree?: boolean
    model?: ClaudeModelId
    permissionMode?: string
    attachments?: FileAttachment[]
  }) => void
  onSuggestionClick?: (suggestion: Suggestion) => void
  onCreateProject: (projectName: string) => Promise<Project>
  onSelectExistingProject?: () => Promise<string | null>
  onRemoveProject?: (projectId: string) => Promise<void>
  suggestions: Suggestion[]
  projects: Project[]
  isLoading?: boolean
  isCreatingProject?: boolean
  isAddingProject?: boolean
  isDeletingProject?: boolean
}

const ActionBarPresenter = ({
  onPlay,
  onCreateProject,
  onSelectExistingProject,
  onRemoveProject,
  projects,
  isLoading = false,
  isCreatingProject = false,
  isAddingProject = false,
  isDeletingProject = false
}: ActionBarProps) => {
  const [value, setValue] = useState('')
  const { selectedProjectId, setSelectedProjectId } = useSelectedProjectStore()
  const [attachmentType, setAttachmentType] = useState<'images' | 'project' | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false)
  const [newWorktreeBranch, setNewWorktreeBranch] = useState(false)
  const [createProjectError, setCreateProjectError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_MODEL)
  const [selectedAttachments, setSelectedAttachments] = useState<FileAttachment[]>([])
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectFiles = useSelectFiles()

  // Set default project when projects load
  useEffect(() => {
    console.log('[ActionBarPresenter] useEffect triggered:', {
      projectsCount: projects?.length,
      selectedProjectId,
      pendingProjectId,
      projects: projects?.map((p) => ({ id: p.id, name: p.name }))
    })

    if (projects && projects.length > 0) {
      // If we have a pending project ID, try to select it
      if (pendingProjectId) {
        const pendingProject = projects.find((p) => p.id === pendingProjectId)
        if (pendingProject) {
          console.log('[ActionBarPresenter] Setting pending project as selected:', pendingProject)
          setSelectedProjectId(pendingProjectId)
          setPendingProjectId(null) // Clear pending state
          return
        } else {
          console.log(
            '[ActionBarPresenter] Pending project not found yet in projects list:',
            pendingProjectId
          )
        }
      }

      // Check if the persisted project still exists in the current projects
      const persistedProjectExists =
        selectedProjectId && projects.some((p) => p.id === selectedProjectId)

      if (!selectedProjectId || !persistedProjectExists) {
        // If no persisted project or it doesn't exist anymore, use the first project
        console.log('[ActionBarPresenter] Setting first project as selected:', projects[0])
        setSelectedProjectId(projects[0].id)
      }
    }
  }, [projects, selectedProjectId, setSelectedProjectId, pendingProjectId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 300)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePlay()
    }
  }

  const handlePlay = () => {
    if (value.trim() && selectedProjectId) {
      const prompt = value.trim()

      onPlay({
        prompt,
        projectId: selectedProjectId,
        useWorktree: newWorktreeBranch,
        model: selectedModel,
        permissionMode: 'bypassPermissions',
        attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined
      })

      // Clear form after successful submission
      setValue('')
      setSelectedAttachments([])
    }
  }

  // const handlePlan = () => {
  //   if (value.trim() && selectedProjectId) {
  //     const prompt = value.trim()

  //     onPlay({
  //       prompt,
  //       projectId: selectedProjectId,
  //       useWorktree: newWorktreeBranch,
  //       model: selectedModel,
  //       permissionMode: 'plan',
  //       attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined
  //     })

  //     // Clear form after successful submission
  //     setValue('')
  //     setSelectedAttachments([])
  //   }
  // }

  const handleAttachFiles = async () => {
    try {
      const selectedFiles = await selectFiles.mutateAsync()
      if (selectedFiles && selectedFiles.length > 0) {
        setSelectedAttachments((prev) => [...prev, ...selectedFiles])
        setAttachmentType('images')
      }
    } catch (error) {
      console.error('Failed to select files:', error)
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileTypeIcon = (attachment: FileAttachment) => {
    const { fileType, mimeType } = attachment

    if (fileType === 'image' || mimeType.startsWith('image/')) {
      return <IconPhoto className="h-4 w-4 text-blue-600" />
    } else if (
      fileType === 'document' ||
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('document')
    ) {
      return <IconFileTypePdf className="h-4 w-4 text-red-600" />
    } else if (
      fileType === 'code' ||
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('python') ||
      mimeType.includes('java')
    ) {
      return <IconCode className="h-4 w-4 text-green-600" />
    } else if (fileType === 'text' || mimeType.includes('text/')) {
      return <IconFileText className="h-4 w-4 text-gray-600" />
    } else {
      return <IconFile className="h-4 w-4 text-gray-500" />
    }
  }

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      setCreateProjectError('Please enter a project name')
      return
    }

    try {
      setCreateProjectError(null) // Clear any previous errors
      const newProject = await onCreateProject(newProjectName.trim())

      // Set the pending project ID so it gets selected when it appears in the projects list
      setPendingProjectId(newProject.id)
      console.log('[ActionBarPresenter] Project created, set as pending for selection:', newProject)

      setNewProjectName('')
      setIsNewProjectDialogOpen(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setCreateProjectError(errorMessage)
    }
  }

  const handleSelectProject = async (projectId: string) => {
    if (projectId === 'new') {
      setIsNewProjectDialogOpen(true)
      setCreateProjectError(null) // Clear any previous errors
    } else if (projectId === 'select') {
      // Use the new Electron dialog-based directory selection
      if (onSelectExistingProject) {
        try {
          const newProjectId = await onSelectExistingProject()
          if (newProjectId) {
            // Set the pending project ID so it gets selected when it appears in the projects list
            setPendingProjectId(newProjectId)
            console.log(
              '[ActionBarPresenter] Project selected, set as pending for selection:',
              newProjectId
            )
          }
        } catch (error) {
          console.error('Failed to select project:', error)
        }
      }
    } else {
      setSelectedProjectId(projectId)
      setAttachmentType('project')
    }
  }

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (projectToDelete && onRemoveProject) {
      try {
        // If we're deleting the currently selected project, reset selection
        if (selectedProjectId === projectToDelete.id) {
          const remainingProjects = projects.filter(p => p.id !== projectToDelete.id)
          if (remainingProjects.length > 0) {
            setSelectedProjectId(remainingProjects[0].id)
          } else {
            setSelectedProjectId('')
          }
        }
        
        await onRemoveProject(projectToDelete.id)
        setIsDeleteDialogOpen(false)
        setProjectToDelete(null)
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    }
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="relative border rounded-xl shadow-sm overflow-hidden">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe a task"
        className="min-h-[56px] max-h-[200px] overflow-y-auto font-recursive w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        rows={1}
        disabled={isLoading}
      />

      {/* File attachments preview */}
      {selectedAttachments.length > 0 && (
        <div className="border-t bg-gray-50/50 p-3">
          <div className="flex flex-wrap gap-2">
            {selectedAttachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm border"
              >
                {getFileTypeIcon(attachment)}
                <div className="flex flex-col">
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {attachment.fileName}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-100"
                  onClick={() => handleRemoveAttachment(index)}
                >
                  <IconX className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-2 border-t">
        <div className="flex items-center gap-2">
          {/* Project Selector */}
          <Select value={selectedProjectId || ''} onValueChange={handleSelectProject} open={isSelectOpen} onOpenChange={setIsSelectOpen}>
            <SelectTrigger className="w-[200px] h-8 border-gray-200 hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <IconFolder className="h-4 w-4" />
                {selectedProjectData ? (
                  <span className="font-medium truncate">{selectedProjectData.name}</span>
                ) : (
                  <SelectValue placeholder="Select project" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="w-[280px] max-h-[300px]">
              <div className="max-h-[200px] overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="relative flex items-center w-full px-2 py-1.5 cursor-pointer hover:bg-gray-100 group border-l-2 border-transparent hover:border-gray-300"
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setAttachmentType('project')
                      setIsSelectOpen(false)
                    }}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                      <span className="font-medium truncate">{project.name}</span>
                      <span className="text-[10px] text-gray-400 truncate leading-tight">
                        {project.path}
                      </span>
                    </div>
                    {onRemoveProject && (
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 hover:border hover:border-red-200 transition-all duration-200 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleDeleteProject(project)
                          }}
                          disabled={isDeletingProject}
                          title={`Remove ${project.name}`}
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t bg-gray-50/50 sticky bottom-0">
                <SelectItem value="select" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <IconFolder className="h-4 w-4" />
                    <span className="font-medium">Select New Project</span>
                  </div>
                </SelectItem>
                <SelectItem value="new" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">+</span>
                    <span className="font-medium">Create New Project</span>
                  </div>
                </SelectItem>
              </div>
            </SelectContent>
          </Select>

          {/* Model Picker */}
          <ModelPicker
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={isLoading}
            className="border-gray-200 hover:bg-gray-50"
          />

          {/* Attach Files Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 hover:bg-gray-100"
            disabled={isLoading || selectFiles.isPending}
            onClick={handleAttachFiles}
          >
            <IconPaperclip className="h-4 w-4" />
            <span className="font-medium">{selectFiles.isPending ? 'Selecting...' : 'Attach'}</span>
            {selectedAttachments.length > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {selectedAttachments.length}
              </span>
            )}
          </Button>

          {/* New Worktree Branch Checkbox */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative inline-block">
                  <Label
                    htmlFor="worktree-checkbox"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed opacity-30 pointer-events-none"
                  >
                    <Checkbox
                      id="worktree-checkbox"
                      checked={false}
                      onCheckedChange={() => {}}
                      disabled={true}
                      className="data-[state=checked]:border-[#CB661C] data-[state=checked]:bg-[#CB661C] data-[state=checked]:text-white"
                    />
                    <IconGitBranch className="h-4 w-4" />
                    <span className="font-medium text-sm">New Worktree branch</span>
                  </Label>
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This feature is coming soon! It will create a separate worktree branch so you can
                  run multiple agents on the same codebase without interfering
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {/* <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            disabled={!value || isLoading}
            // onClick={handlePlan}
          >
            Plan
          </Button> */}
          <Button
            size="sm"
            className="h-8 w-8 rounded-full p-0 bg-black hover:bg-gray-800"
            disabled={!value || isLoading}
            onClick={handlePlay}
          >
            <IconPlayerPlayFilled size={16} className="text-white" />
          </Button>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog
        open={isNewProjectDialogOpen}
        onOpenChange={(open) => {
          setIsNewProjectDialogOpen(open)
          if (!open) {
            setCreateProjectError(null) // Clear error when dialog closes
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project. This will create a folder for a new project to work
              in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => {
                  setNewProjectName(e.target.value)
                  setCreateProjectError(null) // Clear error when user starts typing
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    newProjectName.trim() &&
                    !isCreatingProject &&
                    !createProjectError
                  ) {
                    e.preventDefault()
                    handleCreateNewProject()
                  }
                }}
                placeholder="My Awesome Project"
                className="w-full"
              />
              {createProjectError && (
                <p className="text-sm text-red-600 mt-1">{createProjectError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewProjectDialogOpen(false)
                setCreateProjectError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewProject}
              disabled={!newProjectName.trim() || isCreatingProject || !!createProjectError}
            >
              {isCreatingProject ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setProjectToDelete(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{projectToDelete?.name}" from Slide Code? This will only remove it from the project list - your files will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setProjectToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? 'Removing...' : 'Remove Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ActionBarPresenter
