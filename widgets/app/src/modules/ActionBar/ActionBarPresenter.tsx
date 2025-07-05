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
  IconGitBranch
} from '@tabler/icons-react'
import type { Project } from '@slide.code/schema'
import { useSelectedProjectStore } from '../../stores/selectedProjectStore'

export interface Suggestion {
  icon: string
  text: string
}

export interface ActionBarProps {
  onPlay: (details: { prompt: string; projectId: string; useWorktree?: boolean }) => void
  onSuggestionClick?: (suggestion: Suggestion) => void
  onCreateProject: (projectName: string) => Promise<Project>
  onSelectExistingProject?: () => Promise<string | null>
  suggestions: Suggestion[]
  projects: Project[]
  isLoading?: boolean
  isCreatingProject?: boolean
  isAddingProject?: boolean
}

const ActionBarPresenter = ({
  onPlay,
  onCreateProject,
  onSelectExistingProject,
  projects,
  isLoading = false,
  isCreatingProject = false,
  isAddingProject = false
}: ActionBarProps) => {
  const [value, setValue] = useState('')
  const { selectedProjectId, setSelectedProjectId } = useSelectedProjectStore()
  const [attachmentType, setAttachmentType] = useState<'images' | 'project' | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false)
  const [newWorktreeBranch, setNewWorktreeBranch] = useState(false)
  const [createProjectError, setCreateProjectError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Set default project when projects load
  useEffect(() => {
    if (projects.length > 0) {
      // Check if the persisted project still exists in the current projects
      const persistedProjectExists =
        selectedProjectId && projects.some((p) => p.id === selectedProjectId)

      if (!selectedProjectId || !persistedProjectExists) {
        // If no persisted project or it doesn't exist anymore, use the first project
        setSelectedProjectId(projects[0].id)
      }
    }
  }, [projects, selectedProjectId, setSelectedProjectId])

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
        useWorktree: newWorktreeBranch
      })
    }
  }

  const handleAttachImages = () => {
    // This would open a file picker for images
    console.log('Opening image picker...')
    setAttachmentType('images')
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
            setSelectedProjectId(newProjectId)
            setAttachmentType('project')
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

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      setCreateProjectError('Please enter a project name')
      return
    }

    try {
      setCreateProjectError(null) // Clear any previous errors
      const newProject = await onCreateProject(newProjectName.trim())
      if (newProject) {
        setSelectedProjectId(newProject.id)
      }
      setNewProjectName('')
      setIsNewProjectDialogOpen(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setCreateProjectError(errorMessage)
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

      <div className="flex items-center justify-between p-2 border-t">
        <div className="flex items-center gap-2">
          {/* Project Selector */}
          <Select value={selectedProjectId || ''} onValueChange={handleSelectProject}>
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
                  <SelectItem key={project.id} value={project.id} className="cursor-pointer">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-[10px] text-gray-400 truncate leading-tight">
                        {project.path}
                      </span>
                    </div>
                  </SelectItem>
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

          {/* Attach Images Button - Commented out for now */}
          {/*
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 hover:bg-gray-100"
            disabled={isLoading}
            onClick={handleAttachImages}
          >
            <IconPhoto className="h-4 w-4" />
            <span className="font-medium">Attach</span>
          </Button>
          */}

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
    </div>
  )
}

export default ActionBarPresenter
