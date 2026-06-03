'use client'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export function PdfPreviewSidebar({ pdfUrl }: { pdfUrl: string }) {
  const [numPages, setNumPages] = useState(0)

  return (
    <div style={{
      width: '220px',
      flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      background: '#EAEAE4',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      padding: '12px 10px',
    }}>
      <p style={{
        fontSize: '9px',
        fontFamily: 'Unbounded, sans-serif',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        margin: '0 0 10px',
      }}>
        PDF{numPages ? ` · ${numPages} стр.` : ''}
      </p>

      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <p style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'Golos Text, sans-serif' }}>
            Загрузка...
          </p>
        }
        error={
          <p style={{ fontSize: 11, color: '#b91c1c', fontFamily: 'Golos Text, sans-serif' }}>
            Ошибка PDF
          </p>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => window.open(`${pdfUrl}#page=${pageNum}`, '_blank')}
              title={`Страница ${pageNum} — открыть`}
              style={{
                background: 'none',
                border: '2px solid transparent',
                borderRadius: '4px',
                padding: 0,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                overflow: 'hidden',
                display: 'block',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D6A4F' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
            >
              <Page
                pageNumber={pageNum}
                width={196}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              <div style={{
                background: 'white',
                textAlign: 'center',
                fontSize: '9px',
                color: 'var(--ink-soft)',
                padding: '2px 0',
                fontFamily: 'Golos Text, sans-serif',
              }}>
                {pageNum}
              </div>
            </button>
          ))}
        </div>
      </Document>
    </div>
  )
}
