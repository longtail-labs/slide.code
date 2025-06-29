import { httpAction } from './_generated/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText, generateText, convertToCoreMessages } from 'ai'

export const chat = httpAction(async (ctx, request) => {
  console.log('chat', request)

  let messages, system, apiKey
  try {
    const body = await request.json()
    messages = body.messages
    system = body.system
    apiKey = body.apiKey
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON or empty request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  const finalApiKey = apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

  if (!finalApiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  const openrouter = createOpenRouter({
    apiKey: finalApiKey
  })

  try {
    const result = streamText({
      model: openrouter('google/gemini-2.5-flash-preview-05-20'),
      messages: convertToCoreMessages(messages),
      system: system,
      maxTokens: 2048
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat streaming error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate chat response' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
})

export const copilot = httpAction(async (ctx, request) => {
  console.log('copilot', request)

  let prompt, system, apiKey, model
  try {
    const body = await request.json()
    prompt = body.prompt
    system = body.system
    apiKey = body.apiKey
    model = body.model || 'google/gemini-2.5-flash-preview-05-20'
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON or empty request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  const finalApiKey = apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

  if (!finalApiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  const openrouter = createOpenRouter({
    apiKey: finalApiKey
  })

  try {
    const result = await generateText({
      model: openrouter(model),
      prompt,
      system,
      maxTokens: 50,
      temperature: 0.7
    })

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Copilot error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate completion' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
})
