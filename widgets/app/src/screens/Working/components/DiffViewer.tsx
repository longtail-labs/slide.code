import React, { useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode, ChangeEvent } from 'react'
import { parseDiff, Diff, Hunk, type DiffType, getChangeKey } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import type { Change, Hunk as HunkData } from 'gitdiff-parser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, FileText, FilePlus, FileMinus, FileX } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useWorkingScreenContext } from '../WorkingScreen'

interface DiffViewerProps {
  diffText?: string
  isLoading?: boolean
  error?: Error | null
}

type DiffFile = {
  oldRevision: string
  newRevision: string
  type: DiffType
  hunks: HunkData[]
  oldPath: string
  newPath: string
}

const getFileIcon = (type: DiffType) => {
  switch (type) {
    case 'add':
      return <FilePlus className="h-4 w-4 text-green-600 dark:text-green-400" />
    case 'delete':
      return <FileMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
    case 'rename':
      return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    case 'modify':
    default:
      return <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
  }
}

const getFileTypeLabel = (type: DiffType) => {
  switch (type) {
    case 'add':
      return 'added'
    case 'delete':
      return 'deleted'
    case 'rename':
      return 'renamed'
    case 'modify':
    default:
      return 'modified'
  }
}

const getFileStats = (hunks: HunkData[]) => {
  let additions = 0
  let deletions = 0

  hunks.forEach((hunk) => {
    hunk.changes.forEach((change) => {
      if (change.type === 'insert') additions++
      if (change.type === 'delete') deletions++
    })
  })

  return { additions, deletions }
}

const FileHeader = ({ file }: { file: DiffFile }) => {
  const { additions, deletions } = getFileStats(file.hunks)
  const displayPath =
    file.type === 'rename' ? `${file.oldPath} → ${file.newPath}` : file.newPath || file.oldPath

  return (
    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {getFileIcon(file.type)}
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayPath}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getFileTypeLabel(file.type)}
        </span>
        {(additions > 0 || deletions > 0) && (
          <div className="flex items-center gap-2 ml-auto">
            {additions > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400">+{additions}</span>
            )}
            {deletions > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400">-{deletions}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
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
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
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

export function DiffViewer({ diffText, isLoading, error }: DiffViewerProps) {
  console.log('DiffViewer', diffText, isLoading, error)
  // All hooks must be called first, before any early returns
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const { setCommentsCount } = useWorkingScreenContext()

  // Update comments count in context whenever comments change
  useEffect(() => {
    setCommentsCount(Object.keys(comments).length)
  }, [comments, setCommentsCount])

  const handleAddCommentClick = useCallback((change: Change) => {
    const key = getChangeKey(change)
    setCommentingOn(key)
  }, [])

  const handleSaveComment = useCallback((key: string, text: string) => {
    if (text) {
      setComments((prev: Record<string, string>) => ({ ...prev, [key]: text }))
    }
    setCommentingOn(null)
  }, [])

  const handleCancelComment = useCallback(() => {
    setCommentingOn(null)
  }, [])

  const handleDeleteComment = useCallback((key: string) => {
    setComments((prev: Record<string, string>) => {
      const newComments = { ...prev }
      delete newComments[key]
      return newComments
    })
  }, [])

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

  const files = useMemo(() => {
    if (!diffText || diffText.trim() === '') {
      return []
    }
    return parseDiff(diffText)
  }, [diffText])

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
  }, [files, comments, commentingOn, handleSaveComment, handleCancelComment, handleDeleteComment])

  // Now handle conditional rendering after all hooks have been called
  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 h-full overflow-auto flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading diff...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 h-full overflow-auto flex items-center justify-center">
        <div className="text-sm text-red-500">Error loading diff: {error.message}</div>
      </div>
    )
  }

  if (!diffText || diffText.trim() === '' || files.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 h-full overflow-auto flex items-center justify-center">
        <div className="text-sm text-gray-500">No changes yet</div>
      </div>
    )
  }

  const renderFile = (file: DiffFile, index: number) => {
    return (
      <div
        key={`${file.oldRevision}-${file.newRevision}-${index}`}
        className="bg-white dark:bg-gray-900 rounded border overflow-hidden mb-4 last:mb-0"
      >
        <FileHeader file={file} />
        <Diff
          viewType="split"
          diffType={file.type}
          hunks={file.hunks}
          className="diff-viewer"
          renderGutter={renderGutter}
          widgets={widgets}
        >
          {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
        </Diff>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 h-full overflow-auto text-xs select-text">
      <div className="space-y-4">{files.map(renderFile)}</div>
    </div>
  )
}
