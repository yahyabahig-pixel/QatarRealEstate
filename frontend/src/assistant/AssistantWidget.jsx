import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { useAssistant } from './useAssistant'
import ChatPropertyCard from './ChatPropertyCard'
import Mascot from './Mascot'
import { IconX } from '../components/icons'

// ---------------------------------------------------------------------------------------
// The floating assistant: a launcher button (bottom end corner — the FloatingContact
// pill already owns the start corner) and a premium, restrained chat window in the site's
// identity: ink header, paper canvas, brand-red accents only. RTL/LTR follows the site;
// each bubble sets dir="auto" so an English question inside an Arabic UI still lays out
// correctly. Desktop gets a fixed panel; small screens get an edge-to-edge sheet.
// ---------------------------------------------------------------------------------------

const SparkIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H13l-4.2 3.6c-.65.56-1.8.1-1.8-.76V16h-.5A2.5 2.5 0 0 1 4 13.5v-8Z" fill="currentColor" opacity=".92" />
    <path d="M11.1 6.2c.14-.4.7-.4.84 0l.55 1.55 1.55.55c.4.14.4.7 0 .84l-1.55.55-.55 1.55c-.14.4-.7.4-.84 0l-.55-1.55-1.55-.55c-.4-.14-.4-.7 0-.84l1.55-.55.55-1.55Z" fill="#fff" />
    <circle cx="15.4" cy="11.4" r="1" fill="#fff" opacity=".9" />
  </svg>
)

const SendIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </svg>
)

const RestartIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
)

function Bubble({ msg, t }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`qre-bubble-in flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] ${isUser ? '' : 'w-full'}`}>
        <div dir="auto"
          className={`inline-block text-start rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
            isUser ? 'bg-ink text-white rounded-ee-md' : 'bg-white text-ink border border-neutral-200 rounded-ss-md'}`}>
          {msg.text}
        </div>

        {msg.relaxedNote && (
          <div dir="auto" className="mt-2 text-[12px] text-neutral-600 italic">{msg.relaxedNote}</div>
        )}

        {msg.items?.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.items.map((p) => <ChatPropertyCard key={p.id} p={p} />)}
          </div>
        )}

        {msg.more > 0 && msg.link && (
          <Link to={msg.link}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors">
            {t('assistant.viewAll', { n: msg.items.length + msg.more })}
          </Link>
        )}

        {msg.footnotes?.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {msg.footnotes.map((f, i) => <div key={i} dir="auto" className="text-[11px] text-neutral-500">{f}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssistantWidget() {
  const { t } = useI18n()
  const { messages, busy, send, reset, suggestions } = useAssistant()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [seen, setSeen] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // A small one-time greeting bubble over the mascot — appears briefly, never nags.
  useEffect(() => {
    if (open || seen) { setTeaser(false); return undefined }
    const show = setTimeout(() => setTeaser(true), 1600)
    const hide = setTimeout(() => setTeaser(false), 10000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [open, seen])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy, open])

  useEffect(() => {
    if (open) { setSeen(true); setTimeout(() => inputRef.current?.focus(), 60) }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    send(text)
  }

  return (
    <>
      {/* launcher — the mascot, end corner; FloatingContact keeps the start corner */}
      <div className="fixed bottom-5 end-5 z-40 flex flex-col items-end">
        {teaser && !open && (
          <button type="button" onClick={() => setOpen(true)}
            className="qre-bubble-in mb-2 me-2 bg-ink text-white text-[12px] font-semibold rounded-2xl rounded-ee-sm px-3.5 py-2 shadow-xl shadow-ink/30">
            {t('assistant.teaser')}
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)}
          aria-label={open ? t('common.close') : t('assistant.open')} aria-expanded={open}
          className="relative w-[74px] h-[74px] hover:scale-105 active:scale-95 transition-transform duration-200">
          <Mascot className="w-full h-full" />
          <span aria-hidden
            className={`absolute bottom-0 end-0.5 w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center text-white shadow-md transition-colors ${open ? 'bg-ink' : `bg-primary ${!seen ? 'qre-badge-pulse' : ''}`}`}>
            {open ? <IconX className="w-3.5 h-3.5" /> : <SparkIcon className="w-3.5 h-3.5" />}
          </span>
        </button>
      </div>

      {open && (
        <section role="dialog" aria-label={t('assistant.title')}
          className="qre-chat-in fixed z-50 bottom-24 end-6 max-sm:end-3 max-sm:start-3 max-sm:bottom-20 sm:w-[400px] max-w-[calc(100vw-1.5rem)] h-[600px] max-h-[calc(100dvh-7.5rem)] rounded-2xl overflow-hidden bg-paper border border-ink/10 shadow-2xl shadow-ink/25 flex flex-col">

          {/* header */}
          <header className="bg-gradient-to-br from-ink to-coal text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-inner">
              <SparkIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="font-bold text-[13.5px] leading-tight">{t('assistant.title')}</div>
              <div className="text-[11px] text-white/60 leading-tight mt-0.5">{t('assistant.subtitle')}</div>
            </div>
            <div className="ms-auto flex items-center gap-1">
              <button type="button" onClick={reset} title={t('assistant.newChat')} aria-label={t('assistant.newChat')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <RestartIcon />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* messages */}
          <div ref={scrollRef} className="qre-chat-canvas flex-1 overflow-y-auto px-3 py-4 space-y-3">
            <Bubble t={t} msg={{ role: 'assistant', text: t('assistant.welcome') }} />

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}
                    className="text-[12px] border border-neutral-300 bg-white text-neutral-700 rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) => <Bubble key={m.id} msg={m} t={t} />)}

            {busy && (
              <div className="qre-bubble-in flex justify-start" aria-label={t('assistant.typing')}>
                <div className="bg-white border border-neutral-200 rounded-2xl rounded-ss-md px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span className="qre-dot" /><span className="qre-dot" /><span className="qre-dot" />
                </div>
              </div>
            )}
          </div>

          {/* input */}
          {/* A div, not a <footer>: this is the composer row, and a global "hide the footer"
              rule must never be able to reach it again. */}
          <div className="shrink-0 border-t border-neutral-200 bg-white p-2.5 flex items-center gap-2">
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder={t('assistant.placeholder')} dir="auto" maxLength={400}
              className="field !py-2.5 text-[13px] flex-1" />
            <button type="button" onClick={submit} disabled={busy || !draft.trim()} aria-label={t('assistant.send')}
              className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/25 hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none">
              <SendIcon className="w-4 h-4 rtl:-scale-x-100" />
            </button>
          </div>
        </section>
      )}
    </>
  )
}
