import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Users, ShoppingBag, Calendar, Share2, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

import { motion, AnimatePresence } from 'motion/react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    clients: 0,
    bags: 0,
    visits: 0,
  });

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), 
      (snapshot) => setStats(s => ({ ...s, clients: snapshot.size })),
      (error) => handleFirestoreError(error, OperationType.GET, 'clients')
    );
    
    const unsubBags = onSnapshot(collection(db, 'bags'), 
      (snapshot) => setStats(s => ({ ...s, bags: snapshot.size })),
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
    { name: 'Carteras en Stock', value: stats.bags, icon: ShoppingBag, color: 'bg-brand-100 text-brand-600' },
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
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-950 tracking-tighter">Vintage LVSM</h1>
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
          <Link 
            to="/public/client-form" 
            target="_blank"
            className="btn-secondary"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Formulario
          </Link>
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

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-10 bg-gradient-to-br from-white to-brand-50 border-none shadow-xl shadow-brand-100/50"
      >
        <div className="max-w-2xl">
          <h2 className="text-3xl font-display font-bold text-brand-950 mb-4">Excelencia en el mercado de lujo</h2>
          <p className="text-brand-800 leading-relaxed mb-8 font-medium">
            Gestiona tu inventario de piezas exclusivas y mantén el estándar de calidad que define a Vintage LVSM. 
            Cada detalle cuenta en la experiencia de tus clientes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/clients" className="text-brand-600 font-bold hover:text-brand-800 flex items-center gap-2 transition-colors">
              Gestionar Clientes <ExternalLink className="h-4 w-4" />
            </Link>
            <Link to="/bags" className="text-brand-600 font-bold hover:text-brand-800 flex items-center gap-2 transition-colors">
              Ver Inventario <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
