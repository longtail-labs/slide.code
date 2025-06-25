// // import fuzzysort from 'fuzzysort'

// // Import the emoji library
// import emojiLib from 'emojilib'

// // Define our emoji object structure
// interface EmojiObject {
//   emoji: string
//   keywords: string[]
//   name: string
// }

// // Build a searchable library with emoji name included
// const library: EmojiObject[] = Object.entries(emojiLib).map(([emoji, keywords]) => {
//   // Ensure keywords is an array
//   const keywordArray = Array.isArray(keywords) ? keywords : []
//   return {
//     emoji,
//     keywords: keywordArray,
//     // Use the first keyword as name or fallback to emoji if no keywords
//     name: keywordArray.length > 0 ? keywordArray[0] : emoji
//   }
// })

// /**
//  * Search for emojis based on a query string
//  * @param query The search query
//  * @param limit Maximum number of results to return (default: 20)
//  * @returns Array of emoji objects sorted by relevance
//  */
// export function searchEmoji(query: string, limit = 20) {
//   if (!query.trim()) {
//     return library.slice(0, limit)
//   }

//   const results = fuzzysort.go(query, library, {
//     keys: ['name', 'keywords'],
//     threshold: -10000, // Lower threshold to allow more matches
//     limit: limit
//   })

//   return results.map((result) => result.obj)
// }

// /**
//  * Get a random emoji from the library
//  * @returns A random emoji object
//  */
// export function getRandomEmoji() {
//   const randomIndex = Math.floor(Math.random() * library.length)
//   return library[randomIndex]
// }

// // Export the emoji utility
// export const EmojiUtil = {
//   search: searchEmoji,
//   getRandom: getRandomEmoji,
//   getAll: () => library
// }

// export default EmojiUtil
