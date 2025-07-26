/**
 * Get a favicon URL from a domain using Google's favicon service
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
  } catch (error) {
    console.error('Error parsing URL for favicon:', error)
    return ''
  }
}
