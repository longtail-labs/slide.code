import { DatabaseManager } from '@polka/db'
import fs from 'fs/promises'
import path from 'path'

const tasks = [
  { name: 'Plan summer vacation to Greece', emoji: '✈️' },
  { name: 'Read "Atomic Habits" by James Clear', emoji: '📚' },
  { name: 'Create a monthly budget plan', emoji: '💰' },
  { name: 'Schedule annual health checkup', emoji: '🏥' },
  { name: 'Learn basic Spanish phrases', emoji: '🗣️' },
  { name: 'Organize home office space', emoji: '🏠' },
  { name: 'Start a daily meditation practice', emoji: '🧘' },
  { name: 'Research new hiking trails', emoji: '🥾' },
  { name: 'Plan weekly meal prep', emoji: '🥗' },
  { name: 'Update resume and LinkedIn profile', emoji: '💼' },
  { name: 'Create a workout routine', emoji: '💪' },
  { name: 'Research electric car options', emoji: '🚗' },
  { name: 'Plan garden layout for spring', emoji: '🌱' },
  { name: 'Learn photography basics', emoji: '📷' },
  { name: 'Declutter wardrobe', emoji: '👕' },
  { name: 'Research investment strategies', emoji: '📈' },
  { name: 'Plan family reunion', emoji: '👨‍👩‍👧‍👦' },
  { name: 'Learn to make sushi', emoji: '🍱' },
  { name: 'Create a home maintenance schedule', emoji: '🔧' },
  { name: 'Start a blog about tech', emoji: '💻' },
  { name: 'Plan weekend camping trip', emoji: '⛺' },
  { name: 'Learn basic guitar chords', emoji: '🎸' },
  { name: 'Research local volunteer opportunities', emoji: '🤝' },
  { name: 'Create a morning routine', emoji: '🌅' },
  { name: 'Plan a dinner party', emoji: '🍽️' }
]

async function ensureDatabaseDirectory() {
  const dbDir = path.join(process.cwd(), '.polka')
  await fs.mkdir(dbDir, { recursive: true })
  console.log('Ensured database directory exists:', dbDir)
}

async function populateTasks() {
  try {
    await ensureDatabaseDirectory()

    const db = DatabaseManager.getInstance()
    await db.initialize()

    console.log('Starting task population...')

    for (const task of tasks) {
      const result = await db.createTask({
        name: task.name,
        emoji: task.emoji,
        completed: false
      })
      console.log(`Created task: ${result.name} (${result.id})`)
    }

    console.log('Successfully populated database with tasks')
    await db.close()
  } catch (error) {
    console.error('Failed to populate tasks:', error)
    process.exit(1)
  }
}

// Run the population script
populateTasks()
