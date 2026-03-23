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
          <circle cx="32" cy="32" r="30" fill={theme.primary}/>
          <path d="M23 55L23 36L17.5 36C16 36 16 29 17.5 29L23 29C23 18 24.5 12 29 9C33 5.5 39 6 44 8C45 8.5 45 10 44 10.8L40.5 13C39.8 13.5 38.8 13.2 38 13C35 12 32.5 12.5 31 14.5C29.5 16.5 29 19.5 29 29L37 29C38.5 29 38.5 36 37 36L29 36L29 55C29 56.5 23 56.5 23 55Z" fill={theme.isDark ? '#111' : '#fff'}/>
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
