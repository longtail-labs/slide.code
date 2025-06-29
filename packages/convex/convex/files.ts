import { httpAction } from './_generated/server'
import { Id } from './_generated/dataModel'

export const getFile = httpAction(async (ctx, request) => {
  const { searchParams } = new URL(request.url)
  const storageId = searchParams.get('storageId') as Id<'_storage'>

  if (!storageId) {
    return new Response('Storage ID required', { status: 400 })
  }

  try {
    const blob = await ctx.storage.get(storageId)

    if (blob === null) {
      return new Response('File not found', { status: 404 })
    }

    return new Response(blob)
  } catch (error) {
    console.error('Error serving file:', error)
    return new Response('Error serving file', { status: 500 })
  }
})
