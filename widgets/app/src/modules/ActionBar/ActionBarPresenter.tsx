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
  const [selectedProject, setSelectedProject] = useState('')
  const [attachmentType, setAttachmentType] = useState<'images' | 'project' | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false)
  const [newWorktreeBranch, setNewWorktreeBranch] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Set default project when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

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
    if (value.trim() && selectedProject) {
      const prompt = value.trim()

      onPlay({
        prompt,
        projectId: selectedProject,
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
    } else if (projectId === 'select') {
      // Open folder picker
      if (onSelectExistingProject) {
        const newProjectId = await onSelectExistingProject()
        if (newProjectId) {
          setSelectedProject(newProjectId)
          setAttachmentType('project')
        }
      }
    } else {
      setSelectedProject(projectId)
      setAttachmentType('project')
    }
  }

  const handleCreateNewProject = async () => {
    if (newProjectName.trim()) {
      try {
        const newProject = await onCreateProject(newProjectName.trim())
        if (newProject) {
          setSelectedProject(newProject.id)
        }
        setNewProjectName('')
        setIsNewProjectDialogOpen(false)
      } catch (error) {
        console.error('Failed to create project:', error)
      }
    }
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject)

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
          <Select value={selectedProject} onValueChange={handleSelectProject}>
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
                <Label
                  htmlFor="worktree-checkbox"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Checkbox
                    id="worktree-checkbox"
                    checked={newWorktreeBranch}
                    onCheckedChange={(checked) => setNewWorktreeBranch(checked === true)}
                    disabled={isLoading}
                    className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <IconGitBranch className="h-4 w-4" />
                  <span className="font-medium text-sm">New Worktree branch</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This creates a separate worktree branch so you can run multiple agents on the same
                  codebase without interfering
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
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project. This will create a new workspace for your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Awesome Project"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewProject}
              disabled={!newProjectName.trim() || isCreatingProject}
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
