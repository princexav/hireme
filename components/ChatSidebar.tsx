'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProfile } from '@/hooks/useProfile'
import { useChatContext } from '@/app/(dashboard)/chat-context'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/claude'
import ReactMarkdown from 'react-markdown'

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p:    ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul:   ({ children }) => <ul className="ml-4 mb-2 space-y-1">{children}</ul>,
  ol:   ({ children }) => <ol className="ml-4 mb-2 space-y-1 list-decimal">{children}</ol>,
  li:   ({ children }) => <li className="list-disc">{children}</li>,
  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
  a:    ({ href, children }) => (
    <a href={href ?? '#'} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
      {children}
    </a>
  ),
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content: 'Hi! I can help with your job search. Select a job and ask me anything — "Why is this a good fit?" or "Help me prep for an interview."',
}

export function ChatSidebar() {
  const { sidebarOpen, setSidebarOpen, selectedJob } = useChatContext()
  const { profile } = useProfile()
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Persist open state to localStorage
  useEffect(() => {
    localStorage.setItem('chat-open', String(sidebarOpen))
  }, [sidebarOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch history when selected job changes
  useEffect(() => {
    if (!selectedJob) {
      setMessages([GREETING])
      return
    }

    async function loadHistory() {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('job_id', selectedJob!.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setMessages(data as ChatMessage[])
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm ready to help you with the **${selectedJob!.title}** role at **${selectedJob!.company}**. Ask me anything — fit analysis, interview prep, or how to tailor your resume.`,
        }])
      }
    }

    loadHistory()
  }, [selectedJob?.id])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setError('')

    const context = selectedJob
      ? `Job: ${selectedJob.title} at ${selectedJob.company}. Match score: ${selectedJob.match_score}%. Match reasons: ${selectedJob.match_reasons.join(', ')}. JD: ${selectedJob.jd_text?.slice(0, 600) ?? ''}. Skills: ${profile?.extracted_skills.join(', ') ?? ''}. Target role: ${profile?.preferences?.role ?? ''}. Location: ${profile?.preferences?.location ?? ''}.`
      : profile
        ? `Skills: ${profile.extracted_skills.join(', ')}. Target role: ${profile.preferences?.role}. Location: ${profile.preferences?.location}.`
        : 'No profile loaded yet.'

    let assistantContent = ''

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
          assistantContent += chunk
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

      // Persist both messages to Supabase after stream completes
      if (selectedJob && assistantContent) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('chat_messages').insert([
            { user_id: user.id, job_id: selectedJob.id, role: 'user', content: userMsg.content },
            { user_id: user.id, job_id: selectedJob.id, role: 'assistant', content: assistantContent },
          ])
        }
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setStreaming(false)
    }
  }

  // Avoid SSR/client mismatch on localStorage-driven open state
  if (!mounted) return null

  // Collapsed strip
  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
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
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0f172a] truncate">
            {selectedJob ? selectedJob.title : 'AI Assistant'}
          </p>
          {selectedJob && (
            <p className="text-xs text-[#64748b] truncate">{selectedJob.company}</p>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-[#94a3b8] hover:text-[#0f172a] text-lg leading-none transition-colors ml-2 shrink-0"
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
                {msg.role === 'assistant' && msg.content ? (
                  <div className="text-sm">
                    <ReactMarkdown
                      allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'a']}
                      unwrapDisallowed
                      components={MD_COMPONENTS}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content || <span className="opacity-40">…</span>
                )}
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
          placeholder={selectedJob ? `Ask about ${selectedJob.title}…` : 'Ask anything…'}
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
