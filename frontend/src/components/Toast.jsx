import { createContext, useCallback, useContext, useState } from 'react'

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
      <div className="fixed bottom-6 right-6 z-[100] space-y-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`px-4 py-3 text-sm shadow-xl text-white rounded ${t.kind === 'error' ? 'bg-red-700' : 'bg-ink border-l-2 border-gold'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
