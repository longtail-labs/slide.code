import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IconPlayerPlayFilled, IconLinkPlus } from '@tabler/icons-react'

export interface Suggestion {
  icon: string
  text: string
}

export interface ActionBarProps {
  onPlay: (value: string) => void
  onSuggestionClick?: (suggestion: Suggestion) => void
  suggestions: Suggestion[]
  isLoading?: boolean
}

const ActionBarPresenter = ({
  onPlay,
  onSuggestionClick,
  suggestions,
  isLoading = false
}: ActionBarProps) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (value.trim()) {
      onPlay(value)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-4xl font-geist font-semibold text-center mb-8">
        What do you want to work on?
      </h1>

      <Card className="border">
        <CardContent className="p-0">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I know you've been putting something off..."
              className="min-h-[56px] max-h-[200px] overflow-y-auto font-geist w-full resize-none border-0 bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
              disabled={isLoading}
            />

            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 px-3"
                  disabled={isLoading}
                >
                  <IconLinkPlus className="h-4 w-4" />
                  <span className="font-geist font-bold">Attach</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 w-8 rounded-full p-0"
                  disabled={!value || isLoading}
                  onClick={handlePlay}
                >
                  <IconPlayerPlayFilled size={26} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className="flex items-center justify-start gap-2 p-4 h-auto text-left"
            onClick={() => onSuggestionClick?.(suggestion)}
            disabled={isLoading}
          >
            <span className="text-xl">{suggestion.icon}</span>
            <span className="text-sm">{suggestion.text}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export default ActionBarPresenter
