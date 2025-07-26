import React, { useState } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet'
import { IconPlus, IconTrash, IconPuzzle, IconX, IconClipboard } from '@tabler/icons-react'
import { useMcpServers } from '@slide.code/clients'
import type { McpServerConfig } from '@slide.code/schema'

interface McpSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const McpSidebar: React.FC<McpSidebarProps> = ({ isOpen, onClose }) => {
  const { mcpServers, addMcpServer, removeMcpServer, toggleMcpServer } = useMcpServers()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addMethod, setAddMethod] = useState<'form' | 'json'>('form')
  const [newServerName, setNewServerName] = useState('')
  const [newServerType, setNewServerType] = useState<'stdio' | 'sse' | 'http'>('stdio')
  const [newServerCommand, setNewServerCommand] = useState('')
  const [newServerArgs, setNewServerArgs] = useState('')
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerEnv, setNewServerEnv] = useState('')
  const [newServerHeaders, setNewServerHeaders] = useState('')
  const [jsonConfig, setJsonConfig] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Server display names for better UX
  const serverDisplayNames: Record<string, { displayName: string; description: string }> = {
    context7: {
      displayName: 'Context7',
      description: 'Upstash Context7 MCP Server for documentation access'
    }
  }

  const handleAddServer = () => {
    if (addMethod === 'json') {
      handleAddFromJson()
      return
    }

    if (!newServerName.trim()) return

    let config: any = {
      enabled: true
    }

    if (newServerType === 'stdio') {
      config = {
        ...config,
        command: newServerCommand,
        args: newServerArgs ? newServerArgs.split(' ').filter((arg) => arg.trim()) : [],
        env: newServerEnv ? JSON.parse(newServerEnv) : undefined
      }
    } else if (newServerType === 'sse' || newServerType === 'http') {
      config = {
        ...config,
        type: newServerType,
        url: newServerUrl,
        headers: newServerHeaders ? JSON.parse(newServerHeaders) : undefined
      }
    }

    addMcpServer(newServerName, config)

    // Reset form
    resetForm()
  }

  const handleAddFromJson = () => {
    setJsonError('')

    if (!jsonConfig.trim()) {
      setJsonError('Please paste a JSON configuration')
      return
    }

    let configToTry = jsonConfig.trim()

    // Common fix: If it looks like it's missing opening brace, try to add it
    if (configToTry.startsWith('"') && configToTry.includes(':') && !configToTry.startsWith('{')) {
      configToTry = '{' + configToTry
      if (!configToTry.endsWith('}')) {
        configToTry = configToTry + '}'
      }
    }

    try {
      const parsed = JSON.parse(configToTry)

      // Check if it's a single server config with name as key
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed)

        if (keys.length === 1) {
          // Format: { "serverName": { "command": "...", ...} }
          const serverName = keys[0]
          const serverConfig = parsed[serverName]

          if (typeof serverConfig === 'object') {
            addMcpServer(serverName, { ...serverConfig, enabled: true })
            resetForm()
            return
          }
        }

        // Format: { "command": "...", "args": [...], ...} - need server name
        if (parsed.command || parsed.url) {
          if (!newServerName.trim()) {
            setJsonError('Please provide a server name for this configuration')
            return
          }

          addMcpServer(newServerName, { ...parsed, enabled: true })
          resetForm()
          return
        }
      }

      setJsonError(
        'Invalid JSON format. Expected either {"serverName": {...}} or a direct server config.'
      )
    } catch (error) {
      const errorMsg = (error as Error).message
      let helpfulError = 'Invalid JSON: ' + errorMsg

      // Provide more helpful error messages for common issues
      if (errorMsg.includes('Unexpected token') || errorMsg.includes('position')) {
        if (jsonConfig.trim().startsWith('"') && !jsonConfig.trim().startsWith('{')) {
          helpfulError +=
            '\n\nTip: Missing opening curly brace { at the beginning. Your JSON should start with { and end with }.'
        } else if (!jsonConfig.trim().startsWith('{')) {
          helpfulError += '\n\nTip: JSON must be wrapped in curly braces { }.'
        }
      }

      setJsonError(helpfulError)
    }
  }

  const resetForm = () => {
    setNewServerName('')
    setNewServerCommand('')
    setNewServerArgs('')
    setNewServerUrl('')
    setNewServerEnv('')
    setNewServerHeaders('')
    setJsonConfig('')
    setJsonError('')
    setAddMethod('form')
    setIsAddModalOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-96 sm:w-[400px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>MCP Servers</SheetTitle>
              <SheetDescription>
                Manage Model Context Protocol servers to extend Claude's capabilities
              </SheetDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <IconX size={16} />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full py-6">
          {/* Add Server Button */}
          <div className="mb-6">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <IconPlus size={16} className="mr-2" />
                  Add MCP Server
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add MCP Server</DialogTitle>
                  <DialogDescription>
                    Configure a new Model Context Protocol server using the form or paste JSON
                    configuration
                  </DialogDescription>
                </DialogHeader>

                <Tabs
                  value={addMethod}
                  onValueChange={(value) => {
                    setAddMethod(value as 'form' | 'json')
                    setJsonError('') // Clear JSON errors when switching tabs
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form">Form</TabsTrigger>
                    <TabsTrigger value="json">
                      <IconClipboard size={16} className="mr-1" />
                      Paste JSON
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="form" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="server-name">Server Name</Label>
                      <Input
                        id="server-name"
                        placeholder="my-server"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="server-type">Server Type</Label>
                      <Select
                        value={newServerType}
                        onValueChange={(value: 'stdio' | 'sse' | 'http') => setNewServerType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select server type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stdio">stdio</SelectItem>
                          <SelectItem value="sse">SSE</SelectItem>
                          <SelectItem value="http">HTTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newServerType === 'stdio' && (
                      <>
                        <div>
                          <Label htmlFor="server-command">Command</Label>
                          <Input
                            id="server-command"
                            placeholder="npx"
                            value={newServerCommand}
                            onChange={(e) => setNewServerCommand(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="server-args">Arguments</Label>
                          <Input
                            id="server-args"
                            placeholder="-y @upstash/context7-mcp"
                            value={newServerArgs}
                            onChange={(e) => setNewServerArgs(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="server-env">Environment Variables (JSON)</Label>
                          <Textarea
                            id="server-env"
                            placeholder='{"API_KEY": "your-key"}'
                            value={newServerEnv}
                            onChange={(e) => setNewServerEnv(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {(newServerType === 'sse' || newServerType === 'http') && (
                      <>
                        <div>
                          <Label htmlFor="server-url">URL</Label>
                          <Input
                            id="server-url"
                            placeholder="https://example.com/mcp"
                            value={newServerUrl}
                            onChange={(e) => setNewServerUrl(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="server-headers">Headers (JSON)</Label>
                          <Textarea
                            id="server-headers"
                            placeholder='{"Authorization": "Bearer token"}'
                            value={newServerHeaders}
                            onChange={(e) => setNewServerHeaders(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="json" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="json-config">JSON Configuration</Label>
                      <Textarea
                        id="json-config"
                        placeholder={`Paste your MCP server config here:

Option 1 - With server name:
{
  "my-server": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"]
  }
}

Option 2 - Config only (provide name below):
{
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"],
  "env": {
    "API_KEY": "your-key"
  }
}`}
                        value={jsonConfig}
                        onChange={(e) => setJsonConfig(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                      />
                      {jsonError && <p className="text-sm text-red-500 mt-2">{jsonError}</p>}
                    </div>

                    {(() => {
                      // Show server name input if JSON doesn't contain a server name
                      try {
                        if (jsonConfig.trim()) {
                          const parsed = JSON.parse(jsonConfig)
                          const keys = Object.keys(parsed)
                          // If there's exactly one key and it contains server config properties,
                          // then it's likely a named server config
                          if (
                            keys.length === 1 &&
                            typeof parsed[keys[0]] === 'object' &&
                            (parsed[keys[0]].command || parsed[keys[0]].url)
                          ) {
                            return null // Server name is in JSON
                          }
                          // Otherwise, we need a server name
                          return (
                            <div>
                              <Label htmlFor="json-server-name">Server Name</Label>
                              <Input
                                id="json-server-name"
                                placeholder="my-server"
                                value={newServerName}
                                onChange={(e) => setNewServerName(e.target.value)}
                              />
                            </div>
                          )
                        }
                      } catch {
                        // Invalid JSON, still show input
                        return (
                          <div>
                            <Label htmlFor="json-server-name">Server Name</Label>
                            <Input
                              id="json-server-name"
                              placeholder="my-server"
                              value={newServerName}
                              onChange={(e) => setNewServerName(e.target.value)}
                            />
                          </div>
                        )
                      }
                      return null
                    })()}
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddServer}
                    disabled={addMethod === 'form' ? !newServerName.trim() : !jsonConfig.trim()}
                  >
                    Add Server
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Servers List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {Object.keys(mcpServers).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <IconPuzzle size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No MCP servers configured</p>
                <p className="text-sm">Add servers to extend Claude's capabilities</p>
              </div>
            ) : (
              Object.entries(mcpServers).map(([name, config]) => {
                const displayInfo = serverDisplayNames[name]
                const serverConfig = config as any // Type assertion for now
                return (
                  <Card key={name} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <IconPuzzle size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              {displayInfo?.displayName || name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {displayInfo?.description ||
                                (serverConfig.command
                                  ? `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`
                                  : serverConfig.url || 'Custom MCP server')}
                            </div>
                            {serverConfig.env && Object.keys(serverConfig.env).length > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                Env: {Object.keys(serverConfig.env).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMcpServer(name)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <IconTrash size={16} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Label className="text-sm">
                          {serverConfig.enabled ? 'Enabled' : 'Disabled'}
                        </Label>
                        <Switch
                          checked={serverConfig.enabled !== false}
                          onCheckedChange={(enabled: boolean) => toggleMcpServer(name, enabled)}
                        />
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
