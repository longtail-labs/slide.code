import { httpAction } from './_generated/server'

export const upload = httpAction(async (ctx, request) => {
  console.log('upload', request)

  try {
    // Get the uploaded file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('File received:', file.name, file.size, file.type)

    // Store the file in Convex storage
    const storageId = await ctx.storage.store(file)

    console.log('File stored with ID:', storageId)

    // Generate a URL for the stored file
    const url = await ctx.storage.getUrl(storageId)

    // Return file info in the same format your client expects
    const uploadedFile = {
      key: storageId, // Use storageId as the key
      name: file.name,
      size: file.size,
      type: file.type,
      url: url! // Convex getUrl returns string | null, but it should exist for a file we just stored
    }

    return new Response(JSON.stringify(uploadedFile), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Upload failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
