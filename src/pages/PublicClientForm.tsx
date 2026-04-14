import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';

export const PublicClientForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'clients'), {
        ...formData,
        balance: 0,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'clients');
      } catch (handledErr) {
        setError("Hubo un error al enviar tus datos. Por favor intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl opacity-50"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-12 shadow-2xl shadow-brand-900/10 text-center relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="mx-auto flex items-center justify-center h-24 w-24 rounded-none bg-brand-950 mb-8 shadow-inner border border-brand-800"
          >
            <CheckCircle className="h-12 w-12 text-brand-200" />
          </motion.div>
          <h2 className="text-4xl font-display font-black text-brand-950 mb-4 tracking-tighter">¡Todo Listo!</h2>
          <p className="text-brand-600 font-medium leading-relaxed text-sm">
            Tus datos han sido registrados con éxito en Vintage LVSM. Nos pondremos en contacto contigo pronto.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex bg-brand-950 p-4 rounded-none shadow-xl border border-brand-800 mb-6">
            <ShoppingBag className="h-10 w-10 text-brand-200" strokeWidth={1} />
          </div>
          <h2 className="text-4xl font-display font-black text-brand-950 tracking-tighter">Vintage LVSM</h2>
          <p className="text-xs text-brand-500 font-bold uppercase tracking-[0.3em] mt-3">Registro de Cliente</p>
        </div>

        <div className="glass-card p-10 shadow-2xl shadow-brand-900/10 border-brand-200">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 rounded-none bg-red-50 border border-red-200 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800 leading-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Nombre Completo *</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Ej. Maria Garcia"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="maria@ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+54 9..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Dirección</label>
              <textarea
                name="address"
                id="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="input-field"
                placeholder="Calle, Número, Ciudad..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm shadow-xl active:scale-95 transition-all"
            >
              {loading ? 'Enviando...' : 'Registrar mis datos'}
            </button>
          </form>
        </div>
        
        <p className="mt-10 text-center text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em]">
          Vintage LVSM &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
};
