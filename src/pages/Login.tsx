import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle } from '../firebase';
import { ShoppingBag, LogIn, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login failed', err);
      if (err.code === 'auth/network-request-failed') {
        setError('Error de red: Asegúrate de que el dominio de la aplicación esté autorizado en la consola de Firebase y que no tengas bloqueadores de anuncios activos.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Por favor intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ShoppingBag className="h-16 w-16 text-brand-500" strokeWidth={1.5} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex justify-center">
          <div className="bg-brand-950 p-6 rounded-none shadow-2xl shadow-brand-900/20 border border-brand-800">
            <ShoppingBag className="h-16 w-16 text-brand-200" strokeWidth={1} />
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl sm:text-5xl font-display font-black text-brand-950 tracking-tighter">
          Vintage LVSM
        </h2>
        <p className="mt-4 text-center text-brand-600 font-bold tracking-[0.3em] uppercase text-xs">
          Panel de Administración Exclusivo
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="glass-card py-12 px-10 shadow-2xl shadow-brand-900/10 border-brand-200">
          <AnimatePresence mode="wait">
            {(error || (user && !isAdmin)) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 rounded-none bg-red-50 border border-red-200 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800 leading-tight">
                  {error || "Acceso restringido. Solo administradores autorizados pueden ingresar."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            <div className="text-center">
              <p className="text-brand-800 font-medium mb-8 leading-relaxed text-sm">
                Ingresa con tu cuenta de Google para gestionar el inventario y clientes de Vintage LVSM.
              </p>
              
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-sm font-display tracking-[0.2em] uppercase rounded-none text-brand-100 bg-brand-950 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando...
                  </div>
                ) : (
                  <>
                    <LogIn className="-ml-1 mr-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    Ingresar con Google
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} Vintage LVSM Management
        </p>
      </motion.div>
    </div>
  );
};
