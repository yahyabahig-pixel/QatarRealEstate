import { createContext, useCallback, useContext, useState } from 'react'
import { IconCheck, IconX } from './icons'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, kind = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 pl-3 pr-4 py-3 text-sm font-medium shadow-xl shadow-black/15 text-white rounded-xl ${t.kind === 'error' ? 'bg-error' : 'bg-ink'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t.kind === 'error' ? 'bg-white/20' : 'bg-primary/90'}`}>
              {t.kind === 'error' ? <IconX className="w-3.5 h-3.5" /> : <IconCheck className="w-3.5 h-3.5" />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
