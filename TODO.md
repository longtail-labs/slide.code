# GOAL:

- [ ] Starting using everyday June 2nd
- [ ] Ship June 16
- [ ] Make a video and share on twitter, reddit June 16th
- [ ] Able to start a task and work on ADHD course
- [ ] Work on Framer site or fork Icon.com?
- [ ] Get going on Twitter

- [ ] keyboard shortcut for quit task and complete
- [ ] Handle broken database?
- [x] Action bar sometimes focuses on the bottom option
- [ ] Privacy Policy
- [x] NOTE
  - [x] Dark mode
  - [x] attaching files?
- [ ] Context Menu
  - [ ] Add things to note
- [x] Closing object doesn't close the view, its still present. are all closed objects still there?
- [ ] Action Bar
  - [x] Somehow differentiate NEW TAB & CURRENT TAB actions
  - [x] Close object
  - [ ] Complete task
  - [ ] Skip task
- [ ] Planning screen
  - [ ] Action bar input text bolder
- [ ] Laggy closing a task
- [ ] Laggy opening a new task
- [ ] Note loading is slow
- [x] Able to launch links
- [ ] Scrolling is janky
- [x] should be able to open in a new tab cmd-t
- [x] cmd-l current tab
- [x] cmd-p etc take time to load in the tasks / shows other stuff in dropdown
- [ ] option-space hotkey
- [x] Update broken
- [x] objects stopped showing
- [ ] navigating sometimes breaks
- [ ] for some reason view objects stopped working
- [ ] Rank is duplicating?
- [ ] wh  are duplicate objects?
- [ ] write tests for that
- [ ] Sort planning not by last accessed but edited?
- [ ] Cmd-t hijacked in note
- [ ] Opening task quite slow
- [ ] Show audio playing indicator
- [ ] Create google tab on task creation
- [ ] Need to save inside navigation not just outer?
- [ ] 9 props}=>[Array(4)], {9 props}=>[Array(1)])
timestamp=2025-06-05T15:36:19.881Z level=ERROR fiber=#833 message="will-quit: Error disposing runtime:" cause="TypeError: Object has been destroyed
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:110138:35
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:10457:42
TypeError: Object has been destroyed
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:110037:74
TypeError: Cannot read properties of undefined (reading 'isDestroyed')
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:110270:40
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:10457:42
TypeError: Cannot read properties of undefined (reading 'isDestroyed')
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:110436:40
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:10457:42
TypeError: Cannot read properties of undefined (reading 'isDestroyed')
    at file:///Users/jordan/Documents/startups/Polka/Polka/apps/main/dist/index.js:110620:40
    at file:///Users/jordan/Documents/startups/Polka/Polka/a

TODO:

- [x] Do I need to create BaseWindows for ActionBar and ContextMenu like I did before?
- [x] I don't know why but this seems to work without it lol, great
- [x] Fatal error in V8: v8::HandleScope::CreateHandle() Cannot create a handle without a HandleScope
- [x] Launch time of links
- [x] Planning -> Working -> Next
  - [x] Loading on planning screen etc
- [ ] Hook up subscriptions
  - [ ] Icon indicating subscribed
- [x] Clean up settings page, dont really need it now
- [x] Able to create a new task from planning view
  - [x] What to show on first launching a new task?
- [x] Make sure update button shows
- [x] Cmd-click on link to open in new tab
- [x] Hide context menu and action bar on blur / esc
- [x] Make sure last updated is updating right 
- [x] When open a new link why is it only showing the URL and not the title????
- [x] Should I kill the IPC REFS?
- [x] Global keyboard shortcut
- [x] keyboard shortcut for moving between tabs
- [x] Update UI when new update
- [x] koffi update sparkle trigger broken, but I think background updates is working?
- [x] When open new link in tab in goes to that tab
- [x] No default lastAccessedAt
- [x] Close action bar after action
- [x] changing theme not persisting
- [x] Update keyboard shortcuts
- [x] Move toast up
- [x] Instead of all of these, one command to launch command bar with a certain selection
  - QUICK_SWITCH_TASK: 'QuickSwitchTask',
    QUICK_SWITCH_OBJECT: 'QuickSwitchObject',
    OPEN_OBJECT_COMMAND_BAR: 'OpenObjectCommandBar',
    OPEN_COMMAND_BAR: 'OpenCommandBar',
    UPDATE_TASK_NAME_COMMAND_BAR: 'UpdateTaskNameCommandBar',
    UPDATE_TASK_EMOJI_COMMAND_BAR: 'UpdateTaskEmojiCommandBar',


FILES:

- [x] Save original filename?
- [x] TaskObject match schema not working properly, falls back to first one?
- [x] loadObjcet match failing too hmmmmmmm
- [x] its trying to set the domain etc?
- [ ] Test other file formats
- [x] [NavigationHandler] Error updating link title: KuzuServiceError: Failed to update link: Link with ID d21301cb-00bb-43f0-95b9-19843da60aa3 not found


NOTES:

- [ ] Large file
- [ ] stickey header and emoji update title?
- [x] don't show it in list.
- [x] should I not have it as part of other objects, note service?
- [ ] upload thing?
- [x] Click on task sidebar info it goes to note
- [ ] Add things to note from context menu
- [ ] Dark Mode
- [ ] Disable dragging files on
- [x] Starting text "playground"


TASK SIDEBAR:

- [x] Clicking on a sidebar item opens the object in action bar
- [x] Complete + Next and Skip button hooked up. keep it basic for now
- [x] Re order tasks
- [x] Hook up new page
- [x] Keyboard shortcuts show in action bar
- [x] select emoji shows in action bar
- [x] Hook up close button
- [x] ncaught TypeError: Cannot read properties of undefined (reading 'toString')
    at Proxy.reorderItems (eval at <anonymous> (client.js:5:1106), <anonymous>:136:33)

    

CONTEXT MENU:
- [ ] Styling ugly
- [x] Copy Link
- [x] Copy Text
- [x] Paste
- [x] Cut
- [x] Save Image
- [x] Copy image url

ACTION BAR:

- [ ] Somehow differentiate NEW TAB & CURRENT TAB actions
- [ ] Footer doesn't need navigate, select
- [ ] CMD-K for more actions
- [x] Dismiss when press outside it
- [ ] Footer styling better
- [x] Action bar objects showing wrong title
  - [x] title || name
- [x] ESC to dismiss, back button to navigate back
- [ ] Hold CMD to open new tab and keep the action bar open
- [x] Task sidebar issues
- [ ] Move object to task
- [ ] Duplicate object to task
- [ ] Close object
- [ ] Complete task
- [ ] Skip task

Find on page
  


STYLING:

- [x] Toast ugly
- [x] Bolder text in the filter buttons
- [x] Dark mode not applying to the WebContentsView?
- [x] Task Sidebar
  - [x] item darker when selected
  - [x] Less padding in the task info view
  - [x] header dark mode not applying
- [x] Width of task item wider
- [x] x button overlap
- [x] needs to be darker
- [x] Spacing on task sidebar
- [x] Info box text bolder

FUNCTIONALITY:
- [x] Open Link in new tab
- [x] Copy Text
- [x] Copy Link
- [x] Check for Updates
- [x] New Tab
- [x] Quick Switch Tab
- [x] Command Up/Down prev/next object
- [x] Quick Switch Task
- [x] Copy Image URL
- [x] Save Image
- [x] Share
- [x] Back and forward
- [x] Cmd-R: refresh
- [x] Cmd-<left right>: back forward
  - [x] Cmd-[]



--------------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------------------

LATER:

- [ ] Why does action bar alpine seem to persist the active option?
- [ ] AG Grid
- [ ] Chrome extensions support
  - [ ] Password autofill support
- [ ] Log viewer 
- [ ] https://github.com/mathuo/dockview
- [ ] Change emoji from planning screen
- [ ] Conveyor protocols
- [ ] Global hotkey
- [ ] swipe trackpad back forward
- [ ] Featurebase
- [ ] Search page / Find on page
- [ ] Handle .node files
  - [ ] https://prosopo.io/blog/vite-node-files/
  - [ ] https://github.com/cyco130/vavite/tree/main/packages/node-loader
- [ ] Tabs
  - [ ] Close Tab
  - [ ] Close other tabs
  - [ ] Close all tabs
  - [ ] Change Icon
  - [ ] Rename
- [ ] Move / Duplicate to Task 
  - [ ] Select task
  - [ ] Create new task
- [ ] Keyboard Shortcuts
- [ ] Set as Default Browser
- [ ] Add crisp
- [ ] Weird theming on inital launch of web pages (dark mode etc)
- [ ] Full screen very laggy
- [ ] Copy Image
- [ ] KHD component too compact


- [ ] TOAST:

- [ ] Copy link url show share button and share sheet on click


- [ ]   https://fosdem.org/2025/schedule/event/fosdem-2025-4852-how-browsers-really-load-web-pages/
- [ ]   https://github.com/twibiral/obsidian-execute-code
- [ ]   https://github.com/get-convex/prosemirror-sync
- [ ]   https://github.com/Dhravya/apple-mcp/tree/main
- [ ]   https://github.com/brave/cookiemonster/blob/main/src/text-classification.mjs#L12
- [ ] Local model: https://github.com/huggingface/transformers.js/tree/main/examples/electron



* https://github.com/alex/what-happens-when
* * Keygen.sh
* mineful.com
* notdiamond
* portkey
* novita.ai
* openrouter
