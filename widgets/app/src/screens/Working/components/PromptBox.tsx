import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useContinueTask, useSelectFiles } from '@slide.code/clients'
import { toast } from 'sonner'
import {
  IconPaperclip,
  IconX,
  IconSend,
  IconSquare,
  IconLoader2,
  IconMessageCircle,
  IconFile
} from '@tabler/icons-react'
import { FileAttachment } from '@slide.code/schema'
import type { TaskWithMessages, ClaudeModelId } from '@slide.code/schema'
import { DEFAULT_MODEL } from '@slide.code/schema'
import { useStopTask, useProject } from '@slide.code/clients'
import { useWorkingScreenContext } from '../WorkingScreen'
import { ModelPicker } from '@/components/ModelPicker'

interface PromptBoxProps {
  task: TaskWithMessages
}

export function PromptBox({ task }: PromptBoxProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_MODEL)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const continueTask = useContinueTask()
  const stopTask = useStopTask()
  const selectFilesMutation = useSelectFiles()
  const { commentsCount, commentsData, clearAllComments } = useWorkingScreenContext()
  const { data: project } = useProject(task.projectId)

  // Check if task is currently running
  const isTaskRunning = task.status === 'running'

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [prompt])

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    try {
      await continueTask.mutateAsync({
        taskId: task.id,
        prompt: prompt.trim(),
        model: selectedModel,
        permissionMode: 'bypassPermissions',
        fileComments: commentsData,
        attachments: attachments.length > 0 ? attachments : undefined
      })

      setPrompt('')
      setAttachments([])
    } catch (error) {
      console.error('Failed to continue task:', error)
      toast.error('Failed to continue task')
    }
  }

  // const handlePlan = async () => {
  //   if (!prompt.trim()) {
  //     toast.error('Please enter a prompt')
  //     return
  //   }

  //   try {
  //     await continueTask.mutateAsync({
  //       taskId: task.id,
  //       prompt: prompt.trim(),
  //       model: selectedModel,
  //       permissionMode: 'plan',
  //       fileComments: commentsData,
  //       attachments: attachments.length > 0 ? attachments : undefined
  //     })

  //     setPrompt('')
  //     setAttachments([])
  //   } catch (error) {
  //     console.error('Failed to plan task:', error)
  //     toast.error('Failed to plan task')
  //   }
  // }

  const handleStop = () => {
    stopTask.mutate(task.id)
  }

  const handleAttachFiles = async () => {
    try {
      const files = await selectFilesMutation.mutateAsync()
      if (files && files.length > 0) {
        setAttachments((prev) => [...prev, ...files])
        toast.success(`Added ${files.length} file${files.length > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Failed to select files:', error)
      toast.error('Failed to select files')
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasContextItems = commentsCount > 0 || attachments.length > 0

  return (
    <div className="px-4 py-3">
      {/* Context items bar - compact single line */}
      {hasContextItems && (
        <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
          {commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <IconMessageCircle className="w-4 h-4" />
              <span>
                {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={clearAllComments}
              >
                <IconX className="w-3 h-3" />
              </Button>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <IconFile className="w-4 h-4" />
              <span>
                {attachments.length} file{attachments.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={() => setAttachments([])}
              >
                <IconX className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-3">
        {/* Model picker - only show when task is not running */}
        {!isTaskRunning && (
          <div className="flex-shrink-0">
            <ModelPicker
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={continueTask.isPending}
              className="w-32"
            />
          </div>
        )}

        {/* Textarea container */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Continue working on "${project?.name || 'project'}"... (e.g. 'implement a new feature')`}
            className="w-full pr-24 resize-none min-h-[60px] max-h-[120px]"
            rows={2}
            disabled={continueTask.isPending || isTaskRunning}
          />

          {/* Input controls */}
          <div className="absolute top-2 right-2 flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAttachFiles}
                    disabled={
                      continueTask.isPending || isTaskRunning || selectFilesMutation.isPending
                    }
                  >
                    <IconPaperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach files</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* {!isTaskRunning && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={!prompt.trim() || continueTask.isPending}
                // onClick={handlePlan}
              >
                Plan
              </Button>
            )} */}
          </div>
        </div>

        {/* Submit/Stop button */}
        <div className="flex-shrink-0">
          {isTaskRunning ? (
            <Button
              variant="destructive"
              className="w-12 h-12 p-0 bg-red-600 hover:bg-red-700 border-red-600"
              onClick={handleStop}
              disabled={stopTask.isPending}
            >
              {stopTask.isPending ? (
                <IconLoader2 className="w-5 h-5 animate-spin" />
              ) : (
                <IconSquare className="w-5 h-5 fill-current" />
              )}
            </Button>
          ) : (
            <Button
              className="w-12 h-12 p-0"
              onClick={handleSubmit}
              disabled={!prompt.trim() || continueTask.isPending}
            >
              {continueTask.isPending ? (
                <IconLoader2 className="w-5 h-5 animate-spin" />
              ) : (
                <IconSend className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
