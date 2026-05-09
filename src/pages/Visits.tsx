import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logActivity } from '../firebase';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Edit2, X, Tag, CalendarPlus, Trash2 } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale';

import { motion, AnimatePresence } from 'motion/react';

export const Visits: React.FC = () => {
  const [visits, setVisits] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    date: '',
    status: 'scheduled',
    purpose: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch clients for reference
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clientsMap: Record<string, any> = {};
      const list: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        clientsMap[doc.id] = data;
        list.push({ id: doc.id, ...data });
      });
      setClients(clientsMap);
      setClientsList(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clients');
    });

    // Fetch visits
    const q = query(collection(db, 'visits'), orderBy('date', 'asc'));
    const unsubVisits = onSnapshot(q, (snapshot) => {
      const visitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVisits(visitsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'visits');
    });

    return () => {
      unsubClients();
      unsubVisits();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const openModal = (visit?: any) => {
    if (visit) {
      setEditingVisit(visit);
      const d = visit.date?.toDate 
        ? visit.date.toDate() 
        : visit.date 
          ? new Date(visit.date) 
          : new Date();
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      
      setFormData({
        clientId: visit.clientId || '',
        date: localISOTime,
        status: visit.status || 'scheduled',
        purpose: visit.purpose || '',
        notes: visit.notes || ''
      });
    } else {
      setEditingVisit(null);
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
      setFormData({ clientId: '', date: localISOTime, status: 'scheduled', purpose: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const visitDate = new Date(formData.date);
      const dataToSave = {
        ...formData,
        date: Timestamp.fromDate(visitDate)
      };

      if (editingVisit) {
        await updateDoc(doc(db, 'visits', editingVisit.id), dataToSave);
        await logActivity('Actualización de Visita', { clientId: dataToSave.clientId, id: editingVisit.id });
      } else {
        const docRef = await addDoc(collection(db, 'visits'), dataToSave);
        await logActivity('Nueva Visita', { clientId: dataToSave.clientId, id: docRef.id });
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingVisit ? OperationType.UPDATE : OperationType.CREATE, 'visits');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!editingVisit) return;
    
    const clientName = clients[editingVisit.clientId]?.name || 'Cliente Desconocido';
    const confirmDelete = window.confirm(`¿Estás seguro que deseas eliminar la visita del cliente "${clientName}"? Esta acción no se puede deshacer.`);
    
    if (confirmDelete) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'visits', editingVisit.id));
        await logActivity('Eliminación de Visita', { clientId: editingVisit.clientId, id: editingVisit.id });
        setIsModalOpen(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'visits');
      } finally {
        setLoading(false);
      }
    }
  };

  const getGoogleCalendarUrl = (visit: any, client: any, visitDate: Date) => {
    const title = encodeURIComponent(`Visita LVSM: ${client?.name || 'Cliente'}`);
    const endDate = addHours(visitDate, 1);
    
    // Format dates to YYYYMMDDTHHmmssZ (UTC)
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };
    
    const dates = `${formatGoogleDate(visitDate)}/${formatGoogleDate(endDate)}`;
    
    let details = '';
    if (visit.purpose) details += `Motivo: ${visit.purpose}\n`;
    if (visit.notes) details += `Notas: ${visit.notes}\n`;
    
    const location = client?.address ? encodeURIComponent(client.address) : '';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${encodeURIComponent(details)}&location=${location}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 relative"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-brand-950 tracking-tight">Agenda</h1>
          <p className="text-brand-500 font-medium">Organiza tus encuentros y entregas con estilo</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Agendar Visita
        </button>
      </div>

      <div className="glass-card overflow-hidden border-none shadow-xl shadow-brand-100/20">
        <ul className="divide-y divide-brand-50">
          <AnimatePresence mode="popLayout">
            {visits.map((visit, idx) => {
            const client = clients[visit.clientId];
            let visitDate: Date;
            try {
              visitDate = visit.date?.toDate 
                ? visit.date.toDate() 
                : visit.date 
                  ? new Date(visit.date) 
                  : new Date();
              if (isNaN(visitDate.getTime())) visitDate = new Date();
            } catch (e) {
              visitDate = new Date();
            }
            
              return (
                <motion.li 
                  key={visit.id} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 hover:bg-brand-50/50 transition-all group"
                >
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-brand-100 flex flex-col items-center justify-center text-brand-600 shadow-inner">
                      <CalendarIcon className="h-6 w-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {format(visitDate, "dd MMM", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-lg font-bold text-brand-950 truncate">
                        {client ? client.name : 'Cliente Desconocido'}
                      </p>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(visit.status)}`}>
                        {getStatusLabel(visit.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-brand-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-brand-300" />
                        {format(visitDate, "HH:mm 'hs'", { locale: es })}
                      </span>
                      {visit.purpose && (
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-brand-300" />
                          {visit.purpose}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <a 
                      href={getGoogleCalendarUrl(visit, client, visitDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-2xl transition-all"
                      title="Agregar a Google Calendar"
                    >
                      <CalendarPlus className="h-5 w-5" />
                    </a>
                    {client?.address && (
                      <a 
                        href={`https://waze.com/ul?q=${encodeURIComponent(client.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-2xl transition-all"
                        title="Ir con Waze"
                      >
                        <MapPin className="h-5 w-5" />
                      </a>
                    )}
                    <button 
                      onClick={() => openModal(visit)}
                      className="p-3 text-brand-400 hover:text-brand-600 hover:bg-brand-100 rounded-2xl transition-all"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {visits.length === 0 && (
            <li className="p-20 text-center">
              <div className="inline-flex p-6 rounded-full bg-brand-50 mb-4">
                <CalendarIcon className="h-12 w-12 text-brand-200" />
              </div>
              <p className="text-brand-400 font-bold">No hay visitas programadas.</p>
            </li>
          )}
        </ul>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm transition-opacity" 
                aria-hidden="true" 
                onClick={() => setIsModalOpen(false)}
              ></motion.div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full"
              >
                <div className="bg-white px-8 pt-8 pb-8">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-display font-bold text-brand-950" id="modal-title">
                        {editingVisit ? 'Editar Visita' : 'Agendar Visita'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {editingVisit && (
                          <button 
                            type="button"
                            onClick={handleDeleteVisit}
                            disabled={loading}
                            className="text-rose-400 hover:text-rose-600 p-2 rounded-full hover:bg-rose-50 transition-all"
                            title="Eliminar Visita"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                        <button onClick={() => setIsModalOpen(false)} className="text-brand-300 hover:text-brand-500 p-2 rounded-full hover:bg-brand-50 transition-all">
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Cliente *</label>
                      <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="input-field">
                        <option value="">-- Seleccionar Cliente --</option>
                        {clientsList.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Fecha y Hora *</label>
                        <input type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Estado *</label>
                        <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field">
                          <option value="scheduled">Programada</option>
                          <option value="completed">Completada</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Motivo</label>
                      <input type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="input-field" placeholder="Ej. Entrega de cartera Chanel" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="input-field" placeholder="Cualquier detalle relevante..." />
                    </div>
                    <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
                      <button type="submit" disabled={loading} className="btn-primary flex-1">
                        {loading ? 'Guardando...' : 'Guardar Visita'}
                      </button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
