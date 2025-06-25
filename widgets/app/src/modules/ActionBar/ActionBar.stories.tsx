import type { Story } from '@ladle/react'
import ActionBarPresenter from './ActionBarPresenter'

export const Default: Story = () => {
  const suggestions = [
    { icon: '🥕', text: 'Vegetables currently in season' },
    { icon: '🧘', text: 'What is somatic healing?' },
    { icon: '💻', text: 'New AI design tools' },
    { icon: '🧢', text: 'Durable trail running hats' }
  ]

  return (
    <ActionBarPresenter
      onPlay={(value) => console.log('Play clicked with value:', value)}
      suggestions={suggestions}
      onSuggestionClick={(suggestion) => console.log('Suggestion clicked:', suggestion)}
    />
  )
}
