import { parseDomain, ParseResultType, fromUrl } from 'parse-domain'

export function getDomain(urlString: string): string | null {
  try {
    const hostname = fromUrl(urlString)
    const parseResult = parseDomain(hostname)

    if (parseResult.type === ParseResultType.Listed) {
      return parseResult.domain || null
    }

    return null
  } catch {
    return null
  }
}
