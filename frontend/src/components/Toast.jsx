import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { ToastContext } from './ToastContext';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { id, message, type, createdAt: Date.now() }]);
    window.setTimeout(() => dismissToast(id), 3800);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div 
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5" 
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <div 
              key={toast.id} 
              className={`toast-enter pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
                isSuccess 
                  ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100 glow-emerald' 
                  : isError
                  ? 'border-rose-500/30 bg-rose-950/80 text-rose-100 glow-rose'
                  : 'border-blue-500/30 bg-slate-900/90 text-blue-100 glow-blue'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-1 ${
                  isSuccess ? 'bg-emerald-500/20 text-emerald-400' : isError ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 pr-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-75">
                    {isSuccess ? 'Success' : isError ? 'Alert' : 'Notice'}
                  </p>
                  <p className="mt-0.5 text-sm font-medium leading-snug">{toast.message}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => dismissToast(toast.id)} 
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-white/10 hover:text-white" 
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress countdown bar */}
              <div 
                className={`absolute bottom-0 left-0 h-0.5 w-full origin-left ${
                  isSuccess ? 'bg-emerald-400/70' : isError ? 'bg-rose-400/70' : 'bg-blue-400/70'
                }`}
                style={{
                  animation: 'toast-progress 3.8s linear forwards'
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
