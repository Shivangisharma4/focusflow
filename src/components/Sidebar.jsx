import { useTheme } from '../App'
import { THEMES } from '../utils/themes'
import { Lightning, BookOpenText, Sliders, ChartBar, GearSix } from '@phosphor-icons/react'

const NAV = [
  { id: 'focus', Icon: Lightning },
  { id: 'reader', Icon: BookOpenText },
  { id: 'mixer', Icon: Sliders },
  { id: 'stats', Icon: ChartBar },
]

export default function Sidebar({ activeView, onViewChange }) {
  const { theme, themeName, setThemeName } = useTheme()

  return (
    <nav className="w-[56px] flex flex-col items-center py-5 shrink-0 glass anim-in relative z-20"
      style={{
        background: theme.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
        borderRight: `1px solid ${theme.border}`,
      }}>

      {/* Brand mark */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-10 relative"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDim})`,
          boxShadow: `0 4px 20px ${theme.primaryGlow}`,
        }}>
        <span className="font-display text-[14px] italic font-medium" style={{ color: theme.activeText }}>f</span>
      </div>

      {/* Nav icons */}
      <div className="flex flex-col gap-1 w-full px-2">
        {NAV.map(({ id, Icon }) => (
          <button key={id}
            onClick={() => onViewChange(id)}
            className="relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-108"
            style={{
              background: activeView === id ? theme.primarySoft : 'transparent',
              color: activeView === id ? theme.primary : theme.textMuted,
            }}>
            <Icon size={18} weight={activeView === id ? 'fill' : 'regular'} />
            {activeView === id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full transition-all"
                style={{ background: theme.primary, boxShadow: `0 0 8px ${theme.primary}40` }} />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Theme swatches */}
      <div className="flex flex-col gap-3 mb-6">
        {Object.entries(THEMES).map(([key, t]) => (
          <button key={key} onClick={() => setThemeName(key)} title={t.name}
            className="relative w-[13px] h-[13px] rounded-full transition-all duration-300"
            style={{
              background: t.swatch,
              opacity: themeName === key ? 1 : 0.18,
              transform: themeName === key ? 'scale(1.3)' : 'scale(1)',
            }}>
            {themeName === key && (
              <div className="absolute inset-[-5px] rounded-full border transition-all"
                style={{ borderColor: `${t.swatch}50` }} />
            )}
          </button>
        ))}
      </div>

      <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{ color: theme.textMuted }}>
        <GearSix size={17} />
      </button>
    </nav>
  )
}
