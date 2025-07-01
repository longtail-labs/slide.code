import { Schema } from 'effect'

// Define message types as a const enum
export const MessageTypes = {
  // Application events
  APP_READY: 'AppReady',

  // Task events
  TASK_START: 'TaskStart',
  TASK_CONTINUE: 'TaskContinue',
  TASK_SWITCHED: 'TaskSwitched',
  TASK_EXITED: 'TaskExited',
  TASK_COMPLETED: 'TaskCompleted',
  TASK_COMPLETED_AND_NEXT: 'TaskCompletedAndNext',
  TASK_CREATE_AND_START: 'TaskCreateAndStart',
  TASK_UPDATE: 'TaskUpdate',

  // Object events
  OBJECT_SELECTED: 'ObjectSelected',
  OBJECT_REMOVED: 'ObjectRemoved',
  CURRENT_OBJECT_REMOVED: 'CurrentObjectRemoved',
  GO_TO_NEXT_OBJECT: 'GoToNextObject',
  GO_TO_PREVIOUS_OBJECT: 'GoToPreviousObject',
  DUPLICATE_OBJECT_TO_TASK: 'DuplicateObjectToTask',
  MOVE_OBJECT_TO_TASK: 'MoveObjectToTask',
  DUPLICATE_CURRENT_OBJECT_TO_TASK: 'DuplicateCurrentObjectToTask',
  MOVE_CURRENT_OBJECT_TO_TASK: 'MoveCurrentObjectToTask',

  // Note events
  SAVE_NOTE: 'SaveNote',

  // Search events
  SEARCH_PERFORMED: 'SearchPerformed',
  EXECUTE_SEARCH: 'ExecuteSearch',
  EXECUTE_URL: 'ExecuteUrl',

  // Update events
  CHECK_FOR_UPDATES: 'CheckForUpdates',

  // Query events
  INVALIDATE_QUERY: 'InvalidateQuery',
  INVALIDATE_TASK: 'InvalidateTask',
  INVALIDATE_TASK_OBJECTS: 'InvalidateTaskObjects',
  INVALIDATE_OBJECT: 'InvalidateObject',

  // Window commands
  SET_WINDOW_TITLE: 'SetWindowTitle',
  SHOW_UPDATE_DIALOG: 'ShowUpdateDialog',
  QUIT: 'Quit',
  GET_APP_INFO: 'GetAppInfo',
  TOGGLE_THEME: 'ToggleTheme',
  OPEN_EXTERNAL_LINK: 'OpenExternalLink',
  OPEN_LINK: 'OpenLink',
  ENTER_FOCUS_MODE: 'EnterFocusMode',
  COPY_CURRENT_URL: 'CopyCurrentUrl',
  OPEN_SLIDE_FOLDER: 'OpenSlideFolder',

  // Browser navigation commands
  GO_BACK: 'GoBack',
  GO_FORWARD: 'GoForward',
  RELOAD: 'Reload',
  SHARE_CURRENT_PAGE: 'ShareCurrentPage',
  SHARE_SLIDE: 'ShareSlide',

  // View commands
  ZOOM_IN: 'ZoomIn',
  ZOOM_OUT: 'ZoomOut',
  RESET_ZOOM: 'ResetZoom',
  SCROLL_TO_TOP: 'ScrollToTop',
  SCROLL_TO_BOTTOM: 'ScrollToBottom',
  TOGGLE_AUDIO_MUTE: 'ToggleAudioMute',
  TOGGLE_DEVELOPER_TOOLS: 'ToggleDeveloperTools',
  FIND_IN_PAGE: 'FindInPage',
  INSPECT_ELEMENT: 'InspectElement',

  // Action bar commands
  OPEN_COMMAND_BAR: 'OpenCommandBar',
  CLOSE_COMMAND_BAR: 'CloseCommandBar',

  // Slide workflow events
  SUGGESTION_SELECTED: 'SuggestionSelected',
  EXIT_SUGGESTIONS: 'ExitSuggestions',

  // Add new message type for reordering
  TASK_OBJECT_REORDERED: 'TASK_OBJECT_REORDERED',

  // Context menu commands
  SUMMARIZE_TEXT: 'SummarizeText',
  SUMMARIZE_PAGE: 'SummarizePage',
  VIEW_SOURCE: 'ViewSource',
  COPY_SELECTION: 'CopySelection',
  CUT_SELECTION: 'CutSelection',
  SELECT_ALL: 'SelectAll',
  PASTE: 'Paste',
  PASTE_AND_MATCH_STYLE: 'PasteAndMatchStyle',
  COPY_LINK_ADDRESS: 'CopyLinkAddress',
  OPEN_IMAGE_NEW_TAB: 'OpenImageNewTab',
  COPY_IMAGE: 'CopyImage',
  SAVE_IMAGE_AS: 'SaveImageAs',

  // Add the new file upload message type
  UPLOAD_FILE: 'UploadFile',

  // Task note commands
  SHOW_TASK_NOTE: 'ShowTaskNote',
  HIDE_TASK_NOTE: 'HideTaskNote',
  SHOW_CURRENT_TASK_NOTE: 'ShowCurrentTaskNote',

  // Save selection to note command
  SAVE_SELECTION_TO_NOTE: 'SaveSelectionToNote',

  // Save selected text from current object
  SAVE_SELECTED_TEXT_TO_NOTE: 'SaveSelectedTextToNote',

  // Find bar commands
  SHOW_FIND_BAR: 'ShowFindBar',
  HIDE_FIND_BAR: 'HideFindBar',
  FIND_NEXT: 'FindNext',
  FIND_PREVIOUS: 'FindPrevious',
  STOP_FIND_IN_PAGE: 'StopFindInPage'
} as const

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes]

// Define schemas for each payload type
export const Payloads = {
  [MessageTypes.APP_READY]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.APP_READY),
    timestamp: Schema.Number
  }).annotations({
    parseOptions: {
      onExcessProperty: 'error',
      exact: true
    }
  }),

  [MessageTypes.TASK_START]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_START),
    taskId: Schema.String,
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
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_SWITCHED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_SWITCHED),
    fromTaskId: Schema.String,
    toTaskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_EXITED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_EXITED),
    taskId: Schema.String,
    timestamp: Schema.Number,
    skip: Schema.optional(Schema.Boolean)
  }),

  [MessageTypes.TASK_COMPLETED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_COMPLETED),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_COMPLETED_AND_NEXT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_COMPLETED_AND_NEXT),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.OBJECT_SELECTED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OBJECT_SELECTED),
    objectId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.OBJECT_REMOVED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OBJECT_REMOVED),
    objectId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.CURRENT_OBJECT_REMOVED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.CURRENT_OBJECT_REMOVED),
    timestamp: Schema.Number
  }),

  [MessageTypes.SEARCH_PERFORMED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SEARCH_PERFORMED),
    query: Schema.String,
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

  [MessageTypes.INVALIDATE_TASK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.INVALIDATE_TASK),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.INVALIDATE_TASK_OBJECTS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.INVALIDATE_TASK_OBJECTS),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.INVALIDATE_OBJECT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.INVALIDATE_OBJECT),
    taskId: Schema.String,
    objectId: Schema.String,
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

  [MessageTypes.TOGGLE_THEME]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TOGGLE_THEME),
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.OPEN_EXTERNAL_LINK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_EXTERNAL_LINK),
    url: Schema.String,
    timestamp: Schema.optional(Schema.Number)
  }),

  [MessageTypes.ENTER_FOCUS_MODE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.ENTER_FOCUS_MODE),
    timestamp: Schema.Number
  }),

  [MessageTypes.SUGGESTION_SELECTED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SUGGESTION_SELECTED),
    suggestionId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.EXIT_SUGGESTIONS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.EXIT_SUGGESTIONS),
    timestamp: Schema.Number
  }),

  [MessageTypes.COPY_CURRENT_URL]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.COPY_CURRENT_URL),
    timestamp: Schema.Number
  }),

  [MessageTypes.SHARE_CURRENT_PAGE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHARE_CURRENT_PAGE),
    timestamp: Schema.Number
  }),

  [MessageTypes.SHARE_SLIDE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHARE_SLIDE),
    timestamp: Schema.Number
  }),

  // Browser navigation commands
  [MessageTypes.GO_BACK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.GO_BACK),
    timestamp: Schema.Number
  }),

  [MessageTypes.GO_FORWARD]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.GO_FORWARD),
    timestamp: Schema.Number
  }),

  [MessageTypes.RELOAD]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.RELOAD),
    timestamp: Schema.Number
  }),

  // View commands
  [MessageTypes.ZOOM_IN]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.ZOOM_IN),
    timestamp: Schema.Number
  }),

  [MessageTypes.ZOOM_OUT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.ZOOM_OUT),
    timestamp: Schema.Number
  }),

  [MessageTypes.RESET_ZOOM]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.RESET_ZOOM),
    timestamp: Schema.Number
  }),

  [MessageTypes.SCROLL_TO_TOP]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SCROLL_TO_TOP),
    timestamp: Schema.Number
  }),

  [MessageTypes.SCROLL_TO_BOTTOM]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SCROLL_TO_BOTTOM),
    timestamp: Schema.Number
  }),

  [MessageTypes.TOGGLE_AUDIO_MUTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TOGGLE_AUDIO_MUTE),
    timestamp: Schema.Number
  }),

  [MessageTypes.TOGGLE_DEVELOPER_TOOLS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TOGGLE_DEVELOPER_TOOLS),
    timestamp: Schema.Number
  }),

  [MessageTypes.FIND_IN_PAGE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.FIND_IN_PAGE),
    query: Schema.optional(Schema.String),
    forward: Schema.optional(Schema.Boolean),
    findNext: Schema.optional(Schema.Boolean),
    matchCase: Schema.optional(Schema.Boolean),
    timestamp: Schema.Number
  }),

  [MessageTypes.INSPECT_ELEMENT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.INSPECT_ELEMENT),
    x: Schema.optional(Schema.Number),
    y: Schema.optional(Schema.Number),
    timestamp: Schema.Number
  }),

  [MessageTypes.OPEN_COMMAND_BAR]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_COMMAND_BAR),
    initialSelectedItem: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  [MessageTypes.CLOSE_COMMAND_BAR]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.CLOSE_COMMAND_BAR),
    timestamp: Schema.Number
  }),

  // Add new payload type for reordering
  [MessageTypes.TASK_OBJECT_REORDERED]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_OBJECT_REORDERED),
    taskId: Schema.String,
    objectId: Schema.String,
    rank: Schema.Number,
    timestamp: Schema.Number
  }),

  // Add schema definitions for context menu messages
  [MessageTypes.SUMMARIZE_TEXT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SUMMARIZE_TEXT),
    timestamp: Schema.Number
  }),

  [MessageTypes.SUMMARIZE_PAGE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SUMMARIZE_PAGE),
    timestamp: Schema.Number
  }),

  [MessageTypes.VIEW_SOURCE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.VIEW_SOURCE),
    timestamp: Schema.Number
  }),

  [MessageTypes.COPY_SELECTION]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.COPY_SELECTION),
    timestamp: Schema.Number
  }),

  [MessageTypes.CUT_SELECTION]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.CUT_SELECTION),
    timestamp: Schema.Number
  }),

  [MessageTypes.SELECT_ALL]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SELECT_ALL),
    timestamp: Schema.Number
  }),

  [MessageTypes.PASTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.PASTE),
    timestamp: Schema.Number
  }),

  [MessageTypes.PASTE_AND_MATCH_STYLE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.PASTE_AND_MATCH_STYLE),
    timestamp: Schema.Number
  }),

  [MessageTypes.COPY_LINK_ADDRESS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.COPY_LINK_ADDRESS),
    timestamp: Schema.Number
  }),

  [MessageTypes.OPEN_IMAGE_NEW_TAB]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_IMAGE_NEW_TAB),
    timestamp: Schema.Number
  }),

  [MessageTypes.COPY_IMAGE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.COPY_IMAGE),
    timestamp: Schema.Number
  }),

  [MessageTypes.SAVE_IMAGE_AS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SAVE_IMAGE_AS),
    timestamp: Schema.Number
  }),

  [MessageTypes.EXECUTE_SEARCH]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.EXECUTE_SEARCH),
    query: Schema.String,
    objectId: Schema.optional(Schema.String),
    newTab: Schema.optional(Schema.Boolean),
    timestamp: Schema.Number
  }),

  [MessageTypes.OPEN_LINK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_LINK),
    url: Schema.String,
    newTab: Schema.optional(Schema.Boolean),
    objectId: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_CREATE_AND_START]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_CREATE_AND_START),
    input: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.TASK_UPDATE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.TASK_UPDATE),
    taskId: Schema.String,
    name: Schema.optional(Schema.String),
    emoji: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  // Add new payloads for object navigation
  [MessageTypes.GO_TO_NEXT_OBJECT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.GO_TO_NEXT_OBJECT),
    timestamp: Schema.Number
  }),

  [MessageTypes.GO_TO_PREVIOUS_OBJECT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.GO_TO_PREVIOUS_OBJECT),
    timestamp: Schema.Number
  }),

  [MessageTypes.EXECUTE_URL]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.EXECUTE_URL),
    url: Schema.String,
    newTab: Schema.optional(Schema.Boolean),
    timestamp: Schema.Number
  }),

  // Add payload schemas for the new message types
  [MessageTypes.DUPLICATE_OBJECT_TO_TASK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.DUPLICATE_OBJECT_TO_TASK),
    objectId: Schema.String,
    targetTaskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.MOVE_OBJECT_TO_TASK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.MOVE_OBJECT_TO_TASK),
    objectId: Schema.String,
    targetTaskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.DUPLICATE_CURRENT_OBJECT_TO_TASK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.DUPLICATE_CURRENT_OBJECT_TO_TASK),
    targetTaskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.MOVE_CURRENT_OBJECT_TO_TASK]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.MOVE_CURRENT_OBJECT_TO_TASK),
    targetTaskId: Schema.String,
    timestamp: Schema.Number
  }),

  // Add the new payload for OPEN_SLIDE_FOLDER
  [MessageTypes.OPEN_SLIDE_FOLDER]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.OPEN_SLIDE_FOLDER),
    timestamp: Schema.Number
  }),

  // Add schema definition for the new message type
  [MessageTypes.UPLOAD_FILE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.UPLOAD_FILE),
    filename: Schema.String,
    data: Schema.String, // Base64 encoded file data
    taskId: Schema.optional(Schema.String),
    mimeType: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  // Add schema definition for the SAVE_NOTE message type
  [MessageTypes.SAVE_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SAVE_NOTE),
    noteId: Schema.String,
    content: Schema.String,
    timestamp: Schema.Number
  }),

  // Add schema definitions for task note commands
  [MessageTypes.SHOW_TASK_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHOW_TASK_NOTE),
    taskId: Schema.String,
    timestamp: Schema.Number
  }),

  [MessageTypes.HIDE_TASK_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.HIDE_TASK_NOTE),
    timestamp: Schema.Number
  }),

  [MessageTypes.SHOW_CURRENT_TASK_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHOW_CURRENT_TASK_NOTE),
    timestamp: Schema.Number
  }),

  // Add schema definition for SAVE_SELECTION_TO_NOTE
  [MessageTypes.SAVE_SELECTION_TO_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SAVE_SELECTION_TO_NOTE),
    text: Schema.String,
    blockType: Schema.optional(Schema.String),
    taskId: Schema.optional(Schema.String),
    source: Schema.optional(Schema.String),
    context: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  // Add schema definition for SAVE_SELECTED_TEXT_TO_NOTE
  [MessageTypes.SAVE_SELECTED_TEXT_TO_NOTE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SAVE_SELECTED_TEXT_TO_NOTE),
    timestamp: Schema.Number
  }),

  // Add schema definitions for find bar messages
  [MessageTypes.SHOW_FIND_BAR]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.SHOW_FIND_BAR),
    query: Schema.optional(Schema.String),
    timestamp: Schema.Number
  }),

  [MessageTypes.HIDE_FIND_BAR]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.HIDE_FIND_BAR),
    timestamp: Schema.Number
  }),

  [MessageTypes.FIND_NEXT]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.FIND_NEXT),
    timestamp: Schema.Number
  }),

  [MessageTypes.FIND_PREVIOUS]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.FIND_PREVIOUS),
    timestamp: Schema.Number
  }),

  [MessageTypes.STOP_FIND_IN_PAGE]: Schema.Struct({
    _tag: Schema.Literal(MessageTypes.STOP_FIND_IN_PAGE),
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
export type TaskSwitchedMessage = TypedMessage<typeof MessageTypes.TASK_SWITCHED>
export type TaskExitedMessage = TypedMessage<typeof MessageTypes.TASK_EXITED>
export type TaskCompletedMessage = TypedMessage<typeof MessageTypes.TASK_COMPLETED>
export type TaskCompletedAndNextMessage = TypedMessage<typeof MessageTypes.TASK_COMPLETED_AND_NEXT>
export type ObjectSelectedMessage = TypedMessage<typeof MessageTypes.OBJECT_SELECTED>
export type ObjectRemovedMessage = TypedMessage<typeof MessageTypes.OBJECT_REMOVED>
export type CurrentObjectRemovedMessage = TypedMessage<typeof MessageTypes.CURRENT_OBJECT_REMOVED>
export type SearchPerformedMessage = TypedMessage<typeof MessageTypes.SEARCH_PERFORMED>
export type CheckForUpdatesMessage = TypedMessage<typeof MessageTypes.CHECK_FOR_UPDATES>
export type InvalidateQueryMessage = TypedMessage<typeof MessageTypes.INVALIDATE_QUERY>
export type InvalidateTaskMessage = TypedMessage<typeof MessageTypes.INVALIDATE_TASK>
export type InvalidateTaskObjectsMessage = TypedMessage<typeof MessageTypes.INVALIDATE_TASK_OBJECTS>
export type InvalidateObjectMessage = TypedMessage<typeof MessageTypes.INVALIDATE_OBJECT>
export type TaskCreateAndStartMessage = TypedMessage<typeof MessageTypes.TASK_CREATE_AND_START>

// IPC Command message types
export type SetWindowTitleMessage = TypedMessage<typeof MessageTypes.SET_WINDOW_TITLE>
export type ShowUpdateDialogMessage = TypedMessage<typeof MessageTypes.SHOW_UPDATE_DIALOG>
export type QuitMessage = TypedMessage<typeof MessageTypes.QUIT>
export type GetAppInfoMessage = TypedMessage<typeof MessageTypes.GET_APP_INFO>
export type ToggleThemeMessage = TypedMessage<typeof MessageTypes.TOGGLE_THEME>
export type OpenExternalLinkMessage = TypedMessage<typeof MessageTypes.OPEN_EXTERNAL_LINK>

// Browser navigation message types
export type GoBackMessage = TypedMessage<typeof MessageTypes.GO_BACK>
export type GoForwardMessage = TypedMessage<typeof MessageTypes.GO_FORWARD>
export type ReloadMessage = TypedMessage<typeof MessageTypes.RELOAD>
export type ShareCurrentPageMessage = TypedMessage<typeof MessageTypes.SHARE_CURRENT_PAGE>
export type ShareSlideMessage = TypedMessage<typeof MessageTypes.SHARE_SLIDE>

// View command message types
export type ZoomInMessage = TypedMessage<typeof MessageTypes.ZOOM_IN>
export type ZoomOutMessage = TypedMessage<typeof MessageTypes.ZOOM_OUT>
export type ResetZoomMessage = TypedMessage<typeof MessageTypes.RESET_ZOOM>
export type ScrollToTopMessage = TypedMessage<typeof MessageTypes.SCROLL_TO_TOP>
export type ScrollToBottomMessage = TypedMessage<typeof MessageTypes.SCROLL_TO_BOTTOM>
export type ToggleAudioMuteMessage = TypedMessage<typeof MessageTypes.TOGGLE_AUDIO_MUTE>
export type ToggleDeveloperToolsMessage = TypedMessage<typeof MessageTypes.TOGGLE_DEVELOPER_TOOLS>
export type FindInPageMessage = TypedMessage<typeof MessageTypes.FIND_IN_PAGE>
export type InspectElementMessage = TypedMessage<typeof MessageTypes.INSPECT_ELEMENT>

// Slide workflow message types
export type SuggestionSelectedMessage = TypedMessage<typeof MessageTypes.SUGGESTION_SELECTED>
export type ExitSuggestionsMessage = TypedMessage<typeof MessageTypes.EXIT_SUGGESTIONS>
export type EnterFocusModeMessage = TypedMessage<typeof MessageTypes.ENTER_FOCUS_MODE>
export type CopyCurrentUrlMessage = TypedMessage<typeof MessageTypes.COPY_CURRENT_URL>

// Action bar message types
export type OpenCommandBarMessage = TypedMessage<typeof MessageTypes.OPEN_COMMAND_BAR>
export type CloseCommandBarMessage = TypedMessage<typeof MessageTypes.CLOSE_COMMAND_BAR>

// Add type for the new message
export type TaskObjectReorderedMessage = TypedMessage<typeof MessageTypes.TASK_OBJECT_REORDERED>

// Add type definitions for context menu messages
export type SummarizeTextMessage = TypedMessage<typeof MessageTypes.SUMMARIZE_TEXT>
export type SummarizePageMessage = TypedMessage<typeof MessageTypes.SUMMARIZE_PAGE>
export type ViewSourceMessage = TypedMessage<typeof MessageTypes.VIEW_SOURCE>
export type CopySelectionMessage = TypedMessage<typeof MessageTypes.COPY_SELECTION>
export type CutSelectionMessage = TypedMessage<typeof MessageTypes.CUT_SELECTION>
export type SelectAllMessage = TypedMessage<typeof MessageTypes.SELECT_ALL>
export type PasteMessage = TypedMessage<typeof MessageTypes.PASTE>
export type PasteAndMatchStyleMessage = TypedMessage<typeof MessageTypes.PASTE_AND_MATCH_STYLE>
export type CopyLinkAddressMessage = TypedMessage<typeof MessageTypes.COPY_LINK_ADDRESS>
export type OpenImageNewTabMessage = TypedMessage<typeof MessageTypes.OPEN_IMAGE_NEW_TAB>
export type CopyImageMessage = TypedMessage<typeof MessageTypes.COPY_IMAGE>
export type SaveImageAsMessage = TypedMessage<typeof MessageTypes.SAVE_IMAGE_AS>

// Add type for the new message
export type ExecuteSearchMessage = TypedMessage<typeof MessageTypes.EXECUTE_SEARCH>
export type OpenLinkMessage = TypedMessage<typeof MessageTypes.OPEN_LINK>

// Add type for the new message
export type TaskUpdateMessage = TypedMessage<typeof MessageTypes.TASK_UPDATE>

// Add new payload type for EXECUTE_URL
export type ExecuteUrlMessage = TypedMessage<typeof MessageTypes.EXECUTE_URL>

// Add type definitions for the new messages
export type DuplicateObjectToTaskMessage = TypedMessage<
  typeof MessageTypes.DUPLICATE_OBJECT_TO_TASK
>
export type MoveObjectToTaskMessage = TypedMessage<typeof MessageTypes.MOVE_OBJECT_TO_TASK>
export type DuplicateCurrentObjectToTaskMessage = TypedMessage<
  typeof MessageTypes.DUPLICATE_CURRENT_OBJECT_TO_TASK
>
export type MoveCurrentObjectToTaskMessage = TypedMessage<
  typeof MessageTypes.MOVE_CURRENT_OBJECT_TO_TASK
>

// Add type and creator for the new message
export type OpenSlideFolderMessage = TypedMessage<typeof MessageTypes.OPEN_SLIDE_FOLDER>

// Add type definition for the new message
export type UploadFileMessage = TypedMessage<typeof MessageTypes.UPLOAD_FILE>

// Add type definition for the new message
export type SaveNoteMessage = TypedMessage<typeof MessageTypes.SAVE_NOTE>

// Add type definitions for task note messages
export type ShowTaskNoteMessage = TypedMessage<typeof MessageTypes.SHOW_TASK_NOTE>
export type HideTaskNoteMessage = TypedMessage<typeof MessageTypes.HIDE_TASK_NOTE>
export type ShowCurrentTaskNoteMessage = TypedMessage<typeof MessageTypes.SHOW_CURRENT_TASK_NOTE>
export type SaveSelectionToNoteMessage = TypedMessage<typeof MessageTypes.SAVE_SELECTION_TO_NOTE>
export type SaveSelectedTextToNoteMessage = TypedMessage<
  typeof MessageTypes.SAVE_SELECTED_TEXT_TO_NOTE
>

// Add type definitions for find bar messages
export type ShowFindBarMessage = TypedMessage<typeof MessageTypes.SHOW_FIND_BAR>
export type HideFindBarMessage = TypedMessage<typeof MessageTypes.HIDE_FIND_BAR>
export type FindNextMessage = TypedMessage<typeof MessageTypes.FIND_NEXT>
export type FindPreviousMessage = TypedMessage<typeof MessageTypes.FIND_PREVIOUS>
export type StopFindInPageMessage = TypedMessage<typeof MessageTypes.STOP_FIND_IN_PAGE>

// Generic type guard
function isMessageOfType<T extends MessageType>(
  message: Message,
  type: T,
  check: (data: any) => boolean
): message is TypedMessage<T> {
  return message._tag === type && check(message)
}

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

// Generate message creator functions
export const createAppReady = () =>
  createMessage(MessageTypes.APP_READY, {
    timestamp: Date.now()
  })

export const createTaskStart = (taskId: string) =>
  createMessage(MessageTypes.TASK_START, {
    taskId,
    timestamp: Date.now()
  })

export const createTaskContinue = (taskId: string, prompt: string, sessionId?: string) =>
  createMessage(MessageTypes.TASK_CONTINUE, {
    taskId,
    prompt,
    sessionId,
    timestamp: Date.now()
  })

export const createTaskSwitched = (fromTaskId: string, toTaskId: string) =>
  createMessage(MessageTypes.TASK_SWITCHED, {
    fromTaskId,
    toTaskId,
    timestamp: Date.now()
  })

export const createTaskExited = (taskId: string, skip?: boolean) =>
  createMessage(MessageTypes.TASK_EXITED, {
    taskId,
    skip,
    timestamp: Date.now()
  })

export const createTaskCompleted = (taskId: string) =>
  createMessage(MessageTypes.TASK_COMPLETED, {
    taskId,
    timestamp: Date.now()
  })

export const createTaskCompletedAndNext = (taskId: string) =>
  createMessage(MessageTypes.TASK_COMPLETED_AND_NEXT, {
    taskId,
    timestamp: Date.now()
  })

export const createObjectSelected = (objectId: string) =>
  createMessage(MessageTypes.OBJECT_SELECTED, {
    objectId,
    timestamp: Date.now()
  })

export const createObjectRemoved = (objectId: string) =>
  createMessage(MessageTypes.OBJECT_REMOVED, {
    objectId,
    timestamp: Date.now()
  })

export const createCurrentObjectRemoved = () =>
  createMessage(MessageTypes.CURRENT_OBJECT_REMOVED, {
    timestamp: Date.now()
  })

export const createSearchPerformed = (query: string) =>
  createMessage(MessageTypes.SEARCH_PERFORMED, {
    query,
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

export const createInvalidateTask = (taskId: string) =>
  createMessage(MessageTypes.INVALIDATE_TASK, {
    taskId,
    timestamp: Date.now()
  })

export const createInvalidateTaskObjects = (taskId: string) =>
  createMessage(MessageTypes.INVALIDATE_TASK_OBJECTS, {
    taskId,
    timestamp: Date.now()
  })

export const createInvalidateObject = (taskId: string, objectId: string) =>
  createMessage(MessageTypes.INVALIDATE_OBJECT, {
    taskId,
    objectId,
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

export const createToggleTheme = () =>
  createMessage(MessageTypes.TOGGLE_THEME, {
    timestamp: Date.now()
  })

export const createOpenExternalLink = (url: string) =>
  createMessage(MessageTypes.OPEN_EXTERNAL_LINK, {
    url,
    timestamp: Date.now()
  })

export const createEnterFocusMode = () =>
  createMessage(MessageTypes.ENTER_FOCUS_MODE, {
    timestamp: Date.now()
  })

export const createSuggestionSelected = (suggestionId: string) =>
  createMessage(MessageTypes.SUGGESTION_SELECTED, {
    suggestionId,
    timestamp: Date.now()
  })

export const createExitSuggestions = () =>
  createMessage(MessageTypes.EXIT_SUGGESTIONS, {
    timestamp: Date.now()
  })

export const createCopyCurrentUrl = () =>
  createMessage(MessageTypes.COPY_CURRENT_URL, {
    timestamp: Date.now()
  })

export const createOpenCommandBar = (initialSelectedItem?: string) =>
  createMessage(MessageTypes.OPEN_COMMAND_BAR, {
    initialSelectedItem,
    timestamp: Date.now()
  })

export const createCloseCommandBar = () =>
  createMessage(MessageTypes.CLOSE_COMMAND_BAR, {
    timestamp: Date.now()
  })

// Browser navigation commands
export const createGoBack = () =>
  createMessage(MessageTypes.GO_BACK, {
    timestamp: Date.now()
  })

export const createGoForward = () =>
  createMessage(MessageTypes.GO_FORWARD, {
    timestamp: Date.now()
  })

export const createReload = () =>
  createMessage(MessageTypes.RELOAD, {
    timestamp: Date.now()
  })

export const createShareCurrentPage = () =>
  createMessage(MessageTypes.SHARE_CURRENT_PAGE, {
    timestamp: Date.now()
  })

export const createShareSlide = () =>
  createMessage(MessageTypes.SHARE_SLIDE, {
    timestamp: Date.now()
  })

// View commands
export const createZoomIn = () =>
  createMessage(MessageTypes.ZOOM_IN, {
    timestamp: Date.now()
  })

export const createZoomOut = () =>
  createMessage(MessageTypes.ZOOM_OUT, {
    timestamp: Date.now()
  })

export const createResetZoom = () =>
  createMessage(MessageTypes.RESET_ZOOM, {
    timestamp: Date.now()
  })

export const createScrollToTop = () =>
  createMessage(MessageTypes.SCROLL_TO_TOP, {
    timestamp: Date.now()
  })

export const createScrollToBottom = () =>
  createMessage(MessageTypes.SCROLL_TO_BOTTOM, {
    timestamp: Date.now()
  })

export const createToggleAudioMute = () =>
  createMessage(MessageTypes.TOGGLE_AUDIO_MUTE, {
    timestamp: Date.now()
  })

export const createToggleDeveloperTools = () =>
  createMessage(MessageTypes.TOGGLE_DEVELOPER_TOOLS, {
    timestamp: Date.now()
  })

export const createFindInPage = (
  query?: string,
  forward?: boolean,
  findNext?: boolean,
  matchCase?: boolean
) =>
  createMessage(MessageTypes.FIND_IN_PAGE, {
    query,
    forward,
    findNext,
    matchCase,
    timestamp: Date.now()
  })

export const createInspectElement = (x?: number, y?: number) =>
  createMessage(MessageTypes.INSPECT_ELEMENT, {
    x,
    y,
    timestamp: Date.now()
  })

// Add creator function for the new message
export const createTaskObjectReordered = (taskId: string, objectId: string, rank: number) =>
  createMessage(MessageTypes.TASK_OBJECT_REORDERED, {
    taskId,
    objectId,
    rank,
    timestamp: Date.now()
  })

// Add creator functions for context menu messages
export const createSummarizeText = () =>
  createMessage(MessageTypes.SUMMARIZE_TEXT, {
    timestamp: Date.now()
  })

export const createSummarizePage = () =>
  createMessage(MessageTypes.SUMMARIZE_PAGE, {
    timestamp: Date.now()
  })

export const createViewSource = () =>
  createMessage(MessageTypes.VIEW_SOURCE, {
    timestamp: Date.now()
  })

export const createCopySelection = () =>
  createMessage(MessageTypes.COPY_SELECTION, {
    timestamp: Date.now()
  })

export const createCutSelection = () =>
  createMessage(MessageTypes.CUT_SELECTION, {
    timestamp: Date.now()
  })

export const createSelectAll = () =>
  createMessage(MessageTypes.SELECT_ALL, {
    timestamp: Date.now()
  })

export const createPaste = () =>
  createMessage(MessageTypes.PASTE, {
    timestamp: Date.now()
  })

export const createPasteAndMatchStyle = () =>
  createMessage(MessageTypes.PASTE_AND_MATCH_STYLE, {
    timestamp: Date.now()
  })

export const createCopyLinkAddress = () =>
  createMessage(MessageTypes.COPY_LINK_ADDRESS, {
    timestamp: Date.now()
  })

export const createOpenImageNewTab = () =>
  createMessage(MessageTypes.OPEN_IMAGE_NEW_TAB, {
    timestamp: Date.now()
  })

export const createCopyImage = () =>
  createMessage(MessageTypes.COPY_IMAGE, {
    timestamp: Date.now()
  })

export const createSaveImageAs = () =>
  createMessage(MessageTypes.SAVE_IMAGE_AS, {
    timestamp: Date.now()
  })

// Create a new function for EXECUTE_SEARCH
export const createExecuteSearch = (query: string, objectId?: string, newTab?: boolean) =>
  createMessage(MessageTypes.EXECUTE_SEARCH, {
    query,
    objectId,
    newTab,
    timestamp: Date.now()
  })

export const createOpenLink = (url: string, newTab?: boolean, objectId?: string) =>
  createMessage(MessageTypes.OPEN_LINK, {
    url,
    newTab,
    objectId,
    timestamp: Date.now()
  })

// Add creator function for the new message
export const createTaskCreateAndStart = (input: string) =>
  createMessage(MessageTypes.TASK_CREATE_AND_START, {
    input,
    timestamp: Date.now()
  })

// Add creator functions for the new messages
export const createTaskUpdate = (taskId: string, updates: { name?: string; emoji?: string }) =>
  createMessage(MessageTypes.TASK_UPDATE, {
    taskId,
    ...updates,
    timestamp: Date.now()
  })

// Create message functions
export const createGoToNextObject = () =>
  createMessage(MessageTypes.GO_TO_NEXT_OBJECT, {
    timestamp: Date.now()
  })

export const createGoToPreviousObject = () =>
  createMessage(MessageTypes.GO_TO_PREVIOUS_OBJECT, {
    timestamp: Date.now()
  })

// Add creator function for EXECUTE_URL
export const createExecuteUrl = (url: string, newTab: boolean = false) =>
  createMessage(MessageTypes.EXECUTE_URL, {
    url,
    newTab,
    timestamp: Date.now()
  })

// Add creator functions for the new messages
export const createDuplicateObjectToTask = (objectId: string, targetTaskId: string) =>
  createMessage(MessageTypes.DUPLICATE_OBJECT_TO_TASK, {
    objectId,
    targetTaskId,
    timestamp: Date.now()
  })

export const createMoveObjectToTask = (objectId: string, targetTaskId: string) =>
  createMessage(MessageTypes.MOVE_OBJECT_TO_TASK, {
    objectId,
    targetTaskId,
    timestamp: Date.now()
  })

export const createDuplicateCurrentObjectToTask = (targetTaskId: string) =>
  createMessage(MessageTypes.DUPLICATE_CURRENT_OBJECT_TO_TASK, {
    targetTaskId,
    timestamp: Date.now()
  })

export const createMoveCurrentObjectToTask = (targetTaskId: string) =>
  createMessage(MessageTypes.MOVE_CURRENT_OBJECT_TO_TASK, {
    targetTaskId,
    timestamp: Date.now()
  })

// Creator function for OPEN_SLIDE_FOLDER
export const createOpenSlideFolder = () =>
  createMessage(MessageTypes.OPEN_SLIDE_FOLDER, {
    timestamp: Date.now()
  })

// Add creator function for UPLOAD_FILE
export const createUploadFile = (
  filename: string,
  data: string,
  taskId?: string,
  mimeType?: string
) =>
  createMessage(MessageTypes.UPLOAD_FILE, {
    filename,
    data,
    taskId,
    mimeType,
    timestamp: Date.now()
  })

// Add creator function for SAVE_NOTE
export const createSaveNote = (noteId: string, content: string) =>
  createMessage(MessageTypes.SAVE_NOTE, {
    noteId,
    content,
    timestamp: Date.now()
  })

// Add creator functions for task note commands
export const createShowTaskNote = (taskId: string) =>
  createMessage(MessageTypes.SHOW_TASK_NOTE, {
    taskId,
    timestamp: Date.now()
  })

export const createHideTaskNote = () =>
  createMessage(MessageTypes.HIDE_TASK_NOTE, {
    timestamp: Date.now()
  })

export const createShowCurrentTaskNote = () =>
  createMessage(MessageTypes.SHOW_CURRENT_TASK_NOTE, {
    timestamp: Date.now()
  })

export const createSaveSelectionToNote = (
  text: string,
  blockType?: string,
  taskId?: string,
  source?: string,
  context?: string
) =>
  createMessage(MessageTypes.SAVE_SELECTION_TO_NOTE, {
    text,
    blockType,
    taskId,
    source,
    context,
    timestamp: Date.now()
  })

export const createSaveSelectedTextToNote = () =>
  createMessage(MessageTypes.SAVE_SELECTED_TEXT_TO_NOTE, {
    timestamp: Date.now()
  })

// Add creator functions for find bar commands
export const createShowFindBar = (query?: string) =>
  createMessage(MessageTypes.SHOW_FIND_BAR, {
    query,
    timestamp: Date.now()
  })

export const createHideFindBar = () =>
  createMessage(MessageTypes.HIDE_FIND_BAR, {
    timestamp: Date.now()
  })

export const createFindNext = () =>
  createMessage(MessageTypes.FIND_NEXT, {
    timestamp: Date.now()
  })

export const createFindPrevious = () =>
  createMessage(MessageTypes.FIND_PREVIOUS, {
    timestamp: Date.now()
  })

export const createStopFindInPage = () =>
  createMessage(MessageTypes.STOP_FIND_IN_PAGE, {
    timestamp: Date.now()
  })

// Utility function to serialize a message for IPC transfer
export const serializeMessage = (message: Message): string => {
  const encoded = Schema.encodeSync(MessageSchema)(message)
  return JSON.stringify(encoded)
}

// Utility function to deserialize a message from IPC transfer
export const deserializeMessage = (serialized: string): Message => {
  const parsed = JSON.parse(serialized)
  return Schema.decodeUnknownSync(MessageSchema)(parsed)
}

export const deserializeMessageObject = (serialized: any): Message => {
  return Schema.decodeUnknownSync(MessageSchema)(serialized)
}

// Type guards for each message type
export const isTaskStart = (
  message: Message
): message is TypedMessage<typeof MessageTypes.TASK_START> =>
  isMessageOfType(
    message,
    MessageTypes.TASK_START,
    (data) => data._tag === MessageTypes.TASK_START && 'taskId' in data && 'timestamp' in data
  )

// Add new helper type and function for command creation
export type CommandProps = Record<string, any>

export const createCommand = (command: MessageType, props: CommandProps = {}) => {
  const timestamp = Date.now()

  // Create base message structure
  const baseMessage = {
    _tag: command,
    timestamp,
    ...props
  }

  // Return the typed message
  return baseMessage as Message
}

// Helper to serialize command for sending
export const createSerializedCommand = (command: MessageType, props: CommandProps = {}) => {
  const message = createCommand(command, props)
  return serializeMessage(message)
}
