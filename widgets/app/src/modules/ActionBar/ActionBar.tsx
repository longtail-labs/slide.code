import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import ActionBarPresenter from './ActionBarPresenter'
import type { Suggestion } from './ActionBarPresenter'

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

  const suggestions: Suggestion[] = [
    { icon: '🥕', text: 'Vegetables currently in season' },
    { icon: '🧘', text: 'What is somatic healing?' },
    { icon: '💻', text: 'New AI design tools' },
    { icon: '🧢', text: 'Durable trail running hats' }
  ]

  return (
    <ActionBarPresenter
      onPlay={handlePlay}
      suggestions={suggestions}
      onSuggestionClick={(suggestion) => console.log('Suggestion clicked:', suggestion)}
      isLoading={false}
    />
  )
}

export default ActionBar
