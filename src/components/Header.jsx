import { useState, useEffect } from 'react'
import { useTheme } from '../App'
import { Timer, Command } from '@phosphor-icons/react'

export default function Header({ sessionStart }) {
  const { theme } = useTheme()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [sessionStart])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <header className="flex items-center px-6 h-[52px] shrink-0 anim-in"
      style={{ borderBottom: `1px solid ${theme.border}`, animationDelay: '0.06s' }}>

      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 64 64" width="22" height="22">
          <circle cx="32" cy="32" r="28" fill={theme.primary}/>
          <path d="M54 11C46 14 34 20 20 30C34 40 46 48 54 53C62 38 62 26 54 11Z" fill={theme.isDark ? '#111' : '#fff'}/>
        </svg>
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
          <span style={{ color: theme.text }}>focus</span>
          <span style={{ color: theme.primary }}>flow</span>
        </h1>
      </div>

      <div className="flex-1" />

      {/* Shortcut hint */}
      <div className="flex items-center gap-1.5 mr-3 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <Command size={10} style={{ color: theme.textMuted }} />
        <span className="font-mono text-[10px]" style={{ color: theme.textMuted }}>K</span>
      </div>

      {/* Timer pill */}
      <div className="flex items-center gap-2.5 px-4 h-8 rounded-full"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="w-[6px] h-[6px] rounded-full"
          style={{ background: theme.secondary, animation: 'breathe 2.5s ease-in-out infinite' }} />
        <span className="font-mono text-[12px] font-medium tabular-nums tracking-wider"
          style={{ color: theme.textSoft }}>
          {mm}:{ss}
        </span>
      </div>
    </header>
  )
}
