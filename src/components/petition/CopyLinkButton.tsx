'use client'

import { useState } from 'react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={copy}
      title={copied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        background: copied ? '#D6F4E5' : 'var(--cream)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
        padding: 0,
      }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7L5.5 10L11.5 4" stroke="#0A3D2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 8.5L8.5 5.5M6.5 3.5L7.7 2.3a2.5 2.5 0 013.5 3.5L10 7M7.5 10.5L6.3 11.7a2.5 2.5 0 01-3.5-3.5L4 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}
