import React, { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Paperclip, Send, MessageSquare } from 'lucide-react'
import type { TaskWithMessages } from '@slide.code/schema'
import { useContinueTask } from '@slide.code/clients'
import { useWorkingScreenContext } from '../WorkingScreen'

interface PromptBoxProps {
  task: TaskWithMessages
}

export function PromptBox({ task }: PromptBoxProps) {
  const [prompt, setPrompt] = useState('')
  const continueTask = useContinueTask()
  const { commentsCount } = useWorkingScreenContext()

  const handleSubmit = () => {
    if (!prompt.trim()) return

    continueTask.mutate({
      taskId: task.id,
      prompt: prompt.trim()
    })

    // Clear the prompt after sending
    setPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-[600px] max-w-[80vw]">
      {/* Comments indicator */}
      {commentsCount > 0 && (
        <div className="mb-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>
              and {commentsCount} code comment{commentsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Continue working on "${task.name}"... (e.g. 'implement a new feature')`}
          className="w-full rounded-lg shadow-xl p-3 pr-20 bg-background resize-none border-2 border-gray-200 hover:border-gray-300 transition-colors duration-200"
          rows={2}
          disabled={continueTask.isPending}
        />
        <div className="absolute top-1/2 -translate-y-1/2 right-2 flex space-x-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSubmit}
            disabled={!prompt.trim() || continueTask.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
