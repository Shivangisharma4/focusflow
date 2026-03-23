import { useState, useRef } from 'react'
import { useTheme } from '../App'
import { FileArrowUp, BookOpenText } from '@phosphor-icons/react'

const isPDF = (file) => file && (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'))

export default function DropZone({ onFileSelect }) {
  const { theme } = useTheme()
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (isPDF(f)) onFileSelect(f)
  }

  const handleChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      onFileSelect(f)
      e.target.value = '' // reset so same file can be re-selected
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    inputRef.current?.click()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 anim-in relative z-10"
      style={{ animationDelay: '0.2s' }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true) }}
      onDragLeave={(e) => { e.stopPropagation(); setOver(false) }}
      onDrop={handleDrop}
      onClick={handleClick}>

      <input ref={inputRef} type="file" accept=".pdf,application/pdf"
        onChange={handleChange} className="hidden" />

      {/* Icon with animated ring */}
      <div className="relative mb-12">
        {/* Glow */}
        <div className="absolute inset-[-20px] rounded-full transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
            opacity: over ? 1 : 0,
            transform: over ? 'scale(2)' : 'scale(1)',
          }} />

        {/* Circle */}
        <div className="w-36 h-36 rounded-full flex items-center justify-center relative transition-all duration-400"
          style={{
            background: theme.surface,
            border: `1.5px ${over ? 'solid' : 'dashed'} ${over ? theme.primary : theme.borderHard}`,
            transform: over ? 'scale(1.06)' : 'scale(1)',
            boxShadow: over ? `0 0 40px ${theme.primaryGlow}` : 'none',
          }}>
          {over
            ? <FileArrowUp size={44} weight="thin" style={{ color: theme.primary }} />
            : <BookOpenText size={44} weight="thin" style={{ color: theme.textMuted }} />
          }
        </div>
      </div>

      <h3 className="text-[26px] font-light tracking-[-0.02em] mb-3 transition-colors duration-300"
        style={{ color: over ? theme.primary : theme.text }}>
        {over ? 'Release to begin' : 'Open a document'}
      </h3>

      <p className="text-[14px]" style={{ color: theme.textMuted }}>
        Drop a PDF here, or click to browse
      </p>

      <span className="font-mono text-[11px] mt-6 px-4 py-1.5 rounded-full"
        style={{ color: theme.textMuted, background: theme.surface, opacity: 0.6 }}>
        .pdf
      </span>
    </div>
  )
}
