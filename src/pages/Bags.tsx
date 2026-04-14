import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logActivity, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Search, Tag, Edit2, X, ShoppingBag, Camera, Loader2 } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

export const Bags: React.FC = () => {
  const [bags, setBags] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBag, setEditingBag] = useState<any>(null);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    condition: '',
    status: 'available',
    price: 0,
    ownerId: '',
    notes: '',
    photoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `bags/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, photoUrl: url }));
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const qBags = query(collection(db, 'bags'), orderBy('createdAt', 'desc'));
    const unsubBags = onSnapshot(qBags, (snapshot) => {
      setBags(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'bags'));

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));

    return () => {
      unsubBags();
      unsubClients();
    };
  }, []);

  const filteredBags = bags.filter(bag => 
    (bag.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (bag.model?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concession': return 'bg-blue-100 text-blue-800';
      case 'sold': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-gray-100 text-gray-800';
      case 'available': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'concession': return 'En Concesión';
      case 'sold': return 'Vendida';
      case 'returned': return 'Devuelta';
      case 'available': return 'Disponible';
      default: return status;
    }
  };

  const openModal = (bag?: any) => {
    if (bag) {
      setEditingBag(bag);
      setFormData({
        brand: bag.brand || '',
        model: bag.model || '',
        condition: bag.condition || '',
        status: bag.status || 'available',
        price: bag.price || 0,
        ownerId: bag.ownerId || '',
        notes: bag.notes || '',
        photoUrl: bag.photoUrl || ''
      });
    } else {
      setEditingBag(null);
      setFormData({ brand: '', model: '', condition: '', status: 'available', price: 0, ownerId: '', notes: '', photoUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        price: Number(formData.price)
      };

      if (editingBag) {
        await updateDoc(doc(db, 'bags', editingBag.id), dataToSave);
        await logActivity('Actualización de Cartera', { brand: dataToSave.brand, model: dataToSave.model, id: editingBag.id });
      } else {
        const docRef = await addDoc(collection(db, 'bags'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        await logActivity('Nueva Cartera', { brand: dataToSave.brand, model: dataToSave.model, id: docRef.id });
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingBag ? OperationType.UPDATE : OperationType.CREATE, 'bags');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-4xl font-display font-black text-brand-950 tracking-tight">Inventario</h1>
          <p className="text-brand-500 font-medium">Gestiona tus piezas exclusivas</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Nueva Cartera
        </button>
      </div>

      <div className="flex items-center px-6 py-4 glass-card">
        <Search className="h-5 w-5 text-brand-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar carteras por marca o modelo..."
          className="flex-1 border-none focus:ring-0 text-sm min-w-0 bg-transparent placeholder-brand-300 text-brand-900 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredBags.map((bag, idx) => (
            <motion.div 
              key={bag.id} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card overflow-hidden flex flex-col relative group hover:scale-[1.02] transition-all duration-300"
            >
              <button 
                onClick={() => openModal(bag)}
                className="absolute top-4 left-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-brand-600 hover:text-brand-800 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <div className="h-64 bg-brand-50 flex items-center justify-center relative overflow-hidden">
                {bag.photoUrl ? (
                  <img src={bag.photoUrl} alt={`${bag.brand} ${bag.model}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center text-brand-200">
                    <ShoppingBag className="h-20 w-20 mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Sin Foto</span>
                  </div>
                )}
                <span className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${getStatusColor(bag.status)}`}>
                  {getStatusLabel(bag.status)}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-2xl font-display font-bold text-brand-950 leading-tight">{bag.brand || 'Sin Marca'}</h3>
                  <p className="text-sm text-brand-500 font-medium">{bag.model || 'Modelo no especificado'}</p>
                </div>
                
                <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-center p-3 bg-brand-50/50 rounded-xl">
                    <span className="text-xs font-black text-brand-400 uppercase tracking-widest">Precio</span>
                    <span className="text-xl font-display font-black text-brand-900">${Number(bag.price || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm px-1">
                    <span className="text-brand-400 font-bold uppercase text-xs tracking-widest">Condición</span>
                    <span className="font-bold text-brand-800">{bag.condition || 'N/A'}</span>
                  </div>

                  {bag.ownerId && (
                    <div className="pt-4 border-t border-brand-50 flex items-center justify-between">
                      <span className="text-xs font-black text-brand-400 uppercase tracking-widest">Propietario</span>
                      <span className="text-sm font-bold text-brand-700 truncate max-w-[140px]">
                        {clients.find(c => c.id === bag.ownerId)?.name || 'Desconocido'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredBags.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card">
            <div className="inline-flex p-6 rounded-full bg-brand-50 mb-4">
              <ShoppingBag className="h-12 w-12 text-brand-200" />
            </div>
            <p className="text-brand-400 font-bold">No se encontraron carteras en el inventario.</p>
          </div>
        )}
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
                      {editingBag ? 'Editar Cartera' : 'Nueva Cartera'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-brand-300 hover:text-brand-500 p-2 rounded-full hover:bg-brand-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center mb-8">
                      <div className="relative group">
                        <div className="h-40 w-40 bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Camera className="h-10 w-10 text-brand-200" />
                          )}
                          {uploading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                              <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                            </div>
                          )}
                        </div>
                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-brand-950/40 transition-opacity">
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar Foto</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Marca *</label>
                        <input type="text" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="input-field" placeholder="Ej. Chanel" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Modelo</label>
                        <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="input-field" placeholder="Ej. Classic Flap" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Condición</label>
                        <input type="text" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="input-field" placeholder="Ej. Excelente" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Estado *</label>
                        <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field">
                          <option value="available">Disponible</option>
                          <option value="concession">En Concesión</option>
                          <option value="sold">Vendida</option>
                          <option value="returned">Devuelta</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Precio ($)</label>
                        <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Propietario</label>
                        <select value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} className="input-field">
                          <option value="">-- Seleccionar Cliente --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="input-field" placeholder="Detalles sobre autenticidad, desgastes, etc..." />
                    </div>
                    <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
                      <button type="submit" disabled={loading} className="btn-primary flex-1">
                        {loading ? 'Guardando...' : 'Guardar Cartera'}
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
