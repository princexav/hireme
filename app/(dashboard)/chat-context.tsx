'use client'
import { createContext, useContext, useState } from 'react'
import type { Job } from '@/lib/supabase/types'

type ChatContextValue = {
  selectedJob: Job | null
  setSelectedJob: (job: Job | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  openChatForJob: (job: Job) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function openChatForJob(job: Job) {
    setSelectedJob(job)
    setSidebarOpen(true)
  }

  return (
    <ChatContext.Provider value={{ selectedJob, setSelectedJob, sidebarOpen, setSidebarOpen, openChatForJob }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
