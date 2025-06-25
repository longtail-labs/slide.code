import { parse } from 'tldts'

export function getHostname(url: string) {
  return parse(url).domain
}

export function getFaviconUrl(url: string) {
  const hostname = getHostname(url)
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
}
