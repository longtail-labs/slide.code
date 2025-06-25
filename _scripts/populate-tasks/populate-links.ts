import { DatabaseManager } from '@slide.code/db'
import { logger } from '@slide.code/shared'
import Exa from 'exa-js'

const dbLogger = logger.createScoped('PopulateLinks')

// Initialize Exa client
const exa = new Exa('4fd6c4e3-1111-4ef6-91a6-9586719e9f0a')

// Define how many links we want for each task (randomly between min and max)
const linkCounts: Record<string, { min: number; max: number }> = {
  'Start a blog about tech': { min: 40, max: 50 }, // Lots of links for this one
  'Learn photography basics': { min: 15, max: 20 }, // Medium amount
  default: { min: 2, max: 5 } // Default for other tasks
}

async function getLinksForTask(taskName: string): Promise<Array<{ url: string; title: string }>> {
  try {
    const count = linkCounts[taskName] || linkCounts.default
    const numLinks = Math.floor(Math.random() * (count.max - count.min + 1)) + count.min

    // Construct search query based on task name
    const searchQuery = `best articles and resources about ${taskName.toLowerCase()}`
    dbLogger.info(`Searching for ${numLinks} links about: ${taskName}`)

    const result = await exa.searchAndContents(searchQuery, {
      numResults: numLinks,
      text: { maxCharacters: 1000 }
    })

    if (!result.results?.length) {
      dbLogger.warn(`No results found for task: ${taskName}`)
      return []
    }

    return result.results.map((r) => ({
      url: r.url,
      title: r.title || `Resource about ${taskName}`
    }))
  } catch (error) {
    dbLogger.error(`Failed to get links for task: ${taskName}`, error)
    return []
  }
}

async function addLinksToTask(db: DatabaseManager, taskId: string, taskName: string) {
  try {
    const links = await getLinksForTask(taskName)
    dbLogger.info(`Found ${links.length} links for task: ${taskName}`)

    for (const [index, link] of links.entries()) {
      const object = await db.createObject({
        name: link.title,
        objectType: 'link',
        emoji: '🔗',
        data: {
          type: 'link',
          url: link.url,
          title: link.title,
          domain: new URL(link.url).hostname
        }
      })

      // Add object to task with a rank
      // Using index to maintain order of links
      const rank = (index + 1).toString().padStart(8, '0')
      await db.addObjectToTask(taskId, object.id, rank)
      dbLogger.info(`Added link: ${link.title} to task: ${taskName}`)
    }
  } catch (error) {
    dbLogger.error(`Failed to add links to task: ${taskName}`, error)
  }
}

async function populateLinks() {
  try {
    const db = DatabaseManager.getInstance()
    await db.initialize()

    dbLogger.info('Starting link population...')

    // Get all tasks
    const tasks = await db.db.query.task.findMany()

    // Process each task
    for (const task of tasks) {
      dbLogger.info(`Processing task: ${task.name}`)
      await addLinksToTask(db, task.id, task.name)
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    dbLogger.info('Successfully populated links for all tasks')
    await db.close()
  } catch (error) {
    dbLogger.error('Failed to populate links:', error)
    process.exit(1)
  }
}

// Run the population script
populateLinks()
