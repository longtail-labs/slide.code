import { Effect } from 'effect'
import { app, net } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'

/**
 * Save an image from a URL to the user's Downloads folder
 * @param imageUrl The URL of the image to save
 * @returns An Effect containing the saved file path or an error
 */
export const saveImage = (imageUrl: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Saving image from URL: ${imageUrl}`)

    // Get the downloads path
    const downloadsPath = yield* Effect.try({
      try: () => app.getPath('downloads'),
      catch: (error) => new Error(`Failed to get downloads path: ${error}`)
    })

    // Extract filename from URL or use a timestamp
    const parsedUrl = url.parse(imageUrl)
    const urlPath = parsedUrl.pathname || ''
    const fileName = path.basename(urlPath) || `image-${Date.now()}`

    // Ensure the filename has an extension
    let finalFileName = fileName
    if (!path.extname(finalFileName)) {
      finalFileName += '.png' // Default to .png if no extension found
    }

    const filePath = path.join(downloadsPath, finalFileName)

    // Download and save the file
    return yield* Effect.promise(
      () =>
        new Promise<string>((resolve, reject) => {
          const request = net.request(imageUrl)

          request.on('response', (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download image: HTTP ${response.statusCode}`))
              return
            }

            const fileStream = fs.createWriteStream(filePath)

            response.on('data', (chunk) => {
              fileStream.write(chunk)
            })

            response.on('end', () => {
              fileStream.end()
              resolve(filePath)
            })

            response.on('error', (error) => {
              fileStream.end()
              reject(new Error(`Error downloading image: ${error}`))
            })
          })

          request.on('error', (error) => {
            reject(new Error(`Request error: ${error}`))
          })

          request.end()
        })
    )
  })
