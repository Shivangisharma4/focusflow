import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../App'
import { SpeakerHigh, SpeakerSlash, SpeakerNone, VinylRecord, Shuffle, Heart } from '@phosphor-icons/react'

export default function AudioMixer({ videoVolume, onVideoVolumeChange, ttsVolume, onTTSVolumeChange, lofiVolume, onLofiVolumeChange }) {
  const { theme } = useTheme()
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const loaded = useRef(false)

  // Per-channel mute state: stores the volume before muting
  const [videoMuted, setVideoMuted] = useState(false)
  const [ttsMuted, setTtsMuted] = useState(false)
  const [lofiMuted, setLofiMuted] = useState(false)
  const savedVideo = useRef(videoVolume || 30)
  const savedTts = useRef(ttsVolume || 0.8)
  const savedLofi = useRef(lofiVolume || 45)

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

    if (window.YT?.Player) {
      initPlayer()
    } else {
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

  // Mute all
  const allMuted = videoMuted && ttsMuted && lofiMuted
  const toggleMuteAll = () => {
    if (allMuted) {
      // Unmute all
      onVideoVolumeChange(savedVideo.current)
      onTTSVolumeChange(savedTts.current)
      onLofiVolumeChange(savedLofi.current)
      setVideoMuted(false)
      setTtsMuted(false)
      setLofiMuted(false)
    } else {
      // Mute all
      if (!videoMuted) { savedVideo.current = videoVolume || 30; onVideoVolumeChange(0) }
      if (!ttsMuted) { savedTts.current = ttsVolume || 0.8; onTTSVolumeChange(0) }
      if (!lofiMuted) { savedLofi.current = lofiVolume || 45; onLofiVolumeChange(0) }
      setVideoMuted(true)
      setTtsMuted(true)
      setLofiMuted(true)
    }
  }

  // Per-channel mute toggles
  const toggleVideoMute = () => {
    if (videoMuted) {
      onVideoVolumeChange(savedVideo.current)
      setVideoMuted(false)
    } else {
      savedVideo.current = videoVolume || 30
      onVideoVolumeChange(0)
      setVideoMuted(true)
    }
  }

  const toggleTtsMute = () => {
    if (ttsMuted) {
      onTTSVolumeChange(savedTts.current)
      setTtsMuted(false)
    } else {
      savedTts.current = ttsVolume || 0.8
      onTTSVolumeChange(0)
      setTtsMuted(true)
    }
  }

  const toggleLofiMute = () => {
    if (lofiMuted) {
      onLofiVolumeChange(savedLofi.current)
      setLofiMuted(false)
    } else {
      savedLofi.current = lofiVolume || 45
      onLofiVolumeChange(0)
      setLofiMuted(true)
    }
  }

  // If user drags slider while muted, unmute that channel
  const handleVideoChange = (val) => {
    onVideoVolumeChange(val)
    if (val > 0 && videoMuted) setVideoMuted(false)
  }
  const handleTtsChange = (val) => {
    onTTSVolumeChange(val)
    if (val > 0 && ttsMuted) setTtsMuted(false)
  }
  const handleLofiChange = (val) => {
    onLofiVolumeChange(val)
    if (val > 0 && lofiMuted) setLofiMuted(false)
  }

  const ttsVal = Math.round(ttsVolume * 100)

  return (
    <div ref={containerRef} className="shrink-0 anim-in"
      style={{ borderTop: `1px solid ${theme.border}`, animationDelay: '0.18s' }}>

      {/* Section header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
        <button onClick={toggleMuteAll}
          className="transition-all duration-200 hover:scale-115"
          title={allMuted ? 'Unmute all' : 'Mute all'}>
          {allMuted
            ? <SpeakerSlash size={13} weight="bold" style={{ color: theme.textMuted }} />
            : <SpeakerHigh size={13} weight="bold" style={{ color: theme.primary }} />
          }
        </button>
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: theme.textMuted }}>
          Audio
        </span>
      </div>

      {/* Sliders */}
      <div className="px-5 py-4 space-y-4">
        {/* Video volume */}
        <div className="flex items-center gap-3">
          <button onClick={toggleVideoMute}
            className="w-5 shrink-0 flex justify-center transition-all hover:scale-110"
            title={videoMuted ? 'Unmute video' : 'Mute video'}>
            {videoMuted || videoVolume === 0
              ? <SpeakerNone size={13} weight="bold" style={{ color: theme.textMuted }} />
              : <SpeakerHigh size={13} weight="bold" style={{ color: theme.primary }} />
            }
          </button>
          <span className="text-[12px] w-10 shrink-0" style={{ color: theme.textSoft }}>Video</span>
          <input type="range" min="0" max="100" value={videoVolume}
            onChange={e => handleVideoChange(parseInt(e.target.value) || 0)}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.primary,
              '--thumb-ring': theme.thumbRing,
              opacity: videoMuted ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: videoMuted ? theme.textMuted : theme.primary }}>{videoVolume}%</span>
        </div>

        {/* Voice (TTS) volume */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTtsMute}
            className="w-5 shrink-0 flex justify-center transition-all hover:scale-110"
            title={ttsMuted ? 'Unmute voice' : 'Mute voice'}>
            {ttsMuted || ttsVal === 0
              ? <SpeakerNone size={13} weight="bold" style={{ color: theme.textMuted }} />
              : <SpeakerHigh size={13} weight="bold" style={{ color: theme.text }} />
            }
          </button>
          <span className="text-[12px] w-10 shrink-0" style={{ color: theme.textSoft }}>Voice</span>
          <input type="range" min="0" max="100" value={ttsVal}
            onChange={e => handleTtsChange((parseInt(e.target.value) || 0) / 100)}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.text,
              '--thumb-ring': theme.thumbRing,
              opacity: ttsMuted ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: ttsMuted ? theme.textMuted : theme.textSoft }}>{ttsVal}%</span>
        </div>

        {/* Lo-fi volume */}
        <div className="flex items-center gap-3">
          <button onClick={toggleLofiMute}
            className="w-5 shrink-0 flex justify-center transition-all hover:scale-110"
            title={lofiMuted ? 'Unmute lo-fi' : 'Mute lo-fi'}>
            {lofiMuted || lofiVolume === 0
              ? <SpeakerNone size={13} weight="bold" style={{ color: theme.textMuted }} />
              : <SpeakerHigh size={13} weight="bold" style={{ color: theme.secondary }} />
            }
          </button>
          <span className="text-[12px] w-10 shrink-0" style={{ color: theme.textSoft }}>Lo-Fi</span>
          <input type="range" min="0" max="100" value={lofiVolume}
            onChange={e => handleLofiChange(parseInt(e.target.value) || 0)}
            className="flex-1"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.secondary,
              '--thumb-ring': theme.thumbRing,
              opacity: lofiMuted ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }} />
          <span className="font-mono text-[11px] w-9 text-right tabular-nums"
            style={{ color: lofiMuted ? theme.textMuted : theme.secondary }}>{lofiVolume}%</span>
        </div>
      </div>

      {/* Now playing */}
      <div className="flex items-center gap-3.5 mx-5 mb-5 px-4 py-3 rounded-2xl transition-all duration-300"
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          opacity: lofiMuted ? 0.35 : 1,
        }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: theme.primarySoft }}>
          <VinylRecord size={20} weight="fill"
            style={{
              color: theme.primary,
              animation: lofiMuted ? 'none' : 'vinyl 3s linear infinite',
            }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium truncate" style={{ color: theme.text }}>
            Lofi Girl Radio
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>
            {lofiMuted ? 'Muted' : 'beats to relax / study to'}
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
