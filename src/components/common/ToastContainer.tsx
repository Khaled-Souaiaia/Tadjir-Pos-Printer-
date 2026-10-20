import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  return (
    <div className="fixed bottom-5 start-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/90 text-white border-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-400'
                : 'bg-slate-800/90 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium leading-snug">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
