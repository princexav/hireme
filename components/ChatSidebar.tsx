'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProfile } from '@/hooks/useProfile'
import type { ChatMessage } from '@/lib/claude'

export function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hi! I can help you with your job search. Ask me anything — "Why is this a good fit?", "Help me prep for an interview", "Should I apply to this role?"',
  }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { profile } = useProfile()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    const context = profile
      ? `Skills: ${profile.extracted_skills.join(', ')}. Target role: ${profile.preferences?.role}. Location: ${profile.preferences?.location}.`
      : 'No profile loaded yet.'

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMsg], context }),
    })

    if (!res.ok || !res.body) { setStreaming(false); return }

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let done = false

    while (!done) {
      const { value, done: d } = await reader.read()
      done = d
      if (value) {
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    }

    setStreaming(false)
  }

  return (
    <aside className="w-80 border-l flex flex-col shrink-0 bg-background">
      <div className="p-3 border-b">
        <p className="text-sm font-semibold">AI Assistant</p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm
                ${msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'}`}>
                {msg.content || <span className="opacity-50">…</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything…"
          disabled={streaming}
          className="text-sm"
        />
        <Button type="submit" size="sm" disabled={streaming || !input.trim()}>
          →
        </Button>
      </form>
    </aside>
  )
}
