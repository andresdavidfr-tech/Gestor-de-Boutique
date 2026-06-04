import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If set, the user must type this exact text to enable the confirm button. */
  requireText?: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/** Returns an async `confirm(options)` that resolves to true/false. */
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<((v: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setTyped('');
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = undefined;
    setOpts(null);
  };

  const canConfirm = !opts?.requireText || typed.trim() === opts.requireText.trim();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-950/50 backdrop-blur-sm"
              onClick={() => close(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-2xl flex-shrink-0 ${opts.danger ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-display font-bold text-brand-950">{opts.title}</h3>
                  {opts.message && (
                    <p className="text-sm text-brand-600 font-medium mt-2 leading-relaxed">{opts.message}</p>
                  )}
                </div>
              </div>

              {opts.requireText && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-2">
                    Escribí <span className="text-rose-500">{opts.requireText}</span> para confirmar
                  </p>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="input-field"
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button type="button" onClick={() => close(false)} className="btn-secondary">
                  {opts.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  disabled={!canConfirm}
                  className={`btn-primary ${opts.danger ? '!bg-rose-600 hover:!bg-rose-700' : ''}`}
                >
                  {opts.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
