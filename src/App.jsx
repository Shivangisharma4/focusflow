import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import { THEMES } from './utils/themes'
import { Timer, BookOpen, TrendUp, CaretRight, CaretLeft } from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DropZone from './components/DropZone'
import PDFViewer from './components/PDFViewer'
import TTSEngine from './components/TTSEngine'
import VideoPlayer from './components/VideoPlayer'
import AudioMixer from './components/AudioMixer'
import Summarizer from './components/Summarizer'
import Onboarding from './components/Onboarding'

export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

function App() {
  const [themeName, setThemeName] = useState('studio')
  const theme = THEMES[themeName]

  const [activeView, setActiveView] = useState('focus')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [pageTexts, setPageTexts] = useState([])
  const [ttsPageStart, setTtsPageStart] = useState(1)
  const [ttsPageEnd, setTtsPageEnd] = useState(1)
  const [ttsRate, setTtsRate] = useState(1.5)
  const [ttsVolume, setTtsVolume] = useState(0.8)
  const [videoType, setVideoType] = useState('subway')
  const [videoOpacity, setVideoOpacity] = useState(0.75)
  const [videoVolume, setVideoVolume] = useState(30)
  const [lofiVolume, setLofiVolume] = useState(45)
  const [sessionStart] = useState(Date.now())
  const [ttsOpen, setTtsOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [wordsRead, setWordsRead] = useState(0)
  const [pagesRead, setPagesRead] = useState(0)

  const pdfViewerRef = useRef(null)

  const handleFileSelect = useCallback((file) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(URL.createObjectURL(file))
    setPdfFileName(file.name)
    setTotalPages(0)
    setPageTexts([])
    setTtsPageStart(1)
    setTtsPageEnd(1)
  }, [pdfUrl])

  const handleTextExtracted = useCallback((texts) => {
    setPageTexts(texts)
    setTtsPageStart(1)
    setTtsPageEnd(texts.length)
    setWordsRead(texts.join(' ').split(/\s+/).filter(Boolean).length)
  }, [])

  const handleScrollToPage = useCallback((pageNum) => {
    pdfViewerRef.current?.scrollToPage(pageNum)
  }, [])

  // Compute selected text from page range
  const selectedText = pageTexts.length > 0
    ? pageTexts.slice(ttsPageStart - 1, ttsPageEnd).join('\n\n')
    : ''
  const allText = pageTexts.join('\n\n')

  const elapsed = Math.floor((Date.now() - sessionStart) / 1000)

  /* ═══ Reading area (shared between focus & reader) ═══ */
  const readingPanel = (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative"
      style={{ borderRight: activeView === 'focus' ? `1px solid ${theme.border}` : 'none' }}>
      {pdfUrl && (
        <div className="flex items-center gap-3 px-5 h-10 shrink-0 relative" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span className="text-[12px] font-medium truncate flex-1" style={{ color: theme.textSoft }}>
            {pdfFileName.replace('.pdf', '')}
          </span>
          {totalPages > 0 && (
            <span className="text-[10px] font-mono shrink-0" style={{ color: theme.textMuted }}>
              {totalPages} pg
            </span>
          )}
          <Summarizer text={allText} />
          <button onClick={() => { setPdfUrl(null); setPdfFileName(''); setPageTexts([]) }}
            className="text-[10px] font-medium px-3 py-1 rounded-full shrink-0 transition-all hover:scale-105"
            style={{ color: theme.textMuted, background: theme.surface, border: `1px solid ${theme.border}` }}>
            Close
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto px-4 pb-32 min-h-0">
        {pdfUrl ? (
          <PDFViewer ref={pdfViewerRef} fileUrl={pdfUrl} onTotalPages={setTotalPages} onTextExtracted={handleTextExtracted} />
        ) : (
          <DropZone onFileSelect={handleFileSelect} />
        )}
      </div>
      {pdfUrl && (
        <TTSEngine text={selectedText} rate={ttsRate} onRateChange={setTtsRate}
          volume={ttsVolume} isOpen={ttsOpen} onToggle={() => setTtsOpen(o => !o)}
          totalPages={totalPages} pageStart={ttsPageStart} pageEnd={ttsPageEnd}
          onPageStartChange={setTtsPageStart} onPageEndChange={setTtsPageEnd}
          onScrollToPage={handleScrollToPage} />
      )}
    </div>
  )

  /* ═══ Video + Audio panel ═══ */
  const stimPanel = (
    <div className={`${activeView === 'mixer' ? 'flex-1' : 'w-[360px]'} flex flex-col min-h-0 shrink-0`}>
      <VideoPlayer videoType={videoType} onVideoTypeChange={setVideoType}
        opacity={videoOpacity} onOpacityChange={setVideoOpacity} volume={videoVolume} />
      <AudioMixer videoVolume={videoVolume} onVideoVolumeChange={setVideoVolume}
        ttsVolume={ttsVolume} onTTSVolumeChange={setTtsVolume}
        lofiVolume={lofiVolume} onLofiVolumeChange={setLofiVolume} />
    </div>
  )

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      <div className="h-screen flex overflow-hidden relative theme-shift"
        style={{ background: theme.bg, color: theme.text }}>

        {/* Ambient gradient mesh */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 75% 15%, ${theme.primaryGlow} 0%, transparent 100%),
            radial-gradient(ellipse 60% 50% at 25% 85%, ${theme.secondaryGlow} 0%, transparent 100%)
          `,
        }} />

        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Header sessionStart={sessionStart} />

          <div className="flex-1 flex min-h-0">

            {/* ═══ FOCUS: Split view (default) ═══ */}
            {activeView === 'focus' && (<>
              {readingPanel}

              {/* Right panel toggle */}
              <button onClick={() => setRightPanelOpen(o => !o)}
                className="w-5 shrink-0 flex items-center justify-center transition-all duration-200 hover:scale-x-150 z-20 relative"
                style={{
                  color: theme.textMuted,
                  background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  borderLeft: `1px solid ${theme.border}`,
                  borderRight: rightPanelOpen ? 'none' : `1px solid ${theme.border}`,
                }}
                title={rightPanelOpen ? 'Hide panel' : 'Show panel'}>
                {rightPanelOpen ? <CaretRight size={10} weight="bold" /> : <CaretLeft size={10} weight="bold" />}
              </button>

              {rightPanelOpen && stimPanel}
            </>)}

            {/* ═══ READER: Full-width reading, no video ═══ */}
            {activeView === 'reader' && readingPanel}

            {/* ═══ MIXER: Full audio/video controls ═══ */}
            {activeView === 'mixer' && stimPanel}

            {/* ═══ STATS: Session statistics ═══ */}
            {activeView === 'stats' && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 anim-in px-8">
                <h2 className="text-[22px] font-semibold mb-10" style={{ color: theme.text }}>
                  Session Stats
                </h2>

                <div className="grid grid-cols-3 gap-6 w-full max-w-xl">
                  <div className="flex flex-col items-center p-6 rounded-2xl glass"
                    style={{
                      background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${theme.border}`,
                    }}>
                    <Timer size={24} weight="light" style={{ color: theme.primary }} className="mb-3" />
                    <span className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: theme.text }}>
                      {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] mt-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>
                      Time
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-6 rounded-2xl glass"
                    style={{
                      background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${theme.border}`,
                    }}>
                    <BookOpen size={24} weight="light" style={{ color: theme.secondary }} className="mb-3" />
                    <span className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: theme.text }}>
                      {wordsRead.toLocaleString()}
                    </span>
                    <span className="text-[11px] mt-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>
                      Words
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-6 rounded-2xl glass"
                    style={{
                      background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${theme.border}`,
                    }}>
                    <TrendUp size={24} weight="light" style={{ color: theme.primary }} className="mb-3" />
                    <span className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: theme.text }}>
                      {pagesRead}
                    </span>
                    <span className="text-[11px] mt-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>
                      Pages
                    </span>
                  </div>
                </div>

                <p className="text-[13px] mt-10" style={{ color: theme.textMuted }}>
                  {wordsRead > 0
                    ? `Reading at ~${Math.round(wordsRead / Math.max(elapsed / 60, 1))} words per minute`
                    : 'Open a document to start tracking'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Onboarding />
    </ThemeContext.Provider>
  )
}

export default App
