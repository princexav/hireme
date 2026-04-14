'use client'
import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center px-6">
          <p className="text-2xl">⚠️</p>
          <p className="font-semibold text-[#0f172a]">We're having trouble loading your data</p>
          <p className="text-sm text-[#64748b] max-w-sm">
            This is usually a temporary issue. Try refreshing the page. If the problem persists, check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-[#6366f1] hover:text-[#4f46e5] underline underline-offset-2 transition-colors"
          >
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
