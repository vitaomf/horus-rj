import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let _nextId = 0;

const ICON = { success: CheckCircle, error: AlertCircle, info: Info };
const COLOR = {
  success: { border: '#4CAF50', text: '#4CAF50', bg: '#4CAF5010' },
  error:   { border: '#ef4444', text: '#ef4444', bg: '#ef444410' },
  info:    { border: '#FFD700', text: '#FFD700', bg: '#FFD70008' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-20 right-4 z-[999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(t => {
          const Icon = ICON[t.type];
          const c    = COLOR[t.type];
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 border shadow-[0_8px_30px_rgba(0,0,0,0.9)] max-w-sm pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200"
              style={{ borderColor: c.border + '60', background: `linear-gradient(${c.bg}, ${c.bg}), #0a0a0a` }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: c.text }} />
              <p className="font-mono text-[10px] tracking-widest flex-1" style={{ color: c.text === '#FFD700' ? '#ccc' : c.text }}>
                {t.message}
              </p>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                aria-label="Fechar notificação"
                className="text-gray-600 hover:text-white transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
