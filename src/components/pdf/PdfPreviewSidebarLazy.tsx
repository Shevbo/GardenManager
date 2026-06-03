'use client'
import dynamic from 'next/dynamic'

const PdfPreviewSidebarInternal = dynamic(
  () => import('./PdfPreviewSidebar').then(m => m.PdfPreviewSidebar),
  { ssr: false, loading: () => null }
)

export function PdfPreviewSidebarLazy({ pdfUrl }: { pdfUrl: string }) {
  return <PdfPreviewSidebarInternal pdfUrl={pdfUrl} />
}
