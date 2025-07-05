import React, { useState } from 'react'
import { cn } from '@/lib/classNames'
import { useGameWebview } from './GameWebviewManager'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export const GameControls: React.FC = () => {
  const { webviewRef, isScriptActive, loadScript, reloadWebview, botScript, setBotScript } =
    useGameWebview()
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const handleSaveScript = () => {
    loadScript(botScript)
    setIsEditorOpen(false)
  }

  const openDevTools = () => {
    const webview = webviewRef.current as any
    if (webview) {
      webview.openDevTools()
    }
  }

  return (
    <>
      {/* Bot Script Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-50 flex items-center justify-between">
        <button
          className="bg-black/90 text-white p-2 px-3 rounded-full text-sm backdrop-blur-sm pointer-events-auto border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => setIsEditorOpen(true)}
        >
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              isScriptActive ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <div className="flex flex-col">
            <span className="font-medium">
              {isScriptActive ? 'Bot Script Active' : 'Bot Script Inactive'}
            </span>
            <span className="text-xs text-gray-400">tap to edit</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={openDevTools}
            className="bg-black/90 text-white p-2 px-3 rounded-full text-sm backdrop-blur-sm pointer-events-auto border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
          >
            Open Dev Console
          </button>
          <button
            onClick={reloadWebview}
            className="bg-black/90 text-white p-2 px-3 rounded-full text-sm backdrop-blur-sm pointer-events-auto border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
          >
            Refresh Game
          </button>
        </div>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900/90 text-white border-gray-700 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Edit Bot Script</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Edit the Javascript code for your bot. The bot will run in a sandbox inside the game.
            The script will be saved and reloaded automatically. The script will continue running
            even when you navigate away from the game page.
          </p>
          <Textarea
            value={botScript}
            onChange={(e) => setBotScript(e.target.value)}
            className="flex-grow font-mono text-sm bg-black/50 border-gray-600 text-gray-200 focus:ring-[#CB661C]"
            placeholder="on('update', (state) => { ... })"
          />
          <DialogFooter>
            <Button onClick={handleSaveScript} className="bg-[#CB661C] hover:bg-[#B55A17]">
              Save and Reload Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
