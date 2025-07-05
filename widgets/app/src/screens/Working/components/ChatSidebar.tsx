import React from 'react'
import { Match, Schema } from 'effect'
import type { TaskWithMessages } from '@slide.code/schema'
import {
  SdkAssistantMessageSchema,
  SdkSystemMessageSchema,
  SdkUserMessageSchema,
  SdkResultMessageSchema,
  PromptUserMessageSchema,
  ChatMessage
} from '@slide.code/schema'
import type {
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlockParam,
  ContentBlockParam
} from '@anthropic-ai/sdk/resources/messages'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'

// --- Type Guards for Tool Inputs ---
type GlobInput = { pattern: string }
const isGlobInput = (input: unknown): input is GlobInput =>
  typeof input === 'object' && input !== null && 'pattern' in input

type WriteInput = { file_path: string; content: string }
const isWriteInput = (input: unknown): input is WriteInput =>
  typeof input === 'object' && input !== null && 'file_path' in input && 'content' in input

type ReadInput = { file_path: string }
const isReadInput = (input: unknown): input is ReadInput =>
  typeof input === 'object' && input !== null && 'file_path' in input

type BashInput = { command: string }
const isBashInput = (input: unknown): input is BashInput =>
  typeof input === 'object' && input !== null && 'command' in input

type GrepInput = { pattern: string; path?: string }
const isGrepInput = (input: unknown): input is GrepInput =>
  typeof input === 'object' && input !== null && 'pattern' in input

type LsInput = { path: string }
const isLsInput = (input: unknown): input is LsInput =>
  typeof input === 'object' && input !== null && 'path' in input

type TodoWriteInput = {
  todos: Array<{
    id: string
    content: string
    status: string
    priority: string
  }>
}
const isTodoWriteInput = (input: unknown): input is TodoWriteInput =>
  typeof input === 'object' &&
  input !== null &&
  'todos' in input &&
  Array.isArray((input as any).todos)

// --- UI Components for Message Blocks ---
const ToolUseBlockComponent = ({ block }: { block: ToolUseBlock }) => {
  const { name, input } = block

  const renderInputDetails = () => {
    if (name === 'Glob' && isGlobInput(input)) {
      return (
        <Badge variant="secondary" className="text-xs">
          {input.pattern}
        </Badge>
      )
    }
    if (name === 'Write' && isWriteInput(input)) {
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="secondary" className="text-xs">
            {input.file_path}
          </Badge>
          <ScrollArea className="h-24 w-full rounded border bg-black/10 dark:bg-black/50 p-1">
            <pre className="text-xs whitespace-pre-wrap">
              <code>{input.content}</code>
            </pre>
          </ScrollArea>
        </div>
      )
    }
    if (name === 'Read' && isReadInput(input)) {
      return (
        <Badge variant="secondary" className="text-xs">
          {input.file_path}
        </Badge>
      )
    }
    if (name === 'Bash' && isBashInput(input)) {
      return (
        <pre className="p-1 rounded bg-black/50 text-xs text-white overflow-x-auto whitespace-pre-wrap w-full">
          <code>{input.command}</code>
        </pre>
      )
    }
    if (name === 'Grep' && isGrepInput(input)) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {input.pattern}
          </Badge>
          {input.path && (
            <Badge variant="outline" className="text-xs">
              {input.path}
            </Badge>
          )}
        </div>
      )
    }
    if (name === 'LS' && isLsInput(input)) {
      return (
        <Badge variant="secondary" className="text-xs">
          {input.path}
        </Badge>
      )
    }
    if (name === 'TodoWrite' && isTodoWriteInput(input)) {
      return (
        <div className="flex flex-col gap-1 w-full">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {input.todos.length} todo{input.todos.length !== 1 ? 's' : ''}
          </div>
          <div className="space-y-0.5">
            {input.todos.map((todo, index) => {
              const statusColor =
                todo.status === 'completed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : todo.status === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'

              const priorityColor =
                todo.priority === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  : todo.priority === 'medium'
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                    : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'

              return (
                <div
                  key={todo.id || index}
                  className="flex items-center justify-between px-1.5 py-1 rounded border bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <Checkbox
                      checked={todo.status === 'completed'}
                      disabled
                      className="pointer-events-none h-3 w-3"
                    />
                    <span
                      className={`text-xs ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                    >
                      {todo.content}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <Badge variant="secondary" className={`text-xs px-1 py-0 ${statusColor}`}>
                      {todo.status}
                    </Badge>
                    <Badge variant="outline" className={`text-xs px-1 py-0 ${priorityColor}`}>
                      {todo.priority}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return (
      <pre className="text-xs mt-1 p-1 rounded bg-black/50 overflow-x-auto whitespace-pre-wrap w-full">
        <code>{JSON.stringify(input, null, 2)}</code>
      </pre>
    )
  }

  return (
    <Alert className="my-0.5 py-1">
      <AlertTitle className="flex items-center gap-1 mb-1">
        <Badge className="text-xs">{name}</Badge>
      </AlertTitle>
      <AlertDescription className="!pl-0">{renderInputDetails()}</AlertDescription>
    </Alert>
  )
}

const ToolResultBlockComponent = ({ block }: { block: ToolResultBlockParam }) => {
  const { content, is_error } = block
  let resultText = ''

  if (typeof content === 'string') {
    resultText = content
  } else if (Array.isArray(content) && content.length > 0 && content[0]?.type === 'text') {
    resultText = content.map((c: any) => c.text).join('\n')
  } else if (content) {
    resultText = JSON.stringify(content, null, 2)
  }

  if (resultText === 'No files found') {
    return (
      <Badge variant="outline" className="text-xs">
        No files found
      </Badge>
    )
  }

  return (
    <Alert variant={is_error ? 'destructive' : 'default'} className="my-0.5 py-1">
      <AlertTitle className="flex items-center gap-1">
        <Badge variant={is_error ? 'destructive' : 'secondary'} className="text-xs">
          Result
        </Badge>
      </AlertTitle>
      <AlertDescription className="!pl-0 pt-0.5">
        {resultText.includes('{') ? (
          <pre className="text-xs whitespace-pre-wrap">{resultText}</pre>
        ) : (
          <span className="text-xs">{resultText}</span>
        )}
      </AlertDescription>
    </Alert>
  )
}

const TextBlockComponent = ({ block }: { block: TextBlock }) => {
  return <p className="text-xs">{block.text}</p>
}

const MessageContent = ({
  content
}: {
  content: string | Array<ContentBlock | ContentBlockParam>
}) => {
  if (typeof content === 'string') {
    return <p className="text-xs">{content}</p>
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-0.5">
        {content.map((block, index) => {
          switch (block.type) {
            case 'tool_use':
              return <ToolUseBlockComponent key={index} block={block as ToolUseBlock} />
            case 'tool_result':
              return <ToolResultBlockComponent key={index} block={block as ToolResultBlockParam} />
            case 'text':
              return <TextBlockComponent key={index} block={block as TextBlock} />
            default:
              return (
                <pre key={index} className="text-xs">
                  {JSON.stringify(block, null, 2)}
                </pre>
              )
          }
        })}
      </div>
    )
  }

  return <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>
}

interface ChatSidebarProps {
  task: TaskWithMessages
}

export function ChatSidebar({ task }: ChatSidebarProps) {
  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isToolResultMessage = (message: ChatMessage): boolean => {
    if (message?.event?.type !== 'user' && message?.event?.type !== 'prompt') return false

    // Handle PromptUserMessage (doesn't have tool results) - now uses type 'prompt'
    if (message?.event?.type === 'prompt') {
      return false
    }

    // Handle SdkUserMessage
    const content = (message.event as any).message?.content
    return Array.isArray(content) && content.some((block: any) => block?.type === 'tool_result')
  }

  const renderMessageContent = (message: ChatMessage) => {
    return Match.value(message.event).pipe(
      Match.when(Schema.is(SdkUserMessageSchema), (msg) => {
        console.log('ChatSidebar USER MESSAGE', msg)
        const isToolResult = isToolResultMessage(message)
        const label = isToolResult ? 'Tool Result' : 'You'
        const alignment = isToolResult ? 'text-left' : 'text-right'
        const flexDirection = isToolResult ? 'flex-row' : 'flex-row-reverse'

        if (!isToolResult) {
          return (
            <div className={`flex items-start space-x-1 ${flexDirection}`}>
              <div className="flex-1">
                <p
                  className={`font-semibold text-xs text-gray-600 dark:text-gray-300 ${alignment}`}
                >
                  {label}
                </p>
                <div
                  className={`text-xs rounded p-1.5 mt-0.5 break-words bg-gray-100 dark:bg-gray-700`}
                >
                  <MessageContent content={msg.message.content} />
                </div>
                <p className={`text-xs text-gray-400 mt-0.5 ${alignment}`}>
                  {formatMessageTime(message.createdAt)}
                </p>
              </div>
            </div>
          )
        }

        return (
          <div className={`flex items-start space-x-1 ${flexDirection}`}>
            <div className="flex-1">
              <p className={`font-semibold text-xs text-gray-600 dark:text-gray-300 ${alignment}`}>
                {label}
              </p>
              <div className={`text-xs mt-0.5 break-words`}>
                <MessageContent content={msg.message.content} />
              </div>
              <p className={`text-xs text-gray-400 mt-0.5 ${alignment}`}>
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        )
      }),
      Match.when(Schema.is(SdkAssistantMessageSchema), (msg) => (
        <div className="flex items-start space-x-1">
          <div className="flex-1">
            <p className="font-semibold text-xs text-gray-600 dark:text-gray-300">Claude</p>
            <div className="text-xs mt-0.5 break-words">
              <MessageContent content={msg.message.content} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(message.createdAt)}</p>
          </div>
        </div>
      )),
      Match.when(Schema.is(SdkResultMessageSchema), (msg) => {
        const isSuccess = !msg.is_error
        const boxClasses = isSuccess
          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
          : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
        const titleColor = isSuccess
          ? 'text-green-800 dark:text-green-200'
          : 'text-red-800 dark:text-red-200'

        return (
          <div className="flex-1">
            <div className={`rounded p-1.5 mt-0.5 text-xs ${boxClasses}`}>
              <p className={`font-semibold ${titleColor}`}>
                {isSuccess ? 'Task Completed' : 'Task Failed'}
              </p>
              <div className="mt-1 text-xs font-mono space-y-0.5">
                <div>
                  Status: <span className="font-medium">{msg.subtype}</span>
                </div>
                <div>
                  Duration: <span className="font-medium">{msg.duration_ms}ms</span>
                </div>
                {msg.result && (
                  <div>
                    Result: <span className="font-medium">{msg.result}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(message.createdAt)}</p>
          </div>
        )
      }),
      Match.when(Schema.is(SdkSystemMessageSchema), (msg) => (
        <div className="flex items-start space-x-1">
          <div className="flex-1">
            <p className="font-semibold text-xs text-gray-600 dark:text-gray-300">System</p>
            <div className="text-xs mt-0.5 font-mono break-words space-y-0.5">
              <div>Model: {msg.model}</div>
              <div>CWD: {msg.cwd}</div>
              <div>Permission Mode: {msg.permissionMode}</div>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatMessageTime(message.createdAt)}</p>
          </div>
        </div>
      )),
      Match.when(Schema.is(PromptUserMessageSchema), (msg) => {
        const hasFileComments = msg.fileComments && msg.fileComments.length > 0
        return (
          <div className="flex items-start space-x-1 flex-row-reverse">
            <div className="flex-1">
              <p className="font-semibold text-xs text-[#CB661C] text-right">You</p>
              <div className="text-xs rounded p-1.5 mt-0.5 break-words bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <p>{msg.content}</p>
                {hasFileComments && (
                  <div className="mt-1 pt-1 border-t border-orange-200 dark:border-orange-700">
                    <p className="text-xs font-semibold text-[#CB661C] mb-0.5">File Comments:</p>
                    {msg.fileComments!.map((comment, index) => (
                      <div key={index} className="text-xs mb-0.5">
                        <Badge
                          variant="outline"
                          className="mr-0.5 text-xs px-1 py-0 border-orange-300 dark:border-orange-600"
                        >
                          {comment.filePath}
                          {comment.lineNumber && `:${comment.lineNumber}`}
                        </Badge>
                        <span className="text-orange-700 dark:text-orange-300">
                          {comment.comment}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 text-right">
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        )
      }),
      Match.orElse(() => <div />)
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-text">
      <div className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-sm">Chat</h2>
        <p className="text-xs text-gray-500">{task.name}</p>
        <p className="text-xs text-gray-400">
          {task.chatMessages.length} message{task.chatMessages.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 px-2 py-1 space-y-1.5 overflow-y-auto">
        {task.chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p className="text-xs">No messages yet</p>
            <p className="text-xs">Messages will appear here as the task progresses</p>
          </div>
        ) : (
          task.chatMessages.map((message, index) => (
            <div key={message.id || index}>{renderMessageContent(message)}</div>
          ))
        )}
      </div>
    </div>
  )
}
