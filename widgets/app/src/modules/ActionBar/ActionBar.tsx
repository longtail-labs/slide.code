import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import ActionBarPresenter from './ActionBarPresenter'

const ActionBar = () => {
  const navigate = useNavigate()

  const handlePlay = async (value: string) => {
    console.log('handlePlay called with:', value)

    // Simulate creating a task and navigating
    const fakeTaskId = 'task-' + Date.now()
    const fakeObjectId = 'object-' + Date.now()

    console.log('Created fake task:', fakeTaskId)
    console.log('Created fake object:', fakeObjectId)

    // Navigate to working view with fake IDs
    navigate({
      to: '/working/$taskId',
      params: { taskId: fakeTaskId },
      search: { openObjectIds: [fakeObjectId], activeObjectId: fakeObjectId }
    })
  }

  return <ActionBarPresenter onPlay={handlePlay} suggestions={[]} isLoading={false} />
}

export default ActionBar
