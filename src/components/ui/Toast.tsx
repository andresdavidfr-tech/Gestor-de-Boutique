import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X, Undo2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ShowOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, opts?: ShowOptions) => void;
  success: (message: string, opts?: ShowOptions) => void;
  error: (message: string, opts?: ShowOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  success: () => {},
  error: () => {},
});

export const useToast = () => useContext(ToastContext);

let idSeq = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, opts?: ShowOptions) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, type: opts?.type ?? 'info', message, action: opts?.action }]);
      const duration = opts?.duration ?? (opts?.action ? 5000 : 3500);
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const success = useCallback((message: string, opts?: ShowOptions) => show(message, { ...opts, type: 'success' }), [show]);
  const error = useCallback((message: string, opts?: ShowOptions) => show(message, { ...opts, type: 'error' }), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="pointer-events-auto flex items-center gap-3 bg-brand-950 text-brand-50 px-5 py-4 rounded-2xl shadow-2xl shadow-brand-950/20"
            >
              {t.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-brand-300 flex-shrink-0" />}
              <span className="text-sm font-medium flex-1 leading-tight">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    remove(t.id);
                  }}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-brand-300 hover:text-white transition-colors flex-shrink-0"
                >
                  <Undo2 className="h-3.5 w-3.5" /> {t.action.label}
                </button>
              )}
              <button onClick={() => remove(t.id)} className="text-brand-500 hover:text-white transition-colors flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
