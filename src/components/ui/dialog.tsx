'use client'
/**
 * Styled confirm/notify dialogs matching the site design — a drop-in replacement
 * for the native window.confirm()/alert().
 *
 * Usage:
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Удалить?', message: '…', tone: 'danger' }))) return
 *
 *   const notify = useNotify()
 *   await notify({ title: 'Не удалось удалить', message: err, tone: 'danger' })
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Tone = 'default' | 'danger'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
}
export interface NotifyOptions {
  title: string
  message?: string
  okLabel?: string
  tone?: Tone
}
export interface PromptOptions {
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  multiline?: boolean
}

type Resolver = (v: unknown) => void
interface DialogState {
  kind: 'confirm' | 'notify' | 'prompt'
  title: string
  message?: string
  primaryLabel: string
  cancelLabel?: string
  tone: Tone
  placeholder?: string
  multiline?: boolean
  resolve: Resolver
}

const DialogContext = createContext<{
  confirm: (o: ConfirmOptions) => Promise<boolean>
  notify: (o: NotifyOptions) => Promise<void>
  prompt: (o: PromptOptions) => Promise<string | null>
} | null>(null)

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)
  const [inputValue, setInputValue] = useState('')
  const primaryRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    setState({
      kind: 'confirm',
      title: o.title,
      message: o.message,
      primaryLabel: o.confirmLabel ?? 'Подтвердить',
      cancelLabel: o.cancelLabel ?? 'Отмена',
      tone: o.tone ?? 'default',
      resolve: resolve as Resolver,
    })
  }), [])

  const notify = useCallback((o: NotifyOptions) => new Promise<void>(resolve => {
    setState({
      kind: 'notify',
      title: o.title,
      message: o.message,
      primaryLabel: o.okLabel ?? 'Понятно',
      tone: o.tone ?? 'default',
      resolve: () => resolve(),
    })
  }) as Promise<void>, [])

  const prompt = useCallback((o: PromptOptions) => new Promise<string | null>(resolve => {
    setInputValue(o.defaultValue ?? '')
    setState({
      kind: 'prompt',
      title: o.title,
      message: o.message,
      primaryLabel: o.confirmLabel ?? 'OK',
      cancelLabel: o.cancelLabel ?? 'Отмена',
      tone: 'default',
      placeholder: o.placeholder,
      multiline: o.multiline,
      resolve: resolve as Resolver,
    })
  }), [])

  const close = useCallback((result: boolean) => {
    setState(prev => {
      if (prev) {
        if (prev.kind === 'prompt') prev.resolve(result ? inputValue : null)
        else prev.resolve(result)
      }
      return null
    })
  }, [inputValue])

  // Focus the right control + Escape/Enter handling while open.
  useEffect(() => {
    if (!state) return
    if (state.kind === 'prompt') inputRef.current?.focus()
    else primaryRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); close(state!.kind === 'notify') }
      else if (e.key === 'Enter' && !(state!.kind === 'prompt' && state!.multiline)) {
        e.preventDefault(); close(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, close])

  const danger = state?.tone === 'danger'

  return (
    <DialogContext.Provider value={{ confirm, notify, prompt }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_120ms_ease-out]"
          onMouseDown={e => { if (e.target === e.currentTarget) close(state.kind === 'notify') }}
          role="dialog"
          aria-modal="true"
          aria-label={state.title}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-border overflow-hidden animate-[popIn_140ms_ease-out]">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    danger ? 'bg-red-50 text-red-600' : 'bg-forest/10 text-forest'
                  }`}
                  aria-hidden
                >
                  {danger ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-ink leading-snug">{state.title}</h3>
                  {state.message && (
                    <p className="mt-1.5 text-sm text-ink/60 leading-relaxed whitespace-pre-line">{state.message}</p>
                  )}
                  {state.kind === 'prompt' && (
                    state.multiline ? (
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={state.placeholder}
                        rows={3}
                        className="mt-3 w-full text-sm text-ink px-3 py-2 border border-border rounded-lg bg-white outline-none focus:border-forest/40 resize-y leading-relaxed"
                      />
                    ) : (
                      <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={state.placeholder}
                        className="mt-3 w-full text-sm text-ink px-3 py-2 border border-border rounded-lg bg-white outline-none focus:border-forest/40"
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-5 justify-end">
              {state.kind !== 'notify' && (
                <button
                  onClick={() => close(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-ink text-sm font-medium hover:bg-cream transition-colors"
                >
                  {state.cancelLabel}
                </button>
              )}
              <button
                ref={primaryRef}
                onClick={() => close(true)}
                className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-forest hover:bg-forest-mid'
                }`}
              >
                {state.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

function useDialogs() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useConfirm/useNotify must be used within <DialogProvider>')
  return ctx
}

export function useConfirm() {
  return useDialogs().confirm
}
export function useNotify() {
  return useDialogs().notify
}
export function usePrompt() {
  return useDialogs().prompt
}
