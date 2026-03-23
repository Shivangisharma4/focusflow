import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../App'
import { SpeakerHigh, SpeakerSlash, VinylRecord, Shuffle, Heart } from '@phosphor-icons/react'

export default function AudioMixer({ videoVolume, onVideoVolumeChange, ttsVolume, onTTSVolumeChange, lofiVolume, onLofiVolumeChange }) {
  const { theme } = useTheme()
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const loaded = useRef(false)
  const [muted, setMuted] = useState(false)
  const savedVolumes = useRef({ video: videoVolume, tts: ttsVolume, lofi: lofiVolume })

  // Load lo-fi player via YT IFrame API
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    const initPlayer = () => {
      if (!window.YT?.Player || !containerRef.current) return
      playerRef.current = new window.YT.Player('lofi-player', {
        height: '1', width: '1', videoId: 'jfKfPfyJRdk',
        playerVars: { autoplay: 1, loop: 1, playlist: 'jfKfPfyJRdk', controls: 0 },
        events: { onReady: (e) => e.target.setVolume(lofiVolume) },
      })
    }

    // YT API might already be loaded by VideoPlayer
    if (window.YT?.Player) {
      initPlayer()
    } else {
      // Wait for it
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        initPlayer()
      }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }
  }, [])

  useEffect(() => { playerRef.current?.setVolume?.(lofiVolume) }, [lofiVolume])

  const toggleMute = () => {
    if (muted) {
      onVideoVolumeChange(savedVolumes.current.video)
      onTTSVolumeChange(savedVolumes.current.tts)
      onLofiVolumeChange(savedVolumes.current.lofi)
      setMuted(false)
    } else {
      savedVolumes.current = { video: videoVolume, tts: ttsVolume, lofi: lofiVolume }
      onVideoVolumeChange(0)
      onTTSVolumeChange(0)
      onLofiVolumeChange(0)
      setMuted(true)
    }
  }

  const ttsVal = Math.round(ttsVolume * 100)

  return (
    <div ref={containerRef} className="shrink-0 anim-in"
      style={{ borderTop: `1px solid ${theme.border}`, animationDelay: '0.18s' }}>

      {/* Section header with mute toggle */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
        <button onClick={toggleMute}
          className="transition-all duration-200 hover:scale-115"
          title={muted ? 'Unmute all' : 'Mute all'}>
          {muted
            ? <SpeakerSlash size={13} weight="bold" style={{ color: theme.textMuted }} />
            : <SpeakerHigh size={13} weight="bold" style={{ color: theme.primary }} />
          }
        </button>
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: theme.textMuted }}>
          Audio{muted ? ' (muted)' : ''}
        </span>
      </div>

      {/* Sliders */}
      <div className="px-5 py-4 space-y-4" style={{ opacity: muted ? 0.35 : 1, transition: 'opacity 0.3s' }}>
        {/* Video volume */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] w-12 shrink-0" style={{ color: theme.textSoft }}>Video</span>
          <input type="range" min="0" max="100" value={videoVolume}
            onChange={e => { onVideoVolumeChange(parseInt(e.target.value) || 0); if (muted) setMuted(false) }}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.primary,
              '--thumb-ring': theme.thumbRing,
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: theme.primary }}>{videoVolume}%</span>
        </div>

        {/* Voice (TTS) volume */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] w-12 shrink-0" style={{ color: theme.textSoft }}>Voice</span>
          <input type="range" min="0" max="100" value={ttsVal}
            onChange={e => { onTTSVolumeChange(parseInt(e.target.value) || 0 / 100); if (muted) setMuted(false) }}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.text,
              '--thumb-ring': theme.thumbRing,
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: theme.textSoft }}>{ttsVal}%</span>
        </div>

        {/* Lo-fi volume */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] w-12 shrink-0" style={{ color: theme.textSoft }}>Lo-Fi</span>
          <input type="range" min="0" max="100" value={lofiVolume}
            onChange={e => { onLofiVolumeChange(parseInt(e.target.value) || 0); if (muted) setMuted(false) }}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.secondary,
              '--thumb-ring': theme.thumbRing,
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: theme.secondary }}>{lofiVolume}%</span>
        </div>
      </div>

      {/* Now playing */}
      <div className="flex items-center gap-3.5 mx-5 mb-5 px-4 py-3 rounded-2xl transition-all duration-300"
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          opacity: muted ? 0.35 : 1,
        }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: theme.primarySoft }}>
          <VinylRecord size={20} weight="fill"
            style={{
              color: theme.primary,
              animation: muted ? 'none' : 'vinyl 3s linear infinite',
            }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium truncate" style={{ color: theme.text }}>
            Lofi Girl Radio
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>
            {muted ? 'Paused' : 'beats to relax / study to'}
          </div>
        </div>
        <button className="shrink-0 transition-all duration-200 hover:scale-115"
          style={{ color: theme.textMuted }}>
          <Shuffle size={14} />
        </button>
        <button className="shrink-0 transition-all duration-200 hover:scale-115"
          style={{ color: theme.primary }}>
          <Heart size={14} weight="fill" />
        </button>
      </div>

      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
        <div id="lofi-player" />
      </div>
    </div>
  )
}
