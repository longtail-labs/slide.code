import React from 'react'

export function ChatSidebar() {
  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-text">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-lg">Chat</h2>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Placeholder for chat messages */}
        <div className="flex items-start space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="flex-1">
            <p className="font-semibold">AI Assistant</p>
            <p className="text-sm bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
              Hello! How can I help you today?
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="flex-1">
            <p className="font-semibold text-right">You</p>
            <p className="text-sm bg-blue-500 text-white rounded-lg p-2">
              Please revamp this component.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
