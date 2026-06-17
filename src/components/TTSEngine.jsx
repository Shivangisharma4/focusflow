import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../App'
import {
  SkipBack, Play, Pause, SkipForward, Waveform, CaretDown, CaretUp,
  UserSound, Lightning,
} from '@phosphor-icons/react'

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5]

// ═══ Voice quality ranking — prioritises neural / premium / enhanced voices ═══
function scoreVoice(v) {
  const n = v.name.toLowerCase()
  let s = 0
  // Highest tier: explicitly neural or premium OS voices
  if (n.includes('natural'))                               s += 60
  if (n.includes('premium'))                              s += 55
  if (n.includes('enhanced'))                             s += 55
  if (n.includes('neural'))                               s += 50
  // Google online voices (neural quality)
  if (n.includes('google uk english female'))              s += 45
  if (n.includes('google us english'))                    s += 40
  if (n.includes('google'))                               s += 28
  // macOS quality voices
  if (n.includes('samantha'))                             s += 35
  if (n.includes('karen'))                                s += 32
  if (n.includes('daniel'))                               s += 30
  if (n.includes('alex'))                                 s += 26
  if (n.includes('victoria'))                             s += 24
  if (n.includes('tom'))                                  s += 20
  // Microsoft online (neural quality)
  if (n.includes('microsoft') && n.includes('online'))    s += 22
  // Language preference
  if (v.lang === 'en-US')                                 s += 15
  if (v.lang === 'en-GB')                                 s += 13
  if (v.lang === 'en-AU' || v.lang === 'en-IN')           s += 10
  if (v.lang.startsWith('en'))                            s += 5
  return s
}

// ═══ Heuristic gender detection by voice name ═══
function guessIsFemale(v) {
  const n = v.name.toLowerCase()
  const femaleWords = [
    'female', 'samantha', 'karen', 'victoria', 'moira', 'fiona', 'tessa', 'heera',
    'kate', 'serena', 'zira', 'joanna', 'kendra', 'kimberly', 'ruth', 'sarah',
    'sonia', 'emma', 'ava', 'aria', 'jenny', 'jane', 'emily', 'hazel', 'alice',
    'allison', 'ashley', 'lisa', 'nicky', 'google uk english female',
  ]
  return femaleWords.some(w => n.includes(w))
}

// Pick top 12 browser voices — balanced 6F + 6M where possible, excluding robotic novelty voices ═══
function curateVoices(all) {
  const isNovelty = (name) => {
    const n = name.toLowerCase()
    return ['fred', 'ralph', 'albert', 'whisper', 'bruce', 'deranged', 'hysterical',
            'bells', 'boing', 'bubbles', 'cellos', 'bad news', 'good news', 'organ',
            'trinoids', 'zarvox', 'wobble', 'bahh', 'pipe organ'].some(w => n.includes(w))
  }

  const en = all
    .filter(v => v.lang.startsWith('en') && !isNovelty(v.name))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))

  const females = en.filter(guessIsFemale)
  const males   = en.filter(v => !guessIsFemale(v))

  const picks = []
  let fIdx = 0
  let mIdx = 0

  for (let i = 0; i < 12; i++) {
    if (mIdx < males.length && (picks.length % 2 === 1 || fIdx >= females.length)) {
      picks.push(males[mIdx++])
    } else if (fIdx < females.length) {
      picks.push(females[fIdx++])
    } else if (mIdx < males.length) {
      picks.push(males[mIdx++])
    }
  }

  // Fallback to whatever English voices are left
  if (picks.length < 12) {
    const used = new Set(picks.map(v => v.name))
    picks.push(...en.filter(v => !used.has(v.name)).slice(0, 12 - picks.length))
  }

  const femaleNames = ['Ava', 'Emma', 'Aria', 'Jenny', 'Jane', 'Sonia', 'Zoe', 'Chloe', 'Lily', 'Mia']
  const maleNames   = ['Andrew', 'Brian', 'Guy', 'Davis', 'Ryan', 'Jason', 'Luke', 'Jack', 'Oliver', 'Harry']
  
  let fNameIdx = 0
  let mNameIdx = 0

  return picks.slice(0, 12).map((voice, idx) => {
    const isFemale = guessIsFemale(voice)
    const label = isFemale 
      ? (femaleNames[fNameIdx++] ?? `Voice F${fNameIdx}`)
      : (maleNames[mNameIdx++] ?? `Voice M${mNameIdx}`)
    
    let desc = isFemale ? 'Warm' : 'Natural'
    const lang = voice.lang.toLowerCase()
    if (lang.includes('gb') || lang.includes('uk')) desc = 'British'
    else if (lang.includes('in')) desc = 'Indian'
    else if (lang.includes('au')) desc = 'Aussie'
    else if (voice.name.toLowerCase().includes('premium')) desc = 'Premium'
    else if (voice.name.toLowerCase().includes('enhanced')) desc = 'Enhanced'

    return {
      voice,
      label,
      desc,
      gender: isFemale ? 'F' : 'M'
    }
  })
}

export default function TTSEngine({
  text, rate, onRateChange, volume, isOpen, onToggle,
  totalPages, pageStart, pageEnd, onPageStartChange, onPageEndChange,
  onScrollToPage,
}) {
  const { theme } = useTheme()
  const [minimized, setMinimized] = useState(false)

  // ═══ Playback state ═══
  const [playing, setPlaying] = useState(false)
  const [paused,  setPaused]  = useState(false)
  const [hlIdx,   setHlIdx]   = useState(-1)

  // Stable refs — read inside callbacks without causing re-renders
  const ivRef       = useRef(null)
  const rateRef     = useRef(rate)
  const volumeRef   = useRef(volume)
  rateRef.current   = rate
  volumeRef.current = volume

  // ═══ Voice state ═══
  const [curatedVoices,    setCuratedVoices]    = useState([])
  const [selectedIdx,      setSelectedIdx]      = useState(0)
  const [voicesReady,      setVoicesReady]      = useState(false)
  const [showVoices,       setShowVoices]       = useState(false)
  const voiceRef = useRef(null)

  // ═══ Sentences derived from incoming text ═══
  const sentences = text
    ? text
        .split(/\n+/)
        .flatMap(line => {
          const matched = line.match(/[^.!?]+[.!?]*/g)
          return matched ? matched.map(s => s.trim()) : [line.trim()]
        })
        .filter(Boolean)
    : []
  const sentencesRef = useRef(sentences)
  sentencesRef.current = sentences

  // ─── Load & curate browser voices ───────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      if (!all.length) return
      const curated = curateVoices(all)
      setCuratedVoices(curated)
      if (curated.length > 0) {
        voiceRef.current = curated[0].voice
        setVoicesReady(true)
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Sync voiceRef whenever selection changes
  useEffect(() => {
    if (curatedVoices[selectedIdx]) {
      voiceRef.current = curatedVoices[selectedIdx].voice
    }
  }, [selectedIdx, curatedVoices])

  // ─── Reset on new document ───────────────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis.cancel()
    setPlaying(false); setPaused(false); setHlIdx(-1)
    clearInterval(ivRef.current)
  }, [text])

  // Cleanup on unmount
  useEffect(() => () => {
    window.speechSynthesis.cancel()
    clearInterval(ivRef.current)
  }, [])

  // ─── Core TTS functions ──────────────────────────────────────────────────────
  const speakSentence = useCallback((idx) => {
    const sents = sentencesRef.current
    if (!sents.length || idx < 0 || idx >= sents.length) {
      setPlaying(false)
      setPaused(false)
      setHlIdx(-1)
      return
    }

    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(sents[idx])
    u.rate = rateRef.current
    u.volume = volumeRef.current
    if (voiceRef.current) u.voice = voiceRef.current

    u.onstart = () => {
      setHlIdx(idx)
    }

    u.onend = () => {
      if (idx + 1 < sents.length) {
        speakSentence(idx + 1)
      } else {
        setPlaying(false)
        setPaused(false)
        setHlIdx(-1)
      }
    }

    u.onerror = (e) => {
      if (e.error === 'interrupted') return
      if (idx + 1 < sents.length) {
        speakSentence(idx + 1)
      } else {
        setPlaying(false)
        setPaused(false)
        setHlIdx(-1)
      }
    }

    window.speechSynthesis.speak(u)
    setPlaying(true)
    setPaused(false)
  }, [])

  // Re-speak from current sentence when speed or voice changes mid-playback
  useEffect(() => {
    if (playing && !paused && hlIdx >= 0) {
      speakSentence(hlIdx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, selectedIdx])

  const stopAll = useCallback(() => {
    window.speechSynthesis.cancel()
    setPlaying(false); setPaused(false); setHlIdx(-1)
  }, [])

  // ─── Transport handlers ──────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (!playing) {
      speakSentence(hlIdx >= 0 ? hlIdx : 0)
    } else if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    } else {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }, [playing, paused, hlIdx, speakSentence])

  const handleSkipBack = useCallback(() => {
    const prev = Math.max(0, hlIdx - 1)
    speakSentence(prev)
  }, [hlIdx, speakSentence])

  const handleSkipForward = useCallback(() => {
    const next = Math.min(sentencesRef.current.length - 1, hlIdx + 1)
    speakSentence(next)
  }, [hlIdx, speakSentence])

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    const idx  = Math.min(
      sentences.length - 1,
      Math.max(0, Math.floor(pct * sentences.length)),
    )
    speakSentence(idx)
  }, [sentences, speakSentence])

  // ─── Page range ──────────────────────────────────────────────────────────────
  const handlePageStartChange = useCallback((v) => {
    onPageStartChange(v)
    if (v > pageEnd) onPageEndChange(v)
    onScrollToPage?.(v)
  }, [onPageStartChange, onPageEndChange, pageEnd, onScrollToPage])

  // ─── Derived values ───────────────────────────────────────────────────────────
  const progressPct = sentences.length > 0 && hlIdx >= 0
    ? ((hlIdx + 1) / sentences.length) * 100
    : 0
  const isActive     = playing && !paused
  const canPlay      = !!text
  const currentVoiceName = curatedVoices[selectedIdx]?.voice.name ?? ''

  // ═══ Minimised: floating pill ════════════════════════════════════════════════
  if (minimized) {
    return (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setMinimized(false)}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDim})`,
            color: theme.activeText,
            boxShadow: `0 4px 20px ${theme.primaryGlow}, 0 0 0 1px ${theme.primary}20`,
          }}
        >
          <CaretUp size={16} weight="bold" />
        </button>
      </div>
    )
  }

  // ═══ Full player ══════════════════════════════════════════════════════════════
  return (
    <div className="absolute bottom-3 left-3 right-3 z-30">
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background:    theme.isDark ? 'rgba(16,16,16,0.95)' : 'rgba(250,250,250,0.97)',
          border:        `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow:     `0 8px 32px rgba(0,0,0,${theme.isDark ? '0.5' : '0.12'})`,
          backdropFilter: 'blur(20px)',
        }}
      >

        {/* ── Expanded panel ───────────────────────────────────────────────── */}
        {isOpen && (
          <div className="anim-fade" style={{ borderBottom: `1px solid ${theme.border}` }}>

            {/* Voice picker grid */}
            {showVoices && (
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Lightning size={11} weight="fill" style={{ color: theme.primary }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: theme.textMuted }}
                  >
                    Neural Voices · Browser Native
                  </span>
                </div>

                {/* Persona cards */}
                <div className="flex flex-wrap gap-2">
                  {curatedVoices.map((item, idx) => {
                    const active = idx === selectedIdx
                    return (
                      <button
                        key={item.label}
                        onClick={() => { setSelectedIdx(idx); setShowVoices(false) }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
                        style={{
                          background: active
                            ? theme.primarySoft
                            : theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color:  active ? theme.primary : theme.textSoft,
                          border: active ? `1px solid ${theme.primary}40` : '1px solid transparent',
                        }}
                      >
                        {item.label}
                        <span className="ml-1 opacity-40 text-[9px]">{item.desc}</span>
                        <span className="ml-0.5 opacity-25 text-[8px]">{item.gender}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Resolved voice name */}
                <div className="mt-3 flex items-center gap-1.5">
                  {!voicesReady ? (
                    <span className="text-[10px]" style={{ color: theme.textMuted }}>
                      Loading browser voices…
                    </span>
                  ) : currentVoiceName ? (
                    <span className="text-[10px] font-mono truncate" style={{ color: theme.textMuted }}>
                      → {currentVoiceName}
                    </span>
                  ) : (
                    <span className="text-[10px]" style={{ color: theme.textMuted }}>
                      Using system default voice
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Page range selector */}
            {totalPages > 1 && !showVoices && (
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[11px] font-semibold" style={{ color: theme.textMuted }}>
                  Read pages
                </span>
                <select
                  value={pageStart}
                  onChange={e => handlePageStartChange(parseInt(e.target.value) || 1)}
                  className="font-mono text-[12px] font-medium h-7 pl-2 pr-5 border-none outline-none cursor-pointer rounded-lg"
                  style={{
                    background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.primary,
                  }}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="text-[11px]" style={{ color: theme.textMuted }}>to</span>
                <select
                  value={pageEnd}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1
                    onPageEndChange(v)
                    if (v < pageStart) onPageStartChange(v)
                  }}
                  className="font-mono text-[12px] font-medium h-7 pl-2 pr-5 border-none outline-none cursor-pointer rounded-lg"
                  style={{
                    background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.primary,
                  }}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <button
                  onClick={() => { onPageStartChange(1); onPageEndChange(totalPages) }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                  style={{
                    color:      (pageStart === 1 && pageEnd === totalPages) ? theme.textMuted : theme.primary,
                    background: (pageStart === 1 && pageEnd === totalPages) ? 'transparent' : theme.primarySoft,
                  }}
                >
                  All
                </button>
                <span className="text-[10px] font-mono ml-auto" style={{ color: theme.textMuted }}>
                  {pageEnd - pageStart + 1} pg
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Seek bar ──────────────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-1">
          <div
            className="relative w-full h-4 flex items-center cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="absolute w-full h-[3px] rounded-full"
              style={{ background: theme.borderHard }}
            />
            <div
              className="absolute h-[3px] rounded-full transition-all duration-200"
              style={{ width: `${progressPct}%`, background: theme.primary }}
            />
            {progressPct > 0 && (
              <div
                className="absolute w-3 h-3 rounded-full transition-all duration-200 group-hover:scale-150"
                style={{
                  left:       `${progressPct}%`,
                  marginLeft: -6,
                  background: theme.primary,
                  boxShadow:  `0 0 8px ${theme.primaryGlow}`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] tabular-nums" style={{ color: theme.textMuted }}>
              {sentences.length > 0
                ? `${hlIdx >= 0 ? hlIdx + 1 : 0} / ${sentences.length} sentences`
                : 'Ready'}
            </span>
          </div>
        </div>

        {/* ── Transport bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 pb-3 pt-1">
          {/* Skip back */}
          <button
            onClick={handleSkipBack}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              color:      theme.textMuted,
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <SkipBack size={15} weight="fill" />
          </button>

          {/* Play / pause */}
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 disabled:opacity-20 transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDim})`,
              color:      theme.activeText,
              boxShadow:  isActive
                ? `0 0 0 3px ${theme.primarySoft}, 0 4px 20px ${theme.primaryGlow}`
                : `0 2px 12px ${theme.primaryGlow}`,
              animation: isActive ? 'pulseRing 2s ease-in-out infinite' : 'none',
            }}
          >
            {isActive
              ? <Pause size={18} weight="fill" />
              : <Play  size={18} weight="fill" style={{ marginLeft: 2 }} />
            }
          </button>

          {/* Skip forward */}
          <button
            onClick={handleSkipForward}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              color:      theme.textMuted,
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <SkipForward size={15} weight="fill" />
          </button>

          {/* Speed */}
          <select
            value={rate}
            onChange={e => onRateChange(parseFloat(e.target.value))}
            className="font-mono text-[11px] font-semibold h-8 pl-2.5 border-none outline-none cursor-pointer rounded-xl shrink-0"
            style={{
              background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: theme.primary,
            }}
          >
            {SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
          </select>

          <div className="flex-1" />

          {/* Neural badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0"
            style={{
              background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            <Lightning size={10} weight="fill" style={{ color: theme.primary }} />
            <span className="text-[10px] font-semibold" style={{ color: theme.textMuted }}>
              Neural
            </span>
          </div>

          {/* Voice picker button */}
          <button
            onClick={() => {
              if (isOpen) setShowVoices(v => !v)
              else { onToggle(); setShowVoices(true) }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 transition-all hover:scale-105"
            title="Change voice"
            style={{
              color:      showVoices ? theme.primary : theme.textSoft,
              background: showVoices
                ? theme.primarySoft
                : theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <UserSound size={14} weight={showVoices ? 'fill' : 'regular'} />
            <span className="text-[11px] font-medium">{curatedVoices[selectedIdx]?.label ?? 'Voice'}</span>
          </button>

          {/* Expand / collapse */}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              color:      theme.textMuted,
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            {isOpen
              ? <CaretDown size={13} weight="bold" />
              : <CaretUp  size={13} weight="bold" />
            }
          </button>

          {/* Minimise */}
          <button
            onClick={() => setMinimized(true)}
            title="Hide player"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              color:      theme.textMuted,
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <CaretDown size={13} weight="bold" />
          </button>

          {/* Live waveform indicator */}
          {isActive && (
            <div className="flex items-center gap-1 anim-fade shrink-0">
              <Waveform size={14} weight="bold" style={{ color: theme.primary }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
