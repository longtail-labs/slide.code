import React, { useEffect, useCallback, useState } from 'react'
import { useParams, useSearch, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import useComponentUnderMouse from '@/hooks/useComponentUnderMouse'

// Simple placeholder components
const TaskSidebar = () => (
  <div className="w-64 bg-gray-100 border-r p-4">
    <h3 className="font-bold mb-4">Task Sidebar</h3>
    <div className="space-y-2">
      <div className="p-2 bg-white rounded shadow">Sample Website 🔗</div>
      <div className="p-2 bg-white rounded shadow">Another Link 💻</div>
    </div>
  </div>
)

const ObjectRenderer = ({ object }: { object: any }) => (
  <div className="w-full h-full bg-white border rounded p-4">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-2xl">{object.emoji}</span>
      <h3 className="font-bold">{object.name}</h3>
    </div>
    <div className="text-gray-600">URL: {object.url}</div>
    <div className="mt-4 p-4 bg-gray-50 rounded">
      <p>This is a placeholder for the {object.type} object renderer.</p>
      <p>In a real app, this would render the actual content.</p>
    </div>
  </div>
)

const WorkingMode = () => {
  const { taskId } = useParams({ from: '/working/$taskId' })
  const { openObjectIds, activeObjectId } = useSearch({ from: '/working/$taskId' })
  const navigate = useNavigate({ from: '/working/$taskId' })
  const { activeObjectId: hoveredObjectId, containerRef } = useComponentUnderMouse()

  // Fake task data
  const [task] = useState({
    id: taskId,
    name: 'Sample Task',
    emoji: '📝',
    taskObjects: [
      {
        id: 'taskObject-1',
        rank: '1',
        object: {
          id: 'object-1',
          name: 'Sample Website',
          url: 'https://example.com',
          type: 'link',
          emoji: '🔗'
        }
      },
      {
        id: 'taskObject-2',
        rank: '2',
        object: {
          id: 'object-2',
          name: 'Another Link',
          url: 'https://github.com',
          type: 'link',
          emoji: '💻'
        }
      }
    ]
  })

  // Effect for updating active object from hover
  useEffect(() => {
    if (hoveredObjectId !== undefined) {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          activeObjectId: hoveredObjectId
        })
      })
    }
  }, [hoveredObjectId, navigate])

  const handleCloseTab = useCallback(() => {
    console.log('Closing tab:', activeObjectId)
    const newOpenIds = openObjectIds.filter((id: string) => id !== activeObjectId)

    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        openObjectIds: newOpenIds
      })
    })
  }, [openObjectIds, activeObjectId, navigate])

  const handleNewTab = useCallback(
    async (url: string) => {
      console.log('Opening new tab with URL:', url)

      // Create fake new object
      const newObjectId = 'object-' + Date.now()

      // Update URL search params to include new object
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          openObjectIds: [...openObjectIds, newObjectId]
        })
      })
    },
    [openObjectIds, navigate]
  )

  // Animation variants
  const variants = {
    initial: { y: -50, opacity: 0, scale: 1.2 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.1 }
    },
    exit: {
      y: 50,
      opacity: 0,
      scale: 1.2,
      transition: { duration: 0.1 }
    }
  }

  if (!task) return null

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden bg-background"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <TaskSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-2">
          <div className="h-full">
            <div
              ref={containerRef as React.RefObject<HTMLDivElement>}
              className="relative flex flex-row space-x-1 overflow-x-hidden h-full"
              style={{
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex-1 h-full">
                <div className="h-full flex flex-row overflow-x-auto">
                  {task.taskObjects.map(({ object }) => (
                    <div
                      key={object.id}
                      className={`
                        h-full flex-shrink-0
                        ${openObjectIds.length === 1 ? 'w-full' : 'w-1/2'}
                        ${openObjectIds.includes(object.id) ? '' : 'hidden'}
                      `}
                      style={{
                        willChange: 'transform'
                      }}
                      data-object-id={object.id}
                    >
                      <div className="h-full rounded-sm overflow-hidden">
                        <ObjectRenderer object={object} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WorkingMode
