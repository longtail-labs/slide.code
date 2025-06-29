import React, { useState, useCallback, useMemo } from 'react'
import { parseDiff, Diff, Hunk, type DiffType, getChangeKey } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import type { Change, Hunk as HunkData } from 'gitdiff-parser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'

const diffText = `
--- a/file.js
+++ b/file.js
@@ -1,6 +1,9 @@
 import React from 'react';
 
 function HelloWorld() {
-  return <h1>Hello, World!</h1>;
+  const [name, setName] = useState('World');
+  return (
+    <div>
+      <input value={name} onChange={(e) => setName(e.target.value)} />
+      <h1>Hello, {name}!</h1>
+    </div>
+  );
 }
 
 export default HelloWorld;
`

type DiffFile = {
  oldRevision: string
  newRevision: string
  type: DiffType
  hunks: HunkData[]
  oldPath: string
  newPath: string
}

const CommentWidget = ({ text, onDelete }: { text: string; onDelete: () => void }) => {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-b border-slate-200 dark:border-slate-700 text-sm">
      <div className="flex items-start justify-between">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{text}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

const CommentForm = ({
  onSave,
  onCancel
}: {
  onSave: (text: string) => void
  onCancel: () => void
}) => {
  const [text, setText] = useState('')

  const handleSave = useCallback(() => {
    onSave(text)
  }, [text, onSave])

  useHotkeys('mod+enter', handleSave, { enableOnFormTags: ['textarea'] }, [handleSave])

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-900 border-t border-b">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Leave a comment... (Cmd+Enter to save)"
        className="bg-white dark:bg-gray-800"
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Comment</Button>
      </div>
    </div>
  )
}

type GutterProps = {
  change?: Change
  renderDefault: () => React.ReactNode
  inHoverState?: boolean
}

export function DiffViewer() {
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentingOn, setCommentingOn] = useState<string | null>(null)

  const files = parseDiff(diffText)

  const handleAddCommentClick = useCallback((change: Change) => {
    const key = getChangeKey(change)
    setCommentingOn(key)
  }, [])

  const handleSaveComment = (key: string, text: string) => {
    if (text) {
      setComments((prev) => ({ ...prev, [key]: text }))
    }
    setCommentingOn(null)
  }

  const handleCancelComment = () => {
    setCommentingOn(null)
  }

  const handleDeleteComment = (key: string) => {
    setComments((prev) => {
      const newComments = { ...prev }
      delete newComments[key]
      return newComments
    })
  }

  const renderGutter = useCallback(
    ({ change, renderDefault, inHoverState }: GutterProps) => {
      if (!change) {
        return renderDefault()
      }

      const isHovering = !!(inHoverState && change)

      return (
        <div className="relative w-full h-full">
          <span className={`transition-opacity ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
            {renderDefault()}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 transition-opacity ${
              isHovering ? 'opacity-75 hover:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => handleAddCommentClick(change)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    [handleAddCommentClick]
  )

  const widgets = useMemo(() => {
    return files.reduce(
      (acc, file) => {
        for (const hunk of file.hunks) {
          for (const change of hunk.changes) {
            const key = getChangeKey(change)
            if (commentingOn === key) {
              acc[key] = (
                <CommentForm
                  onSave={(text) => handleSaveComment(key, text)}
                  onCancel={handleCancelComment}
                />
              )
            } else if (comments[key]) {
              acc[key] = (
                <CommentWidget text={comments[key]} onDelete={() => handleDeleteComment(key)} />
              )
            }
          }
        }
        return acc
      },
      {} as Record<string, React.ReactNode>
    )
  }, [files, comments, commentingOn, handleAddCommentClick, handleDeleteComment])

  const renderFile = ({ oldRevision, newRevision, type, hunks }: DiffFile) => {
    return (
      <Diff
        key={`${oldRevision}-${newRevision}`}
        viewType="split"
        diffType={type}
        hunks={hunks}
        className="diff-viewer"
        renderGutter={renderGutter}
        widgets={widgets}
      >
        {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
      </Diff>
    )
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 h-full overflow-auto text-xs select-text">
      <div className="bg-white dark:bg-gray-900 rounded border overflow-hidden">
        {files.map(renderFile)}
      </div>
    </div>
  )
}
