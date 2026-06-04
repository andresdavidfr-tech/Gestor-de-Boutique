import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2 } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  children: React.ReactNode;
}

/**
 * Reusable modal shell (overlay + animated card + header with optional
 * delete/close buttons). Replaces the ~80 lines of duplicated modal markup
 * that lived in Bags, Clients and Visits.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  onDelete,
  deleteDisabled,
  deleteTitle = 'Eliminar',
  children,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm transition-opacity"
              aria-hidden="true"
              onClick={onClose}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full"
            >
              <div className="bg-white px-8 pt-8 pb-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="min-w-0">
                    <h3 className="text-2xl font-display font-bold text-brand-950 truncate">{title}</h3>
                    {subtitle && <p className="text-brand-500 font-medium text-sm truncate">{subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onDelete && (
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleteDisabled}
                        className="text-rose-400 hover:text-rose-600 p-2 rounded-full hover:bg-rose-50 transition-all disabled:opacity-50"
                        title={deleteTitle}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-brand-300 hover:text-brand-500 p-2 rounded-full hover:bg-brand-50 transition-all"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
