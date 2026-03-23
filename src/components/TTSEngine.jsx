import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../App'
import {
  SkipBack, Play, Pause, SkipForward, Waveform, CaretDown, CaretUp,
  UserSound, Robot, Lightning, Spinner, X
} from '@phosphor-icons/react'

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5]

// ═══ Browser voice quality ranking ═══
function scoreVoice(v) {
  const n = v.name.toLowerCase()
  let s = 0
  if (n.includes('natural') || n.includes('premium') || n.includes('enhanced')) s += 50
  if (n.includes('neural')) s += 40
  if (n.includes('google uk english female')) s += 35
  if (n.includes('google us english')) s += 30
  if (n.includes('google')) s += 20
  if (n.includes('samantha')) s += 25
  if (n.includes('karen')) s += 22
  if (n.includes('daniel')) s += 20
  if (n.includes('microsoft') && n.includes('online')) s += 15
  if (v.lang.startsWith('en')) s += 10
  return s
}

// ═══ Azure Neural Voices — best quality picks ═══
const AZURE_VOICES = [
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava', desc: 'Warm', lang: 'en-US', gender: 'F' },
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew', desc: 'Confident', lang: 'en-US', gender: 'M' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma', desc: 'Friendly', lang: 'en-US', gender: 'F' },
  { id: 'en-US-BrianMultilingualNeural', label: 'Brian', desc: 'Narrator', lang: 'en-US', gender: 'M' },
  { id: 'en-US-JennyNeural', label: 'Jenny', desc: 'Casual', lang: 'en-US', gender: 'F' },
  { id: 'en-US-GuyNeural', label: 'Guy', desc: 'News', lang: 'en-US', gender: 'M' },
  { id: 'en-US-AriaNeural', label: 'Aria', desc: 'Expressive', lang: 'en-US', gender: 'F' },
  { id: 'en-US-DavisNeural', label: 'Davis', desc: 'Calm', lang: 'en-US', gender: 'M' },
  { id: 'en-US-JaneNeural', label: 'Jane', desc: 'Cheerful', lang: 'en-US', gender: 'F' },
  { id: 'en-US-JasonNeural', label: 'Jason', desc: 'Sporty', lang: 'en-US', gender: 'M' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia', desc: 'British', lang: 'en-GB', gender: 'F' },
  { id: 'en-GB-RyanNeural', label: 'Ryan', desc: 'British', lang: 'en-GB', gender: 'M' },
]

// ═══ Azure Speech REST API — direct call ═══
const AZURE_KEY = import.meta.env.VITE_AZURE_KEY || ''
const AZURE_REGION = import.meta.env.VITE_AZURE_REGION || 'eastus'
const AZURE_ENDPOINT = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

async function azureTTS(text, voiceId, voiceLang, _unused1, _unused2, speed, abortSignal) {
  const ratePercent = speed === 1.0 ? 'default' : `${speed >= 1 ? '+' : ''}${Math.round((speed - 1) * 100)}%`
  const safeText = escapeXml(text)

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voiceLang}'>
    <voice name='${voiceId}'>
      <prosody rate='${ratePercent}'>${safeText}</prosody>
    </voice>
  </speak>`

  const resp = await fetch(AZURE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
    signal: abortSignal,
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`TTS error ${resp.status}: ${errText || resp.statusText}`)
  }

  return resp
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Chunk text for Azure TTS (max ~3000 chars per request — Azure supports up to ~10min audio)
function chunkText(text, maxLen = 3000) {
  if (text.length <= maxLen) return [text]
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks = []
  let current = ''
  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    if (current.length + trimmed.length > maxLen && current.length > 0) {
      chunks.push(current.trim())
      current = trimmed
    } else {
      current += ' ' + trimmed
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.length ? chunks : [text]
}

export default function TTSEngine({
  text, rate, onRateChange, volume, isOpen, onToggle,
  totalPages, pageStart, pageEnd, onPageStartChange, onPageEndChange,
  onScrollToPage,
}) {
  const { theme } = useTheme()

  const [engine, setEngine] = useState('azure')
  const [minimized, setMinimized] = useState(false)

  // ═══ Browser TTS state ═══
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hlIdx, setHlIdx] = useState(-1)
  const ivRef = useRef(null)
  const rateRef = useRef(rate)
  const volumeRef = useRef(volume)

  const [browserVoices, setBrowserVoices] = useState([])
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState('')
  const voiceRef = useRef(null)

  // ═══ Azure TTS state ═══
  const [selectedAzureVoice, setSelectedAzureVoice] = useState('en-US-AvaMultilingualNeural')
  const [azureGenerating, setAzureGenerating] = useState(false)
  const [azureError, setAzureError] = useState('')
  const audioRef = useRef(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const audioQueueRef = useRef([])
  const currentChunkIdx = useRef(0)
  const abortRef = useRef(null)
  const textRef = useRef(text)
  const generateAzureRef = useRef(null)

  const [showVoices, setShowVoices] = useState(false)

  const sentences = text ? (text.match(/[^.!?]+[.!?]+/g) || [text]).map(s => s.trim()).filter(Boolean) : []
  const sentencesRef = useRef(sentences)
  sentencesRef.current = sentences
  rateRef.current = rate
  volumeRef.current = volume
  textRef.current = text

  // ═══ Load browser voices ═══
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      if (!all.length) return
      const en = all.filter(v => v.lang.startsWith('en')).sort((a, b) => scoreVoice(b) - scoreVoice(a))
      const rest = all.filter(v => !v.lang.startsWith('en')).sort((a, b) => a.name.localeCompare(b.name))
      setBrowserVoices([...en, ...rest])
      if (!selectedBrowserVoice && en.length) {
        setSelectedBrowserVoice(en[0].name)
        voiceRef.current = en[0]
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  useEffect(() => {
    const v = browserVoices.find(v => v.name === selectedBrowserVoice)
    if (v) voiceRef.current = v
  }, [selectedBrowserVoice, browserVoices])

  // ═══ Audio element setup ═══
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('timeupdate', () => setAudioProgress(audioRef.current.currentTime))
      audioRef.current.addEventListener('loadedmetadata', () => setAudioDuration(audioRef.current.duration))
      audioRef.current.addEventListener('ended', () => {
        currentChunkIdx.current++
        if (currentChunkIdx.current < audioQueueRef.current.length) {
          audioRef.current.src = audioQueueRef.current[currentChunkIdx.current]
          audioRef.current.play()
        } else {
          setAudioPlaying(false)
          setAudioProgress(0)
          currentChunkIdx.current = 0
        }
      })
    }
    return audioRef.current
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  // ═══ Browser TTS ═══
  useEffect(() => { window.speechSynthesis.cancel(); stopAll() }, [text])
  useEffect(() => () => { window.speechSynthesis.cancel(); clearInterval(ivRef.current) }, [])

  useEffect(() => {
    if (engine === 'browser' && playing && !paused && hlIdx >= 0) speakFrom(hlIdx)
  }, [rate, selectedBrowserVoice])

  // When speed or voice changes in Azure mode, clear cached audio so next play regenerates
  // If currently playing, auto-regenerate immediately with new settings
  const prevRateRef = useRef(rate)
  const prevVoiceRef = useRef(selectedAzureVoice)
  useEffect(() => {
    if (engine !== 'azure') return
    const rateChanged = prevRateRef.current !== rate
    const voiceChanged = prevVoiceRef.current !== selectedAzureVoice
    prevRateRef.current = rate
    prevVoiceRef.current = selectedAzureVoice

    if (rateChanged || voiceChanged) {
      const wasPlaying = audioPlaying || azureGenerating
      // Stop and clear cached audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      setAudioPlaying(false); setAudioProgress(0)
      audioQueueRef.current.forEach(u => URL.revokeObjectURL(u))
      audioQueueRef.current = []
      currentChunkIdx.current = 0
      abortRef.current?.abort()
      setAzureGenerating(false)

      // If was playing, auto-regenerate with new settings after a tiny delay
      if (wasPlaying && text) {
        setTimeout(() => {
          generateAzureRef.current?.()
        }, 100)
      }
    }
  }, [rate, selectedAzureVoice, engine, text, audioPlaying, azureGenerating])

  const speakFrom = useCallback((startIdx) => {
    const sents = sentencesRef.current
    if (!sents.length || startIdx >= sents.length) return
    window.speechSynthesis.cancel()
    clearInterval(ivRef.current)

    for (let i = startIdx; i < sents.length; i++) {
      const u = new SpeechSynthesisUtterance(sents[i])
      u.rate = rateRef.current
      u.volume = volumeRef.current
      if (voiceRef.current) u.voice = voiceRef.current
      u.onstart = () => setHlIdx(i)
      u.onend = () => {
        if (i === sents.length - 1) {
          setPlaying(false); setPaused(false); setHlIdx(-1)
          clearInterval(ivRef.current)
        }
      }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true); setPaused(false)
    ivRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause(); window.speechSynthesis.resume()
      }
    }, 10000)
  }, [])

  // ═══ Stop everything ═══
  const stopAll = useCallback(() => {
    window.speechSynthesis.cancel()
    setPlaying(false); setPaused(false); setHlIdx(-1)
    clearInterval(ivRef.current)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    setAudioPlaying(false); setAudioProgress(0)
    audioQueueRef.current.forEach(u => URL.revokeObjectURL(u))
    audioQueueRef.current = []
    currentChunkIdx.current = 0
    abortRef.current?.abort()
    setAzureGenerating(false)
  }, [])

  // ═══ Azure TTS generate ═══
  const generateAzure = useCallback(async () => {
    if (!text) return

    stopAll()
    setAzureGenerating(true)
    setAzureError('')

    const voice = AZURE_VOICES.find(v => v.id === selectedAzureVoice) || AZURE_VOICES[0]
    const chunks = chunkText(text)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (controller.signal.aborted) break

        const resp = await azureTTS(
          chunks[i], voice.id, voice.lang, null, null, rate, controller.signal
        )

        // Read streamed response into blob
        const reader = resp.body.getReader()
        const audioChunks = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (controller.signal.aborted) break
          audioChunks.push(value)
        }

        if (controller.signal.aborted) break

        const blob = new Blob(audioChunks, { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        audioQueueRef.current.push(url)

        // Play first chunk immediately
        if (i === 0) {
          const audio = ensureAudio()
          currentChunkIdx.current = 0
          audio.src = url
          audio.volume = volumeRef.current
          audio.playbackRate = 1.0 // Azure handles speed via SSML prosody
          audio.play()
          setAudioPlaying(true)
          setAzureGenerating(chunks.length > 1)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Azure TTS error:', err)
        const msg = err.message || 'Failed to generate'
        setAzureError(
          msg.includes('401') ? 'Invalid subscription key' :
          msg.includes('403') ? 'Key not authorized for this region' :
          msg.includes('429') ? 'Rate limited — wait a moment' :
          msg.includes('Failed to fetch') ? 'Network error — check region' :
          msg
        )
      }
    }

    setAzureGenerating(false)
  }, [text, selectedAzureVoice, rate, stopAll, ensureAudio])

  // Keep ref in sync so the useEffect can call it
  generateAzureRef.current = generateAzure

  // ═══ Play handler ═══
  const handlePlay = useCallback(() => {
    if (engine === 'browser') {
      if (!playing && !paused) speakFrom(0)
      else if (playing && !paused) { window.speechSynthesis.pause(); setPaused(true) }
      else { window.speechSynthesis.resume(); setPaused(false) }
    } else {
      // Azure
      if (audioPlaying) {
        audioRef.current?.pause()
        setAudioPlaying(false)
      } else if (audioRef.current?.src && audioRef.current.currentTime > 0) {
        audioRef.current.play()
        setAudioPlaying(true)
      } else {
        generateAzure()
      }
    }
  }, [engine, playing, paused, audioPlaying, speakFrom, generateAzure])

  const handleSkipBack = useCallback(() => {
    if (engine === 'browser') speakFrom(Math.max(0, hlIdx - 1))
    else if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
  }, [engine, hlIdx, speakFrom])

  const handleSkipForward = useCallback(() => {
    if (engine === 'browser') speakFrom(Math.min(sentencesRef.current.length - 1, hlIdx + 1))
    else if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5)
  }, [engine, hlIdx, speakFrom])

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    if (engine === 'browser') {
      const idx = Math.min(sentences.length - 1, Math.max(0, Math.floor(pct * sentences.length)))
      speakFrom(idx)
    } else if (audioRef.current && audioDuration > 0) {
      audioRef.current.currentTime = pct * audioDuration
    }
  }, [engine, sentences, audioDuration, speakFrom])

  // ═══ Page selection scrolls PDF ═══
  const handlePageStartChange = useCallback((v) => {
    onPageStartChange(v)
    if (v > pageEnd) onPageEndChange(v)
    onScrollToPage?.(v)
  }, [onPageStartChange, onPageEndChange, pageEnd, onScrollToPage])

  const progressPct = engine === 'browser'
    ? (sentences.length > 0 && hlIdx >= 0 ? ((hlIdx + 1) / sentences.length) * 100 : 0)
    : (audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0)

  const isActive = engine === 'browser' ? (playing && !paused) : audioPlaying
  const canPlay = !!text

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const voiceLabel = engine === 'browser'
    ? (voiceRef.current?.name?.split(' ').slice(0, 2).join(' ') || 'Default')
    : AZURE_VOICES.find(v => v.id === selectedAzureVoice)?.label || 'Ava'

  // ═══ Minimized: floating button ═══
  if (minimized) {
    return (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
        <button onClick={() => setMinimized(false)}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDim})`,
            color: theme.activeText,
            boxShadow: `0 4px 20px ${theme.primaryGlow}, 0 0 0 1px ${theme.primary}20`,
          }}>
          <CaretUp size={16} weight="bold" />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-3 left-3 right-3 z-30">
      <div className="rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: theme.isDark ? 'rgba(16,16,16,0.95)' : 'rgba(250,250,250,0.97)',
          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: `0 8px 32px rgba(0,0,0,${theme.isDark ? '0.5' : '0.12'})`,
          backdropFilter: 'blur(20px)',
        }}>

        {/* Azure error */}
        {azureError && (
          <div className="flex items-center gap-2 px-5 py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <span className="text-[11px] font-medium" style={{ color: '#ef4444' }}>{azureError}</span>
            <button onClick={() => setAzureError('')} className="ml-auto">
              <X size={12} style={{ color: theme.textMuted }} />
            </button>
          </div>
        )}

        {/* Azure generating */}
        {azureGenerating && !audioPlaying && (
          <div className="flex items-center gap-2 px-5 py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <Spinner size={12} className="animate-spin" style={{ color: theme.primary }} />
            <span className="text-[11px] font-medium" style={{ color: theme.textSoft }}>
              Generating speech...
            </span>
          </div>
        )}

        {/* ═══ Expanded panel ═══ */}
        {isOpen && (
          <div className="anim-fade" style={{ borderBottom: `1px solid ${theme.border}` }}>
            {/* Voice picker */}
            {showVoices && (
              <div className="max-h-44 overflow-y-auto">
                {engine === 'browser' ? (
                  browserVoices.map(v => (
                    <button key={v.name} onClick={() => { setSelectedBrowserVoice(v.name); setShowVoices(false) }}
                      className="w-full text-left px-5 py-2 text-[12px] flex items-center gap-2 transition-colors"
                      style={{
                        background: v.name === selectedBrowserVoice ? theme.primarySoft : 'transparent',
                        color: v.name === selectedBrowserVoice ? theme.primary : theme.textSoft,
                      }}>
                      <span className="flex-1 truncate">{v.name}</span>
                      <span className="font-mono text-[10px] shrink-0" style={{ color: theme.textMuted }}>{v.lang}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {AZURE_VOICES.map(v => (
                        <button key={v.id} onClick={() => { setSelectedAzureVoice(v.id); setShowVoices(false); stopAll() }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
                          style={{
                            background: v.id === selectedAzureVoice ? theme.primarySoft : (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                            color: v.id === selectedAzureVoice ? theme.primary : theme.textSoft,
                            border: v.id === selectedAzureVoice ? `1px solid ${theme.primary}40` : '1px solid transparent',
                          }}>
                          {v.label}
                          <span className="ml-1 opacity-40 text-[9px]">{v.desc}</span>
                          <span className="ml-0.5 opacity-25 text-[8px]">{v.gender}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Page range selector */}
            {totalPages > 1 && !showVoices && (
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[11px] font-semibold" style={{ color: theme.textMuted }}>Read pages</span>
                <select value={pageStart}
                  onChange={e => handlePageStartChange(parseInt(e.target.value) || 1)}
                  className="font-mono text-[12px] font-medium h-7 pl-2 pr-5 border-none outline-none cursor-pointer rounded-lg"
                  style={{ background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.primary }}>
                  {Array.from({ length: totalPages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <span className="text-[11px]" style={{ color: theme.textMuted }}>to</span>
                <select value={pageEnd}
                  onChange={e => { const v = parseInt(e.target.value) || 1; onPageEndChange(v); if (v < pageStart) onPageStartChange(v) }}
                  className="font-mono text-[12px] font-medium h-7 pl-2 pr-5 border-none outline-none cursor-pointer rounded-lg"
                  style={{ background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.primary }}>
                  {Array.from({ length: totalPages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <button onClick={() => { onPageStartChange(1); onPageEndChange(totalPages) }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                  style={{
                    color: (pageStart === 1 && pageEnd === totalPages) ? theme.textMuted : theme.primary,
                    background: (pageStart === 1 && pageEnd === totalPages) ? 'transparent' : theme.primarySoft,
                  }}>All</button>
                <span className="text-[10px] font-mono ml-auto" style={{ color: theme.textMuted }}>
                  {pageEnd - pageStart + 1} pg
                </span>
              </div>
            )}
          </div>
        )}

        {/* Seekbar */}
        <div className="px-5 pt-3 pb-1">
          <div className="relative w-full h-4 flex items-center cursor-pointer group" onClick={handleSeek}>
            <div className="absolute w-full h-[3px] rounded-full" style={{ background: theme.borderHard }} />
            <div className="absolute h-[3px] rounded-full transition-all duration-200"
              style={{ width: `${progressPct}%`, background: theme.primary }} />
            {progressPct > 0 && (
              <div className="absolute w-3 h-3 rounded-full transition-all duration-200 group-hover:scale-150"
                style={{
                  left: `${progressPct}%`, marginLeft: -6,
                  background: theme.primary,
                  boxShadow: `0 0 8px ${theme.primaryGlow}`,
                }} />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] tabular-nums" style={{ color: theme.textMuted }}>
              {engine === 'browser'
                ? (sentences.length > 0 ? `${hlIdx >= 0 ? hlIdx + 1 : 0} / ${sentences.length} sentences` : 'Ready')
                : (audioDuration > 0 ? formatTime(audioProgress) : 'Ready')
              }
            </span>
            <span className="font-mono text-[10px] tabular-nums" style={{ color: theme.textMuted }}>
              {engine === 'browser' ? '' : (audioDuration > 0 ? formatTime(audioDuration) : '')}
            </span>
          </div>
        </div>

        {/* ═══ Transport bar ═══ */}
        <div className="flex items-center gap-3 px-5 pb-3 pt-1">
          <button onClick={handleSkipBack}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ color: theme.textMuted, background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <SkipBack size={15} weight="fill" />
          </button>

          <button onClick={handlePlay} disabled={!canPlay}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 disabled:opacity-20 transition-all duration-200 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDim})`,
              color: theme.activeText,
              boxShadow: isActive
                ? `0 0 0 3px ${theme.primarySoft}, 0 4px 20px ${theme.primaryGlow}`
                : `0 2px 12px ${theme.primaryGlow}`,
              animation: isActive ? 'pulseRing 2s ease-in-out infinite' : 'none',
            }}>
            {azureGenerating && !audioPlaying
              ? <Spinner size={18} className="animate-spin" />
              : isActive ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" style={{ marginLeft: 2 }} />
            }
          </button>

          <button onClick={handleSkipForward}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ color: theme.textMuted, background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <SkipForward size={15} weight="fill" />
          </button>

          <select value={rate} onChange={e => onRateChange(parseFloat(e.target.value))}
            className="font-mono text-[11px] font-semibold h-8 pl-2.5 border-none outline-none cursor-pointer rounded-xl shrink-0"
            style={{
              background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: theme.primary,
            }}>
            {SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
          </select>

          <div className="flex-1" />

          {/* Engine toggle */}
          <div className="flex rounded-xl p-[3px] shrink-0"
            style={{ background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
            <button onClick={() => { setEngine('browser'); stopAll() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: engine === 'browser' ? theme.primarySoft : 'transparent',
                color: engine === 'browser' ? theme.primary : theme.textMuted,
              }}>
              <Robot size={13} weight={engine === 'browser' ? 'fill' : 'regular'} /> Basic
            </button>
            <button onClick={() => { setEngine('azure'); stopAll() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: engine === 'azure' ? theme.primarySoft : 'transparent',
                color: engine === 'azure' ? theme.primary : theme.textMuted,
              }}>
              <Lightning size={13} weight={engine === 'azure' ? 'fill' : 'regular'} /> Azure AI
            </button>
          </div>

          {/* Voice picker */}
          <button onClick={() => { if (isOpen) setShowVoices(v => !v); else { onToggle(); setShowVoices(true) } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 transition-all hover:scale-105"
            title="Change voice"
            style={{
              color: showVoices ? theme.primary : theme.textSoft,
              background: showVoices ? theme.primarySoft : (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
            }}>
            <UserSound size={14} weight={showVoices ? 'fill' : 'regular'} />
            <span className="text-[11px] font-medium">{voiceLabel}</span>
          </button>

          {/* Expand/collapse */}
          <button onClick={onToggle}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ color: theme.textMuted, background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            {isOpen ? <CaretDown size={13} weight="bold" /> : <CaretUp size={13} weight="bold" />}
          </button>

          {/* Minimize */}
          <button onClick={() => setMinimized(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            title="Hide player"
            style={{ color: theme.textMuted, background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <CaretDown size={13} weight="bold" />
          </button>

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
