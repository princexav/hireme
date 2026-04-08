import { createClient } from '@/lib/supabase/server'
import { streamChat, type ChatMessage } from '@/lib/claude'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let messages: ChatMessage[], context: string
  try {
    const body = await request.json()
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response('messages must be a non-empty array', { status: 400 })
    }
    messages = body.messages
    context = typeof body.context === 'string' ? body.context : ''
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat({ messages, context })) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[Error: ${(err as Error).message}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
