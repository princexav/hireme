'use client'

export function ChatSidebar() {
  return (
    <aside className="w-80 border-l flex flex-col shrink-0 bg-background">
      <div className="p-3 border-b">
        <p className="text-sm font-semibold">AI Assistant</p>
      </div>
      <div className="flex-1 p-3 text-sm text-muted-foreground">
        Loading…
      </div>
    </aside>
  )
}
