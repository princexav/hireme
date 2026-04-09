'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProfile } from '@/hooks/useProfile'
import type { ChatMessage } from '@/lib/claude'

export function ChatSidebar() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hi! I can help with your job search. Try: "Why is this job a good fit?" or "Help me prep for an interview."',
  }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { profile } = useProfile()

  // Restore open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chat-open')
    if (saved === 'true') setOpen(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('chat-open', String(open))
  }, [open])

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
    setError('')

    const context = profile
      ? `Skills: ${profile.extracted_skills.join(', ')}. Target role: ${profile.preferences?.role}. Location: ${profile.preferences?.location}.`
      : 'No profile loaded yet.'

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], context }),
      })

      if (!res.ok || !res.body) {
        setError('Failed to get response — try again')
        setStreaming(false)
        return
      }

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
    } catch {
      setError('Network error — try again')
    } finally {
      setStreaming(false)
    }
  }

  // Collapsed strip
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-10 border-l border-[#e2e8f0] bg-white flex flex-col items-center justify-center gap-2 shrink-0 hover:bg-[#f8fafc] transition-colors"
        title="Open AI Chat"
      >
        <span className="text-lg">💬</span>
        <span className="text-[10px] text-[#94a3b8] [writing-mode:vertical-lr] [transform:rotate(180deg)]">
          AI Chat
        </span>
      </button>
    )
  }

  // Expanded panel
  return (
    <aside className="w-80 border-l border-[#e2e8f0] flex flex-col shrink-0 bg-white">
      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0f172a]">AI Assistant</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[#94a3b8] hover:text-[#0f172a] text-lg leading-none transition-colors"
          title="Close"
        >
          ×
        </button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm
                ${msg.role === 'user'
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-[#f1f5f9] text-[#0f172a]'}`}>
                {msg.content || <span className="opacity-40">…</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {error && (
        <p className="px-4 py-1 text-xs text-red-500 border-t border-[#e2e8f0]">{error}</p>
      )}

      <form onSubmit={sendMessage} className="p-3 border-t border-[#e2e8f0] flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything…"
          disabled={streaming}
          className="text-sm border-[#e2e8f0]"
        />
        <Button
          type="submit"
          size="sm"
          disabled={streaming || !input.trim()}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
        >
          →
        </Button>
      </form>
    </aside>
  )
}
