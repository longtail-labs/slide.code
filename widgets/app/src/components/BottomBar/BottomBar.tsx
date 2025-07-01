import {
  Archive,
  ArrowLeft,
  Bell,
  Code,
  Folder,
  Gamepad2,
  GitCommit,
  ListMusic,
  Pause,
  Play,
  Shuffle,
  Terminal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useRef, useEffect, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useNavigate,
  useLocation,
  useRouter,
  useCanGoBack,
  useParams
} from '@tanstack/react-router'
import { useGameWebview } from '@/components/GameWebviewManager'
import { useTaskWithMessages, useTaskDiff, useProjects } from '@slide.code/clients'

interface SomaFmPlaylist {
  url: string
  format: string
  quality: string
}

interface SomaFmChannel {
  id: string
  title: string
  description: string
  dj: string
  genre: string
  image: string
  largeimage: string
  xlimage: string
  twitter: string
  updated: string
  playlists: SomaFmPlaylist[]
  preroll: string[]
  listeners: string
  lastPlaying: string
}

const BottomBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { isScriptActive } = useGameWebview()

  // Get current task data if on working route
  const isWorking = location.pathname.startsWith('/working/')
  const taskIdFromPath = isWorking ? location.pathname.split('/').pop() : null
  const { data: task } = useTaskWithMessages(taskIdFromPath || '')
  const { data: diffText } = useTaskDiff(taskIdFromPath || '')
  const { data: projects } = useProjects()

  // Calculate diff stats from the actual diff text
  const diffStats = useMemo(() => {
    if (!diffText) return { additions: 0, deletions: 0 }

    const lines = diffText.split('\n')
    let additions = 0
    let deletions = 0

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
      }
    }

    return { additions, deletions }
  }, [diffText])

  // Get project info
  const currentProject = task && projects ? projects.find((p) => p.id === task.projectId) : null

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [channels, setChannels] = useState<SomaFmChannel[]>([])
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [currentServerIndex, setCurrentServerIndex] = useState(0)
  const [streamServers, setStreamServers] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('https://somafm.com/channels.json')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        const fetchedChannels = data.channels

        // Sort channels by listener count (highest first)
        const sortedChannels = fetchedChannels.sort((a: SomaFmChannel, b: SomaFmChannel) => {
          const listenersA = parseInt(a.listeners) || 0
          const listenersB = parseInt(b.listeners) || 0
          return listenersB - listenersA
        })

        setChannels(sortedChannels)

        const grooveSaladIndex = sortedChannels.findIndex(
          (c: SomaFmChannel) => c.id === 'groovesalad'
        )
        setCurrentChannelIndex(grooveSaladIndex !== -1 ? grooveSaladIndex : 0)
      } catch (e) {
        console.error('Failed to fetch SomaFM channels:', e)
        setError('Failed to load channels')
      }
    }

    fetchChannels()
  }, [])

  useEffect(() => {
    if (!channels.length || currentChannelIndex === -1) return

    const fetchPlaylist = async () => {
      const channel = channels[currentChannelIndex]
      if (!channel) return

      // Prioritize streams by quality based on SomaFM FAQ
      // 1. AAC (up to 128k) - Best quality
      // 2. AAC-HE (aacPlus) (up to 64k) - Second best
      // 3. MP3 (128k) - Good compatibility
      const playlist =
        channel.playlists.find((p) => p.format === 'aac' && p.quality === 'high') ||
        channel.playlists.find((p) => p.format === 'aacp' && p.quality === 'high') ||
        channel.playlists.find((p) => p.format === 'mp3' && p.quality === 'highest')

      if (!playlist) {
        setError(`No compatible stream for ${channel.title}`)
        return
      }

      try {
        const response = await fetch(playlist.url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const plsData = await response.text()
        const urls = plsData
          .split('\n')
          .filter((line) => line.startsWith('File'))
          .map((line) => line.split('=')[1])
          .filter(Boolean)

        if (urls.length > 0) {
          setStreamServers(urls)
          setCurrentServerIndex(0)
          setError(null)
          if (isPlaying && audioRef.current) {
            const audio = audioRef.current
            audio.src = urls[0]
            audio.load()
            audio.play().catch(console.error)
          }
        } else {
          setError(`No servers in playlist for ${channel.title}`)
        }
      } catch (e) {
        console.error('Failed to fetch or parse playlist:', e)
        setError('Failed to load stream')
      }
    }

    fetchPlaylist()
  }, [currentChannelIndex, channels])

  // Create and configure the audio element
  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio()
    audioRef.current.crossOrigin = 'anonymous'
    audioRef.current.preload = 'none'

    const audio = audioRef.current

    // Event listeners
    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
      console.log('Audio ready to play')
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
      console.log('Loading audio stream...')
    }

    const handleError = (e: Event) => {
      console.error('Audio error:', e)
      setIsLoading(false)
      setIsPlaying(false)

      // Try next server if available
      if (currentServerIndex < streamServers.length - 1) {
        console.log(`Trying next server (${currentServerIndex + 1})...`)
        setCurrentServerIndex((prev) => prev + 1)
      } else {
        setError('All servers failed')
        setCurrentServerIndex(0) // Reset for next attempt
      }
    }

    const handlePlaying = () => {
      setIsPlaying(true)
      setIsLoading(false)
      console.log('Audio playing')
    }

    const handlePause = () => {
      setIsPlaying(false)
      console.log('Audio paused')
    }

    const handleWaiting = () => {
      setIsLoading(true)
      console.log('Audio buffering...')
    }

    const handleCanPlayThrough = () => {
      setIsLoading(false)
      console.log('Audio buffered')
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('error', handleError)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('canplaythrough', handleCanPlayThrough)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.pause()
      audio.src = ''
    }
  }, []) // Keep this effect for audio element setup only

  // Auto-retry with next server when currentServerIndex changes
  useEffect(() => {
    if (audioRef.current && isPlaying && streamServers.length > 0) {
      const audio = audioRef.current
      audio.src = streamServers[currentServerIndex]
      audio.load()
      audio.play().catch(console.error)
    }
  }, [currentServerIndex])

  const togglePlayPause = async () => {
    if (!audioRef.current || !streamServers.length) return

    const audio = audioRef.current

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        const currentStreamUrl = streamServers[currentServerIndex]
        if (audio.src !== currentStreamUrl) {
          audio.src = currentStreamUrl
          console.log(`Loading stream from: ${currentStreamUrl}`)
        }

        setIsLoading(true)
        setError(null)
        await audio.play()
      }
    } catch (err) {
      console.error('Audio playback error:', err)
      setError('Playback failed')
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  const handleShuffle = () => {
    if (channels.length > 1) {
      let newIndex
      do {
        newIndex = Math.floor(Math.random() * channels.length)
      } while (newIndex === currentChannelIndex)
      setCurrentChannelIndex(newIndex)
    }
  }

  const handleRetry = () => {
    setError(null)
    setCurrentServerIndex(0)
    if (audioRef.current) {
      togglePlayPause()
    }
  }

  const currentChannel = channels[currentChannelIndex]

  const handleGoBack = () => {
    if (location.pathname.startsWith('/working/')) {
      navigate({ to: '/' })
    } else if (location.pathname === '/game') {
      if (canGoBack) {
        // Use TanStack Router's history to go back
        router.history.back()
      } else {
        // Fallback to home if there's no history to go back to
        navigate({ to: '/' })
      }
    }
  }

  const handleGameClick = () => {
    navigate({ to: '/game' })
  }

  const isPlanning = location.pathname === '/'
  const isGame = location.pathname === '/game'

  return (
    <div className="bottom-0 left-0 right-0 h-20 bg-gray-50 border-t border-gray-200 flex items-center px-3 z-50 font-recursive">
      <div className="flex items-center gap-x-3 flex-1">
        {/* Left side - conditional rendering */}
        {isWorking ? (
          <>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={handleGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-x-3">
                <span className="font-bold text-gray-800 truncate">
                  {currentProject ? currentProject.name : 'Loading...'}
                </span>
                <div className="flex items-center space-x-2 text-sm font-mono">
                  <span className="text-emerald-600 font-medium">+{diffStats.additions}</span>
                  <span className="text-red-500 font-medium">-{diffStats.deletions}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {task ? task.name : 'Loading task...'}
              </p>
            </div>
          </>
        ) : isGame ? (
          <>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={handleGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col">
              <span className="font-bold text-gray-800">Game Mode</span>
              <span className="text-xs text-gray-500">BitSplat.fly.dev</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col">
            <span className="font-bold text-gray-800">Slide Code</span>
            <span className="text-xs text-gray-500 whitespace-pre-line">
              {`Graphical Vibe Coding Environment (VCE)\nfor Claude Code`}
            </span>
          </div>
        )}
      </div>

      {/* Center - only show for working view */}
      {isWorking && (
        <div className="flex-none px-4">
          <div className="flex items-center gap-x-2">
            {task?.status === 'running' ? (
              <div className="flex items-center gap-x-2 text-sm text-gray-500">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Working...</span>
              </div>
            ) : (
              <div className="flex items-center gap-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-green-700 font-medium">
                  {task?.status === 'completed' ? 'Completed' : 'Open'}
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" className="h-8">
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  Open
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="center" side="top">
                <div className="grid gap-1">
                  <Button variant="ghost" className="justify-start w-full h-8 px-2">
                    <Code className="h-4 w-4 mr-2" /> Open in Editor
                  </Button>
                  <Button variant="ghost" className="justify-start w-full h-8 px-2">
                    <Folder className="h-4 w-4 mr-2" /> Open in Finder
                  </Button>
                  <Button variant="ghost" className="justify-start w-full h-8 px-2">
                    <Terminal className="h-4 w-4 mr-2" /> Open in Terminal
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" className="h-8">
              <GitCommit className="h-3.5 w-3.5 mr-1.5" />
              Commit
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-x-2 flex-1 justify-end">
        {/* Right side */}
        <Button variant="outline" size="sm" className="h-8 relative" onClick={handleGameClick}>
          <Gamepad2 className="h-4 w-4" />
          {isScriptActive && !isGame && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>

        <div className="flex items-center gap-x-1 bg-white border border-gray-200 rounded-md p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={error ? handleRetry : togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-40 cursor-default px-1 text-xs text-gray-600">
                  <div
                    className={`font-medium whitespace-nowrap truncate text-xs ${
                      isPlaying && !error ? 'text-green-600' : ''
                    }`}
                  >
                    {error ? (
                      <span className="text-red-500">Stream Error</span>
                    ) : (
                      currentChannel?.title || 'SomaFM'
                    )}
                  </div>

                  <div className="text-gray-500 whitespace-nowrap truncate text-xs">
                    {error
                      ? 'Click to retry'
                      : isPlaying && currentChannel
                        ? `${currentChannel.listeners} listeners`
                        : 'SomaFM'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  {error
                    ? 'Connection failed - click to retry'
                    : currentChannel?.description ||
                      'A nicely chilled plate of ambient/downtempo beats'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <ListMusic className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1" side="top" align="end">
              <ScrollArea className="h-64">
                <div className="grid gap-1">
                  {channels.map((channel, index) => (
                    <Button
                      key={channel.id}
                      variant={currentChannelIndex === index ? 'secondary' : 'ghost'}
                      className="justify-start w-full h-auto px-2 py-1.5 text-left"
                      onClick={() => setCurrentChannelIndex(index)}
                    >
                      <div>
                        <div className="font-medium text-sm">{channel.title}</div>
                        <div className="text-xs text-gray-500">{channel.listeners} listeners</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
              <div className="text-center text-xs text-gray-400 p-2 border-t mt-1">
                Music from SomaFM.com
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleShuffle}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default BottomBar
