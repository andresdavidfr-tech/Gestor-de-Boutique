import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { History as HistoryIcon, Clock, User, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export const History: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'history');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'transactions') return item.action.includes('Transacción');
    if (filter === 'visits') return item.action.includes('Visita');
    if (filter === 'bags') return item.action.includes('Cartera');
    if (filter === 'clients') return item.action.includes('Cliente');
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 relative"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-brand-950 tracking-tight">Historial</h1>
          <p className="text-brand-500 font-medium">Registro de actividad de la boutique</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'transactions', 'visits', 'bags', 'clients'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-brand-950 text-brand-100 shadow-lg' 
                  : 'bg-white text-brand-400 hover:bg-brand-50 border border-brand-50'
              }`}
            >
              {f === 'all' ? 'Ver Todo' : 
               f === 'transactions' ? 'Transacciones' : 
               f === 'visits' ? 'Visitas' : 
               f === 'bags' ? 'Inventario' : 'Clientes'}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden border-none shadow-xl shadow-brand-100/20">
        <ul className="divide-y divide-brand-50">
          <AnimatePresence mode="popLayout">
            {filteredHistory.map((item, idx) => {
              const timestamp = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
              return (
                <motion.li 
                  key={item.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.02 }}
                  className="p-6 hover:bg-brand-50/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                        <Activity className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-black text-brand-950 uppercase tracking-wider">
                          {item.action}
                        </p>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-brand-400 uppercase tracking-widest">
                          <Clock className="h-3.5 w-3.5" />
                          {format(timestamp, "dd MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-brand-700 font-medium mb-2">
                        {item.details?.name || item.details?.brand || ''} {item.details?.model || ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-black text-brand-300 uppercase tracking-widest">
                        <User className="h-3 w-3" />
                        {item.userEmail}
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {history.length === 0 && !loading && (
            <li className="p-20 text-center">
              <div className="inline-flex p-6 rounded-full bg-brand-50 mb-4">
                <HistoryIcon className="h-12 w-12 text-brand-200" />
              </div>
              <p className="text-brand-400 font-bold">No hay actividad registrada aún.</p>
            </li>
          )}
        </ul>
      </div>
    </motion.div>
  );
};
