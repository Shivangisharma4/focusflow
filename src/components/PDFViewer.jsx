import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { cleanPDFText } from '../utils/textCleaner'
import { useTheme } from '../App'

const PDFViewer = forwardRef(function PDFViewer({ fileUrl, onTotalPages, onTextExtracted }, ref) {
  const { theme } = useTheme()
  const containerRef = useRef(null)
  const [w, setW] = useState(400)
  const [numPages, setNumPages] = useState(0)
  const pageRefs = useRef({})

  // Expose scrollToPage to parent
  useImperativeHandle(ref, () => ({
    scrollToPage: (pageNum) => {
      const el = pageRefs.current[pageNum]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }))

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((e) => { const width = e[0]?.contentRect.width; if (width) setW(width - 40) })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Extract ALL text when PDF loads
  useEffect(() => {
    if (!fileUrl) return
    let cancelled = false
    ;(async () => {
      try {
        const pdf = await pdfjs.getDocument(fileUrl).promise
        const pageTexts = []
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p)
          const content = await page.getTextContent()
          pageTexts.push(cleanPDFText(content.items.map(i => i.str).join(' ')))
        }
        if (!cancelled) onTextExtracted(pageTexts)
      } catch (e) { console.error(e) }
    })()
    return () => { cancelled = true }
  }, [fileUrl])

  const handleLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n)
    onTotalPages(n)
  }, [onTotalPages])

  return (
    <div ref={containerRef} className="flex flex-col min-h-0 anim-in" style={{ animationDelay: '0.12s' }}>
      <div className="rounded-xl overflow-hidden"
        style={{ background: theme.card }}>
        <Document file={fileUrl} onLoadSuccess={handleLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-40">
              <span className="text-[14px]" style={{ color: theme.textMuted }}>Loading...</span>
            </div>
          }>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i + 1}
              ref={el => { pageRefs.current[i + 1] = el }}
              data-page={i + 1}
              className="flex justify-center"
              style={{ borderBottom: i < numPages - 1 ? `1px solid ${theme.border}` : 'none' }}>
              <Page
                pageNumber={i + 1}
                width={w}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>

      {numPages > 0 && (
        <div className="flex items-center justify-center py-4">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: theme.textMuted }}>
            {numPages} page{numPages !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
})

export default PDFViewer
