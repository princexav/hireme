import { KanbanBoard } from '@/components/KanbanBoard'
import { TrackerStats } from '@/components/TrackerStats'

export default function TrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Application Tracker</h1>
        <p className="text-sm text-[#64748b]">
          Move cards as your applications progress
        </p>
      </div>
      <TrackerStats />
      <KanbanBoard />
    </div>
  )
}
