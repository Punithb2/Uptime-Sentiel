import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ 
  open, 
  title, 
  description, 
  confirmLabel = 'Confirm', 
  onConfirm, 
  onCancel, 
  isPending = false 
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && !isPending) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isPending, onCancel]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="fade-enter absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
        onClick={!isPending ? onCancel : undefined} 
      />

      {/* Modal Card */}
      <div className="dialog-enter relative w-full max-w-md rounded-2xl border border-rose-500/25 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        <button 
          type="button" 
          onClick={onCancel} 
          disabled={isPending} 
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50" 
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h2 id="confirm-dialog-title" className="pr-6 text-lg font-bold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isPending} 
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={isPending} 
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 hover:shadow-rose-600/50 disabled:cursor-wait disabled:opacity-70"
          >
            {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {isPending ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
