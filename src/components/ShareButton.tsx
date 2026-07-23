import { useState } from 'react'

type Feedback = 'idle' | 'copied' | 'error'

const LABELS: Record<Feedback, string> = {
  idle: 'Share route',
  copied: 'Link copied!',
  error: "Couldn't copy link",
}

export function ShareButton() {
  const [feedback, setFeedback] = useState<Feedback>('idle')

  async function handleClick() {
    const url = window.location.href
    // Prefer the native share sheet on mobile; fall back to clipboard on desktop.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lisbon Walking Map route', url })
      } catch {
        // User cancelled the share sheet; nothing else to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setFeedback('copied')
    } catch {
      setFeedback('error')
    }
    setTimeout(() => setFeedback('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {LABELS[feedback]}
    </button>
  )
}
