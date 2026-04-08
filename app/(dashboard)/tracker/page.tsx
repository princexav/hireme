import { KanbanBoard } from '@/components/KanbanBoard'

export default function TrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Application Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Move cards as your applications progress
        </p>
      </div>
      <KanbanBoard />
    </div>
  )
}
