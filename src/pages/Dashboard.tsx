import React, { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Users, ShoppingBag, Calendar, Share2, ExternalLink, PieChart,
  AlertTriangle, TrendingUp, Camera, DollarSign, ArrowRight, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays, isToday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import type { Bag, Client, Visit } from '../types';
import { useCollection } from '../hooks/useCollection';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  const d = value?.toDate ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const Dashboard: React.FC = () => {
  const { data: clients } = useCollection<Client>(() => collection(db, 'clients'));
  const { data: bags } = useCollection<Bag>(() => collection(db, 'bags'));
  const { data: visits } = useCollection<Visit>(() => collection(db, 'visits'));

  const stats = useMemo(() => {
    const availableBags = bags.filter((b) => b.status === 'available');
    const tiedValue = availableBags.reduce((acc, b) => acc + (Number(b.cost) || 0), 0);
    const now = new Date();
    const oldStock = availableBags.filter((b) => {
      const d = toDate(b.entryDate) ?? toDate(b.createdAt) ?? now;
      return differenceInDays(now, d) > 30;
    });
    const bagsNoPhoto = bags.filter((b) => !b.photoUrl);
    const debtors = clients.filter((c) => Number(c.balance || 0) > 0);
    const todayVisits = visits
      .filter((v) => {
        const d = toDate(v.date);
        return d ? isToday(d) : false;
      })
      .sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));

    return {
      clients: clients.length,
      bags: availableBags.length,
      tiedValue,
      oldStockCount: oldStock.length,
      bagsNoPhoto,
      debtors,
      todayVisits,
    };
  }, [clients, bags, visits]);

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name || 'Cliente';

  const statCards = [
    { name: 'Total Clientes', value: stats.clients, icon: Users, to: '/clients' },
    { name: 'Stock Disponible', value: stats.bags, icon: ShoppingBag, to: '/bags' },
    { name: 'Visitas Hoy', value: stats.todayVisits.length, icon: Calendar, to: '/visits' },
  ];

  // Bandeja de acción: pendientes que requieren atención hoy.
  const actionItems = [
    {
      label: 'Carteras sin foto',
      value: stats.bagsNoPhoto.length,
      icon: Camera,
      to: '/bags',
      tone: stats.bagsNoPhoto.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-brand-400 bg-brand-50',
    },
    {
      label: 'Clientes con deuda',
      value: stats.debtors.length,
      icon: DollarSign,
      to: '/clients',
      tone: stats.debtors.length > 0 ? 'text-rose-600 bg-rose-50' : 'text-brand-400 bg-brand-50',
    },
    {
      label: 'Rotación lenta (+30d)',
      value: stats.oldStockCount,
      icon: AlertTriangle,
      to: '/bags',
      tone: stats.oldStockCount > 0 ? 'text-amber-600 bg-amber-50' : 'text-brand-400 bg-brand-50',
    },
  ];

  const shareUrl = `${window.location.origin}/public/client-form`;
  const whatsappText = encodeURIComponent(
    `¡Hola! Por favor ingresa tus datos en nuestro sistema a través de este enlace: ${shareUrl}`
  );

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
          <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir Link
          </a>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Formulario
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={item.to} className="glass-card p-8 group hover:scale-[1.03] transition-all duration-300 block">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-2xl p-4 bg-brand-100 text-brand-600 shadow-inner">
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <span className="text-4xl font-display font-black text-brand-950">{item.value}</span>
                </div>
                <p className="text-sm font-bold text-brand-800 uppercase tracking-wider">{item.name}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bandeja de acción */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className="glass-card p-5 flex items-center gap-4 group hover:shadow-lg transition-all"
            >
              <div className={`rounded-xl p-3 ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-display font-black text-brand-950 leading-none">{item.value}</p>
                <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mt-1 truncate">{item.label}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-200 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Análisis de Riesgo */}
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

        {/* Agenda de hoy */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 bg-gradient-to-br from-white to-brand-50 border-none shadow-xl shadow-brand-100/50 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-brand-950 tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-500" /> Agenda de Hoy
            </h2>
            <Link to="/visits" className="text-brand-500 hover:text-brand-800 transition-colors" title="Ver agenda">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {stats.todayVisits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="inline-flex p-5 rounded-full bg-brand-100/60 mb-3">
                <Calendar className="h-8 w-8 text-brand-300" />
              </div>
              <p className="text-brand-400 font-bold text-sm">No hay visitas programadas para hoy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {stats.todayVisits.map((visit) => {
                const d = toDate(visit.date);
                return (
                  <li key={visit.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm">
                    <div className="h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-brand-950 truncate">{clientName(visit.clientId)}</p>
                      {visit.purpose && <p className="text-xs text-brand-400 truncate">{visit.purpose}</p>}
                    </div>
                    <span className="text-sm font-black text-brand-700">
                      {d ? format(d, "HH:mm", { locale: es }) : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
