import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Paperclip, Send } from 'lucide-react'

export function PromptBox() {
  return (
    <div className="absolute bottom-22 left-1/2 -translate-x-1/2 w-full max-w-4xl z-20 px-4">
      <div className="relative">
        <Textarea
          placeholder="Type your message here... (e.g. 'implement a new feature')"
          className="w-full rounded-lg shadow-xl p-4 pr-28 bg-background resize-none"
          rows={3}
        />
        <div className="absolute top-1/2 -translate-y-1/2 right-3 flex space-x-1">
          <Button variant="ghost" size="icon">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button size="icon">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
