import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../App'
import { Lightning, Copy, Check, Spinner, X } from '@phosphor-icons/react'

export default function Summarizer({ text }) {
  const { theme } = useTheme()
  const workerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelReady, setModelReady] = useState(null)
  const [progress, setProgress] = useState([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    workerRef.current ??= new Worker(
      new URL('../workers/summarizer.js', import.meta.url),
      { type: 'module' }
    )
    const onMessage = (e) => {
      const { status } = e.data
      switch (status) {
        case 'initiate': setModelReady(false); setProgress(p => [...p, { file: e.data.file, progress: 0 }]); break
        case 'progress': setProgress(p => p.map(i => i.file === e.data.file ? { ...i, progress: e.data.progress } : i)); break
        case 'done': setProgress(p => p.filter(i => i.file !== e.data.file)); break
        case 'ready': setModelReady(true); break
        case 'complete': setSummary(e.data.output); setLoading(false); break
        case 'error': setError(e.data.error); setLoading(false); break
      }
    }
    workerRef.current.addEventListener('message', onMessage)
    return () => workerRef.current?.removeEventListener('message', onMessage)
  }, [])

  const summarize = useCallback(() => {
    if (!text || loading) return
    setLoading(true); setSummary(''); setError('')
    workerRef.current?.postMessage({ text, max_length: 150, min_length: 30 })
  }, [text, loading])

  const overallProgress = progress.length > 0
    ? progress.reduce((s, p) => s + (p.progress || 0), 0) / progress.length : 0

  if (!text) return null

  return (
    <>
      {/* Compact button in header bar */}
      <button onClick={() => { setIsOpen(o => !o); if (!isOpen && !summary && !loading) summarize() }}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0 transition-all hover:scale-105"
        style={{
          background: loading ? theme.primarySoft : theme.surface,
          border: `1px solid ${loading ? theme.primary + '40' : theme.border}`,
          color: loading ? theme.primary : theme.textMuted,
        }}>
        {loading
          ? <Spinner size={10} className="animate-spin" />
          : <Lightning size={10} weight="fill" />
        }
        <span className="text-[10px] font-medium">
          {loading ? 'Summarizing' : summary ? 'Summary' : 'Summarize'}
        </span>
      </button>

      {/* Floating dropdown */}
      {isOpen && (summary || loading || error) && (
        <div className="absolute top-full left-0 right-0 mt-1 mx-4 z-50 rounded-xl overflow-hidden glass anim-fade"
          style={{
            background: theme.isDark ? 'rgba(18,18,18,0.95)' : 'rgba(255,255,255,0.97)',
            border: `1px solid ${theme.border}`,
            boxShadow: `0 12px 40px rgba(0,0,0,${theme.isDark ? '0.6' : '0.15'})`,
          }}>

          {/* Download progress */}
          {modelReady === false && progress.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Spinner size={10} className="animate-spin" style={{ color: theme.primary }} />
                <span className="text-[10px]" style={{ color: theme.textSoft }}>Loading AI model...</span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: theme.borderHard }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${overallProgress}%`, background: theme.primary }} />
              </div>
            </div>
          )}

          {/* Loading shimmer */}
          {loading && modelReady && (
            <div className="px-4 py-3 space-y-1.5">
              {[85, 95, 65].map((w, i) => (
                <div key={i} className="h-2.5 rounded-full animate-pulse"
                  style={{ width: `${w}%`, background: theme.borderHard, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {error && (
            <div className="px-4 py-3">
              <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {summary && (
            <div className="px-4 py-3">
              <p className="text-[12px] leading-relaxed" style={{ color: theme.textSoft }}>{summary}</p>
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                <button onClick={() => { navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                  className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-md transition-all hover:scale-105"
                  style={{ background: theme.surface, color: copied ? theme.secondary : theme.textMuted }}>
                  {copied ? <Check size={9} /> : <Copy size={9} />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={summarize} disabled={loading}
                  className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-md transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: theme.surface, color: theme.textMuted }}>
                  <Lightning size={9} /> Redo
                </button>
                <div className="flex-1" />
                <button onClick={() => setIsOpen(false)}
                  className="transition-all hover:scale-110" style={{ color: theme.textMuted }}>
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
