import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Users, ShoppingBag, Calendar, Share2, ExternalLink, Download, PieChart, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

import { motion, AnimatePresence } from 'motion/react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    clients: 0,
    bags: 0,
    visits: 0,
    tiedValue: 0,
    oldStockCount: 0
  });

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), 
      (snapshot) => setStats(s => ({ ...s, clients: snapshot.size })),
      (error) => handleFirestoreError(error, OperationType.GET, 'clients')
    );
    
    const unsubBags = onSnapshot(collection(db, 'bags'), 
      (snapshot) => {
        const bagsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const availableBags = bagsData.filter((b: any) => b.status === 'available');
        
        const tiedValue = availableBags.reduce((acc, b: any) => acc + (Number(b.cost) || 0), 0);
        
        const now = new Date();
        const oldStock = availableBags.filter((b: any) => {
          const dateToUse = b.entryDate ? new Date(b.entryDate) : (b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : now));
          return differenceInDays(now, dateToUse) > 30; // Más de 30 días es stock lento
        });

        setStats(s => ({ 
          ...s, 
          bags: availableBags.length,
          tiedValue,
          oldStockCount: oldStock.length
        }));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'bags')
    );

    const unsubVisits = onSnapshot(collection(db, 'visits'), 
      (snapshot) => setStats(s => ({ ...s, visits: snapshot.size })),
      (error) => handleFirestoreError(error, OperationType.GET, 'visits')
    );

    return () => {
      unsubClients();
      unsubBags();
      unsubVisits();
    };
  }, []);

  const statCards = [
    { name: 'Total Clientes', value: stats.clients, icon: Users, color: 'bg-brand-100 text-brand-600' },
    { name: 'Stock Disponible', value: stats.bags, icon: ShoppingBag, color: 'bg-brand-100 text-brand-600' },
    { name: 'Visitas Hoy', value: stats.visits, icon: Calendar, color: 'bg-brand-100 text-brand-600' },
  ];

  const shareUrl = `${window.location.origin}/public/client-form`;
  const whatsappText = encodeURIComponent(`¡Hola! Por favor ingresa tus datos en nuestro sistema a través de este enlace: ${shareUrl}`);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 relative"
    >
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <p className="text-brand-500 font-bold uppercase tracking-[0.3em] text-xs mb-2">Bienvenida, Florencia</p>
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-950 tracking-tighter">LVSM</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a 
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartir Link
          </a>
          <a 
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Formulario
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div 
              key={item.name} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-8 group hover:scale-[1.03] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`rounded-2xl p-4 ${item.color} shadow-inner`}>
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <span className="text-4xl font-display font-black text-brand-950">{item.value}</span>
              </div>
              <p className="text-sm font-bold text-brand-800 uppercase tracking-wider">{item.name}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-10 bg-brand-950 text-brand-100 overflow-hidden relative"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-800 rounded-xl">
                <PieChart className="h-6 w-6 text-brand-200" />
              </div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Análisis de Riesgo</h2>
            </div>
            
            <div className="space-y-8">
              <div>
                <p className="text-xs font-black text-brand-400 uppercase tracking-[0.3em] mb-2">Valor Inmovilizado</p>
                <p className="text-4xl font-display font-black text-white">${stats.tiedValue.toLocaleString()}</p>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-2">Capital total en inventario disponible</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-brand-900/50 rounded-2xl border border-brand-800">
                  <TrendingUp className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Stock Saludable</p>
                  <p className="text-xl font-display font-black">{stats.bags - stats.oldStockCount}</p>
                </div>
                <div className="p-4 bg-brand-900/50 rounded-2xl border border-brand-800">
                  <AlertTriangle className={`h-5 w-5 mb-2 ${stats.oldStockCount > 0 ? 'text-amber-400' : 'text-brand-600'}`} />
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Rotación Lenta</p>
                  <p className="text-xl font-display font-black">{stats.oldStockCount}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10">
            <TrendingUp className="h-48 w-48 text-brand-500" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-10 bg-gradient-to-br from-white to-brand-50 border-none shadow-xl shadow-brand-100/50"
        >
          <div className="max-w-2xl h-full flex flex-col">
            <h2 className="text-3xl font-display font-bold text-brand-950 mb-4 tracking-tight">Excelencia LVSM</h2>
            <p className="text-brand-800 leading-relaxed mb-8 font-medium">
              Gestiona tu inventario de piezas exclusivas y mantén el estándar de calidad que define a LVSM. 
              Utiliza el análisis de riesgo para optimizar tu flujo de caja.
            </p>
            <div className="mt-auto flex flex-wrap gap-6 border-t border-brand-100 pt-8">
              <Link to="/clients" className="group text-brand-600 font-bold hover:text-brand-800 flex items-center gap-2 transition-all uppercase text-[10px] tracking-[0.2em]">
                Clientes <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
              <Link to="/bags" className="group text-brand-600 font-bold hover:text-brand-800 flex items-center gap-2 transition-all uppercase text-[10px] tracking-[0.2em]">
                Inventario <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
              <Link to="/history" className="group text-brand-600 font-bold hover:text-brand-800 flex items-center gap-2 transition-all uppercase text-[10px] tracking-[0.2em]">
                Historial <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
