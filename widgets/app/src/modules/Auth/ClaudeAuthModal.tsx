import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUserRef } from '@slide.code/clients'

const useClaudeAuthModal = () => {
  const [isModalOpen, setModalOpen] = useState(false)
  const [userState] = useUserRef()

  useEffect(() => {
    // Show modal if Claude Code is not authenticated
    if (userState?.claudeCode?.isAuthenticated === false) {
      setModalOpen(true)
    }
  }, [userState?.claudeCode?.isAuthenticated])

  return { isModalOpen, setModalOpen }
}

export const ClaudeAuthModal = () => {
  const { isModalOpen, setModalOpen } = useClaudeAuthModal()

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set up Claude Code</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>
              This tool uses the{' '}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">claude</code> executable on
              your machine. Please open your terminal and set up Claude Code to enable all AI
              features.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">
                Option 1: Interactive Authentication (Recommended)
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">1. Install Claude Code:</p>
                  <code className="block bg-gray-800 text-white p-2 rounded text-xs mt-1">
                    npm install -g @anthropic-ai/claude-code
                  </code>
                </div>

                <div>
                  <p className="font-medium">2. Run Claude to authenticate:</p>
                  <code className="block bg-gray-800 text-white p-2 rounded text-xs mt-1">
                    claude
                  </code>
                  <p className="text-xs text-gray-600 mt-1">
                    This will prompt you to choose between:
                  </p>
                  <ul className="text-xs text-gray-600 mt-1 ml-4 space-y-1">
                    <li>
                      • <strong>Claude subscription</strong> - $20/mo Pro or $100/mo Max (best
                      value, predictable pricing)
                    </li>
                    <li>
                      • <strong>Anthropic Console account</strong> - API usage billing
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Option 2: Manual API Key Setup</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">
                    1. Get your API key from the{' '}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Anthropic Console
                    </a>
                  </p>
                </div>

                <div>
                  <p className="font-medium">2. Set up your API key:</p>
                  <code className="block bg-gray-800 text-white p-2 rounded text-xs mt-1">
                    export ANTHROPIC_API_KEY=your_api_key_here
                  </code>
                </div>

                <div>
                  <p className="font-medium">3. Test your setup:</p>
                  <code className="block bg-gray-800 text-white p-2 rounded text-xs mt-1">
                    claude -p "Hello, Claude!"
                  </code>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Alternative: You can also use Amazon Bedrock or Google Vertex AI. See the{' '}
              <a
                href="https://docs.anthropic.com/en/docs/build-with-claude/claude-code-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Claude Code SDK documentation
              </a>{' '}
              for more setup options.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setModalOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
