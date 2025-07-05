import { Schema } from 'effect'

// Define message types as a const enum - keeping only what's used
export const MessageTypes = {
  // Application events
  APP_READY: 'AppReady',

  // Task events
  TASK_START: 'TaskStart',
  TASK_CONTINUE: 'TaskContinue',
  TASK_STOP: 'TaskStop',

  // Update events
  CHECK_FOR_UPDATES: 'CheckForUpdates',

  // Query events
  INVALIDATE_QUERY: 'InvalidateQuery',

  // Window commands
  SET_WINDOW_TITLE: 'SetWindowTitle',
  SHOW_UPDATE_DIALOG: 'ShowUpdateDialog',
  QUIT: 'Quit',
  GET_APP_INFO: 'GetAppInfo',
  OPEN_SLIDE_FOLDER: 'OpenSlideFolder'
} as const

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes]

// Define schemas for each payload type
export const Payloads = {
  [MessageTypes.APP_READY]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.APP_READY),
    timestamp: Schema.Number,
    error: Schema.optional(Schema.Boolean),
    errorDetails: Schema.optional(Schema.String)
  }).annotations({
    parseOptions: {
      onExcessProperty: 'error',
      exact: true
    }
  }),

  [MessageTypes.TASK_START]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_START),
    taskId: Schema.String,
    model: Schema.optional(Schema.String),
    permissionMode: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }).annotations({
    parseOptions: {
      onExcessProperty: 'error',
      exact: true
    }
  }),

  [MessageTypes.TASK_CONTINUE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_CONTINUE),
    taskId: Schema.String,
    prompt: Schema.String,
    sessionId: Schema.optional(Schema.String),
    model: Schema.optional(Schema.String),
    permissionMode: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_STOP]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_STOP),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.CHECK_FOR_UPDATES]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.CHECK_FOR_UPDATES),
    timestamp: Schema.Number
  }),

  [MessageTypes.INVALIDATE_QUERY]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.INVALIDATE_QUERY),
    queryKey: Schema.Array(Schema.Any),
    timestamp: Schema.Number
  }),

  [MessageTypes.SET_WINDOW_TITLE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SET_WINDOW_TITLE),
    title: Schema.String,
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.SHOW_UPDATE_DIALOG]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHOW_UPDATE_DIALOG),
    checkForUpdates: Schema.optional(Schema.Boolean),
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.QUIT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.QUIT),
    force: Schema.optional(Schema.Boolean),
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.GET_APP_INFO]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.GET_APP_INFO),
    includeVersion: Schema.optional(Schema.Boolean),
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.OPEN_SLIDE_FOLDER]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_SLIDE_FOLDER),
    timestamp: Schema.Number
  })
}

// Create a union of all payload schemas
const PayloadUnion = Schema.Union(...Object.values(Payloads))

export const MessageSchema = PayloadUnion

export type Message = Schema.Schema.Type<typeof MessageSchema>

// Define a type for payload types
export type PayloadTypes = {
  [K in keyof typeof Payloads]: Schema.Schema.Type<(typeof Payloads)[K]>
}

// Define TypedMessage type
export type TypedMessage<T extends MessageType> = T extends keyof typeof Payloads
  ? Schema.Schema.Type<(typeof Payloads)[T]>
  : never

// Define specific message types
export type AppReadyMessage = TypedMessage<typeof MessageTypes.APP_READY>
export type TaskStartMessage = TypedMessage<typeof MessageTypes.TASK_START>
export type TaskContinueMessage = TypedMessage<typeof MessageTypes.TASK_CONTINUE>
export type TaskStopMessage = TypedMessage<typeof MessageTypes.TASK_STOP>
export type CheckForUpdatesMessage = TypedMessage<typeof MessageTypes.CHECK_FOR_UPDATES>
export type InvalidateQueryMessage = TypedMessage<typeof MessageTypes.INVALIDATE_QUERY>
export type SetWindowTitleMessage = TypedMessage<typeof MessageTypes.SET_WINDOW_TITLE>
export type ShowUpdateDialogMessage = TypedMessage<typeof MessageTypes.SHOW_UPDATE_DIALOG>
export type QuitMessage = TypedMessage<typeof MessageTypes.QUIT>
export type GetAppInfoMessage = TypedMessage<typeof MessageTypes.GET_APP_INFO>
export type OpenSlideFolderMessage = TypedMessage<typeof MessageTypes.OPEN_SLIDE_FOLDER>

// Generic message creator function
export const createMessage = <T extends MessageType>(
  type: T,
  payload: Omit<TypedMessage<T>, '_tag'>,
  timestamp: number = Date.now()
): TypedMessage<T> =>
  ({
    _tag: type,
    ...payload,
    timestamp
  }) as TypedMessage<T>

// Message creator functions - keeping only what's used
export const createAppReady = (error?: boolean, errorMessage?: string) =>
  createMessage(MessageTypes.APP_READY, {
    timestamp: Date.now(),
    ...(error !== undefined && { error }),
    ...(errorMessage && { errorDetails: errorMessage })
  })

export const createTaskStart = (taskId: string, model?: string, permissionMode?: string) =>
  createMessage(MessageTypes.TASK_START, {
    taskId,
    model,
    permissionMode,
    timestamp: Date.now()
  })

export const createTaskContinue = (
  taskId: string,
  prompt: string,
  sessionId?: string,
  model?: string,
  permissionMode?: string
) =>
  createMessage(MessageTypes.TASK_CONTINUE, {
    taskId,
    prompt,
    sessionId,
    model,
    permissionMode,
    timestamp: Date.now()
  })

export const createTaskStop = (taskId: string) =>
  createMessage(MessageTypes.TASK_STOP, {
    taskId,
    timestamp: Date.now()
  })

export const createCheckForUpdates = () =>
  createMessage(MessageTypes.CHECK_FOR_UPDATES, {
    timestamp: Date.now()
  })

export const createInvalidateQuery = (queryKey: any[]) =>
  createMessage(MessageTypes.INVALIDATE_QUERY, {
    queryKey,
    timestamp: Date.now()
  })

export const createSetWindowTitle = (title: string) =>
  createMessage(MessageTypes.SET_WINDOW_TITLE, {
    title,
    timestamp: Date.now()
  })

export const createShowUpdateDialog = (checkForUpdates = true) =>
  createMessage(MessageTypes.SHOW_UPDATE_DIALOG, {
    checkForUpdates,
    timestamp: Date.now()
  })

export const createQuit = (force = false) =>
  createMessage(MessageTypes.QUIT, {
    force,
    timestamp: Date.now()
  })

export const createGetAppInfo = (includeVersion = true) =>
  createMessage(MessageTypes.GET_APP_INFO, {
    includeVersion,
    timestamp: Date.now()
  })

export const createOpenSlideFolder = () =>
  createMessage(MessageTypes.OPEN_SLIDE_FOLDER, {
    timestamp: Date.now()
  })

// Utility functions for serialization
export const serializeMessage = (message: Message): string => {
  const encoded = Schema.encodeSync(MessageSchema)(message)
  return JSON.stringify(encoded)
}

export const deserializeMessage = (serialized: string): Message => {
  const parsed = JSON.parse(serialized)
  return Schema.decodeUnknownSync(MessageSchema)(parsed)
}

export const deserializeMessageObject = (serialized: any): Message => {
  return Schema.decodeUnknownSync(MessageSchema)(serialized)
}

// Type guards
export const isTaskStart = (
  message: Message
): message is TypedMessage<typeof MessageTypes.TASK_START> =>
  message._tag === MessageTypes.TASK_START

// Helper for command creation
export type CommandProps = Record<string, any>

export const createCommand = (command: MessageType, props: CommandProps = {}) => {
  const timestamp = Date.now()
  const baseMessage = {
    _tag: command,
    timestamp,
    ...props
  }
  return baseMessage as Message
}

export const createSerializedCommand = (command: MessageType, props: CommandProps = {}) => {
  const message = createCommand(command, props)
  return serializeMessage(message)
}
