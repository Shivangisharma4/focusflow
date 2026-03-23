import { useState, useEffect } from 'react'
import { useTheme } from '../App'
import { X } from '@phosphor-icons/react'

const STORAGE_KEY = 'focusflow_onboarded'

const STEPS = [
  {
    target: 'dropzone',
    title: 'Drop a PDF',
    desc: 'Drag & drop any PDF to start reading with AI-powered focus tools.',
    position: 'center',
  },
  {
    target: 'sidebar',
    title: 'Switch views',
    desc: 'Focus mode, Reader, Mixer, and Stats — each view is optimized for a different workflow.',
    position: 'right',
    arrow: 'left',
  },
  {
    target: 'video-panel',
    title: 'Low-stakes stimulation',
    desc: 'Background gameplay keeps your brain engaged while you study. Adjust opacity and volume.',
    position: 'left',
    arrow: 'right',
  },
  {
    target: 'audio-mixer',
    title: 'Audio mixer',
    desc: 'Balance video audio, AI voice, and lo-fi music independently.',
    position: 'left',
    arrow: 'right',
  },
  {
    target: 'themes',
    title: 'Themes',
    desc: 'Pick a visual theme that suits your mood — Studio, Paper, Petal, or Abyss.',
    position: 'right',
    arrow: 'left',
  },
]

// Positions for each step — these are approximate screen regions
function getStepStyle(step) {
  switch (step.target) {
    case 'dropzone':
      return { top: '42%', left: '28%', transform: 'translate(-50%, -50%)' }
    case 'sidebar':
      return { top: '30%', left: '72px' }
    case 'video-panel':
      return { top: '15%', right: '390px' }
    case 'audio-mixer':
      return { top: '52%', right: '390px' }
    case 'themes':
      return { bottom: '25%', left: '72px' }
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
}

export default function Onboarding() {
  const { theme } = useTheme()
  const [step, setStep] = useState(-1)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        setDismissed(true)
        return
      }
    } catch {}
    // Show first step after a short delay
    const t = setTimeout(() => setStep(0), 1200)
    return () => clearTimeout(t)
  }, [])

  const finish = () => {
    setDismissed(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }

  const next = () => {
    if (step >= STEPS.length - 1) finish()
    else setStep(s => s + 1)
  }

  const skip = () => finish()

  if (dismissed || step < 0) return null

  const current = STEPS[step]
  const pos = getStepStyle(current)

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 z-[100] pointer-events-auto"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={skip} />

      {/* Tooltip */}
      <div className="fixed z-[101] pointer-events-auto anim-fade"
        style={{
          ...pos,
          maxWidth: 260,
        }}>
        {/* Arrow */}
        {current.arrow && (
          <div className="absolute" style={{
            top: '16px',
            ...(current.arrow === 'left' ? { left: -6 } : { right: -6 }),
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            ...(current.arrow === 'left'
              ? { borderRight: `6px solid ${theme.isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)'}` }
              : { borderLeft: `6px solid ${theme.isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)'}` }
            ),
          }} />
        )}

        <div className="rounded-xl overflow-hidden"
          style={{
            background: theme.isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: `0 8px 32px rgba(0,0,0,${theme.isDark ? '0.5' : '0.15'}), 0 0 0 1px rgba(0,0,0,0.05)`,
          }}>
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-[13px] font-semibold" style={{ color: theme.text }}>
                {current.title}
              </h3>
              <button onClick={skip} className="shrink-0 mt-0.5 transition-all hover:scale-110"
                style={{ color: theme.textMuted }}>
                <X size={12} />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: theme.textSoft }}>
              {current.desc}
            </p>
          </div>

          <div className="flex items-center justify-between px-4 py-2"
            style={{ borderTop: `1px solid ${theme.border}` }}>
            {/* Dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: i === step ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                    transform: i === step ? 'scale(1.3)' : 'scale(1)',
                  }} />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={skip}
                className="text-[10px] font-medium px-2 py-1 rounded-md transition-all hover:scale-105"
                style={{ color: theme.textMuted }}>
                Skip
              </button>
              <button onClick={next}
                className="text-[10px] font-semibold px-3 py-1 rounded-md transition-all hover:scale-105"
                style={{
                  background: theme.primarySoft,
                  color: theme.primary,
                }}>
                {step === STEPS.length - 1 ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
