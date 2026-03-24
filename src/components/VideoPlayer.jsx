import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../App'
import { LinkSimple, Eye, CornersOut, CornersIn } from '@phosphor-icons/react'

const DEFAULT_VIDEOS = {
  subway: { id: 'i0M4ARe9v0Y', label: 'Surfers' },
  minecraft: { id: 'z84bmLDzIIk', label: 'Minecraft' },
}

let ytApiPromise = null
function loadYTApi() {
  if (ytApiPromise) return ytApiPromise
  if (window.YT?.Player) return Promise.resolve()
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      resolve()
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

export default function VideoPlayer({ videoType, onVideoTypeChange, opacity, onOpacityChange, volume }) {
  const { theme } = useTheme()
  const [customId, setCustomId] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [videoIds, setVideoIds] = useState({ subway: DEFAULT_VIDEOS.subway.id, minecraft: DEFAULT_VIDEOS.minecraft.id })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const readyRef = useRef(false)
  const volumeRef = useRef(volume)
  const currentTypeRef = useRef(videoType)
  volumeRef.current = volume
  currentTypeRef.current = videoType

  // Create player ONCE on mount
  useEffect(() => {
    let cancelled = false

    loadYTApi().then(() => {
      if (cancelled) return

      const type = currentTypeRef.current
      const isMinecraft = type === 'minecraft'
      const vid = isMinecraft ? DEFAULT_VIDEOS.minecraft.id : DEFAULT_VIDEOS.subway.id

      playerRef.current = new window.YT.Player('gameplay-player', {
        width: '100%',
        height: '100%',
        videoId: vid,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: vid,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          mute: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return
            readyRef.current = true
            e.target.setVolume(volumeRef.current)
            if (volumeRef.current > 0) e.target.unMute()
          },
          onStateChange: (e) => {
            // When video ends in non-playlist mode, restart it
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.playVideo()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch (_) {}
      }
    }
  }, [])

  // Switch video content — fast, no player recreation
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return
    const player = playerRef.current

    const vid = videoIds[videoType]

    try {
      // Stop current video first
      player.stopVideo()

      // Load the new video
      player.loadVideoById({
        videoId: vid,
        startSeconds: 0,
      })

      // Restore volume
      player.setVolume(volumeRef.current)
      if (volumeRef.current > 0) player.unMute()
      else player.mute()
    } catch (err) {
      console.warn('Video switch error:', err)
    }
  }, [videoType, videoIds])

  // Volume control
  useEffect(() => {
    if (!readyRef.current || !playerRef.current?.setVolume) return
    playerRef.current.setVolume(volume)
    if (volume === 0) playerRef.current.mute()
    else playerRef.current.unMute()
  }, [volume])

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }, [])

  function applyCustomId() {
    if (!customId.trim()) return
    let id = customId.trim()
    const m = id.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (m) id = m[1]
    setVideoIds(p => ({ ...p, [videoType]: id }))
    setCustomId('')
    setShowCustom(false)
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 anim-in" style={{ animationDelay: '0.1s' }}>
      {/* Control bar */}
      <div className="flex items-center gap-3 px-5 h-12 shrink-0"
        style={{ borderBottom: `1px solid ${theme.border}` }}>

        <div className="flex rounded-full p-[3px]" style={{ background: theme.surface }}>
          {Object.entries(DEFAULT_VIDEOS).map(([k, v]) => (
            <button key={k} onClick={() => onVideoTypeChange(k)}
              className="px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-300"
              style={{
                background: videoType === k ? theme.primary : 'transparent',
                color: videoType === k ? theme.activeText : theme.textMuted,
                boxShadow: videoType === k ? theme.shadowSm : 'none',
              }}>{v.label}</button>
          ))}
        </div>

        <button onClick={() => setShowCustom(!showCustom)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ color: theme.textMuted, background: showCustom ? theme.primarySoft : 'transparent' }}>
          <LinkSimple size={13} />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <Eye size={13} style={{ color: theme.textMuted }} />
          <input type="range" min="0" max="100" value={Math.round(opacity * 100)}
            onChange={e => onOpacityChange((parseInt(e.target.value) || 0) / 100)}
            className="w-16"
            style={{
              '--track-bg': theme.borderHard,
              '--thumb-color': theme.primary,
              '--thumb-ring': theme.thumbRing,
            }} />
          <span className="font-mono text-[10px] w-7 text-right tabular-nums"
            style={{ color: theme.textMuted }}>{Math.round(opacity * 100)}%</span>

          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ color: theme.textMuted }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <CornersIn size={13} weight="bold" /> : <CornersOut size={13} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Custom ID input */}
      {showCustom && (
        <div className="flex gap-2 px-5 py-3 anim-fade" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <input value={customId} onChange={e => setCustomId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCustomId()}
            placeholder="YouTube URL or Video ID"
            className="flex-1 px-4 py-2 text-[12px] rounded-xl outline-none transition-all duration-200"
            style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
          />
          <button onClick={applyCustomId}
            className="px-4 py-2 text-[11px] font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            style={{ background: theme.primary, color: theme.activeText }}>Set</button>
        </div>
      )}

      {/* Video viewport — fills available space */}
      <div className="flex-1 relative min-h-0 overflow-hidden" style={{ background: '#000' }}>
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity }}>
          <div id="gameplay-player" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: `linear-gradient(transparent, ${theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'})` }} />
      </div>
    </div>
  )
}
