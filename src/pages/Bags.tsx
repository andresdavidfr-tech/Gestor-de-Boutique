import React, { useMemo, useRef, useState } from 'react';
import { collection, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logActivity, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Plus, Search, Edit2, ShoppingBag, Camera, Loader2, ShieldCheck, Hash, Clock, LayoutGrid, Rows3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

import { motion, AnimatePresence } from 'motion/react';
import type { Bag, Client } from '../types';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useDebounce } from '../hooks/useDebounce';
import { bagStatus, BAG_STATUS_OPTIONS } from '../lib/status';

type SortKey = 'recent' | 'price_desc' | 'price_asc' | 'age_desc' | 'brand';

// Las fotos del carrete (especialmente en iPhone) suelen ser archivos de
// varios MB en HEIC/JPEG. Subirlas tal cual hace que la carga quede "colgada"
// en conexiones móviles. Redimensionamos y reexportamos a JPEG en el navegador
// para acelerar la subida y normalizar el formato.
const compressImage = (file: File, maxDimension = 1280, quality = 0.82): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (!width || !height) {
        reject(new Error('Dimensiones de imagen inválidas'));
        return;
      }
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto de canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo decodificar la imagen'));
    };
    img.src = objectUrl;
  });
};

// Evita que la UI quede colgada indefinidamente si la red no responde.
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'app/timeout' })), ms)
    )
  ]);
};

export const Bags: React.FC = () => {
  const { data: bags } = useCollection<Bag>(() => query(collection(db, 'bags'), orderBy('createdAt', 'desc')));
  const { data: clients } = useCollection<Client>(() => collection(db, 'clients'));
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [view, setView] = useState<'gallery' | 'table'>('gallery');

  const toast = useToast();
  const confirm = useConfirm();
  const brandInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBag, setEditingBag] = useState<any>(null);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    serialNumber: '',
    grading: 'Excellent',
    conditionDetails: '',
    status: 'available',
    price: 0,
    cost: 0,
    ownerId: '',
    notes: '',
    photoUrl: '',
    entryDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Comprimir/redimensionar antes de subir. Si el navegador no puede
      // procesar el archivo (formato no soportado), usamos el original.
      let dataToUpload: Blob = file;
      let contentType = file.type || 'image/jpeg';
      try {
        dataToUpload = await compressImage(file);
        contentType = 'image/jpeg';
      } catch (compressErr) {
        console.warn('No se pudo comprimir la imagen, se sube el archivo original:', compressErr);
        dataToUpload = file;
      }

      const ext = contentType === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'img');
      const storageRef = ref(storage, `bags/${Date.now()}.${ext}`);
      await withTimeout(uploadBytes(storageRef, dataToUpload, { contentType }), 60000);
      const url = await withTimeout(getDownloadURL(storageRef), 30000);
      setFormData(prev => ({ ...prev, photoUrl: url }));
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      let message = "Error al subir la foto.";
      if (error.code === 'app/timeout') {
        message = "La subida tardó demasiado. Verifica tu conexión e intenta nuevamente con una foto más liviana.";
      } else if (error.code === 'storage/unauthorized') {
        message = "No tienes permisos para subir archivos. Revisa las reglas de Storage en Firebase.";
      } else if (error.code === 'storage/canceled') {
        message = "Carga cancelada.";
      } else if (error.code === 'storage/retry-limit-exceeded') {
        message = "Se agotó el tiempo de subida por la conexión. Intenta nuevamente.";
      }
      toast.error(message);
    } finally {
      setUploading(false);
      // Permite volver a seleccionar el mismo archivo si hubo un error.
      e.target.value = '';
    }
  };

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name;

  const ageInDays = (bag: Bag) => {
    if (!bag.entryDate) return -1;
    const d = new Date(bag.entryDate);
    return isNaN(d.getTime()) ? -1 : differenceInDays(new Date(), d);
  };

  const filteredBags = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    const result = bags.filter((bag) => {
      const matchesText =
        !term ||
        (bag.brand?.toLowerCase() || '').includes(term) ||
        (bag.model?.toLowerCase() || '').includes(term) ||
        (bag.serialNumber?.toLowerCase() || '').includes(term);
      const matchesStatus = statusFilter === 'all' || bag.status === statusFilter;
      return matchesText && matchesStatus;
    });

    const sorted = [...result];
    switch (sortKey) {
      case 'price_desc': sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
      case 'price_asc': sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
      case 'age_desc': sorted.sort((a, b) => ageInDays(b) - ageInDays(a)); break;
      case 'brand': sorted.sort((a, b) => (a.brand || '').localeCompare(b.brand || '')); break;
      default: break; // 'recent' keeps Firestore order (createdAt desc)
    }
    return sorted;
  }, [bags, debouncedSearch, statusFilter, sortKey]);

  const emptyForm = () => ({
    brand: '',
    model: '',
    serialNumber: '',
    grading: 'Excellent',
    conditionDetails: '',
    status: 'available',
    price: 0,
    cost: 0,
    ownerId: '',
    notes: '',
    photoUrl: '',
    entryDate: new Date().toISOString().split('T')[0],
  });

  const openModal = (bag?: any) => {
    if (bag) {
      setEditingBag(bag);
      setFormData({
        brand: bag.brand || '',
        model: bag.model || '',
        serialNumber: bag.serialNumber || '',
        grading: bag.grading || 'Excellent',
        conditionDetails: bag.conditionDetails || '',
        status: bag.status || 'available',
        price: bag.price || 0,
        cost: bag.cost || 0,
        ownerId: bag.ownerId || '',
        notes: bag.notes || '',
        photoUrl: bag.photoUrl || '',
        entryDate: bag.entryDate || new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingBag(null);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
    // Autofoco en "Marca" para cargar rápido sin tocar el mouse.
    setTimeout(() => brandInputRef.current?.focus(), 50);
  };

  // `keepOpen` = patrón "Guardar y crear otra" para carga masiva.
  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
      };

      if (editingBag) {
        await updateDoc(doc(db, 'bags', editingBag.id), dataToSave);
        await logActivity('Actualización de Cartera', { brand: dataToSave.brand, model: dataToSave.model, id: editingBag.id });
        toast.success('Cartera actualizada');
        setIsModalOpen(false);
      } else {
        const docRef = await addDoc(collection(db, 'bags'), { ...dataToSave, createdAt: serverTimestamp() });
        await logActivity('Nueva Cartera', { brand: dataToSave.brand, model: dataToSave.model, id: docRef.id });
        toast.success(keepOpen ? `"${dataToSave.brand}" agregada. Cargá la siguiente.` : 'Cartera agregada');
        if (keepOpen) {
          setFormData(emptyForm());
          setTimeout(() => brandInputRef.current?.focus(), 50);
        } else {
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      toast.error('No se pudo guardar la cartera. Reintentá.');
      try { handleFirestoreError(err, editingBag ? OperationType.UPDATE : OperationType.CREATE, 'bags'); } catch { /* logged */ }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBag) return;

    const ok = await confirm({
      title: 'Eliminar cartera',
      message: `Se eliminará "${editingBag.brand} ${editingBag.model || ''}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    setLoading(true);
    try {
      if (editingBag.photoUrl) {
        try {
          await deleteObject(ref(storage, editingBag.photoUrl));
        } catch (e) {
          console.error('Error deleting image from storage:', e);
        }
      }
      await deleteDoc(doc(db, 'bags', editingBag.id));
      await logActivity('Eliminación de Cartera', { brand: editingBag.brand, model: editingBag.model, id: editingBag.id });
      setIsModalOpen(false);
      toast.success('Cartera eliminada');
    } catch (err) {
      toast.error('No se pudo eliminar la cartera.');
      try { handleFirestoreError(err, OperationType.DELETE, 'bags'); } catch { /* logged */ }
    } finally {
      setLoading(false);
    }
  };

  // Cambio de estado rápido desde la tabla (optimista vía onSnapshot).
  const handleInlineStatus = async (bag: Bag, status: string) => {
    try {
      await updateDoc(doc(db, 'bags', bag.id), { status });
      await logActivity('Actualización de Cartera', { brand: bag.brand, model: bag.model, id: bag.id });
      toast.success(`"${bag.brand}" → ${bagStatus(status).label}`);
    } catch (err) {
      toast.error('No se pudo cambiar el estado.');
      try { handleFirestoreError(err, OperationType.UPDATE, 'bags'); } catch { /* logged */ }
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

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center px-6 py-4 glass-card flex-1">
            <Search className="h-5 w-5 text-brand-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por marca, modelo o S/N..."
              className="flex-1 border-none focus:ring-0 text-sm min-w-0 bg-transparent placeholder-brand-300 text-brand-900 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="input-field py-3 !w-auto text-xs font-bold"
              title="Ordenar"
            >
              <option value="recent">Más recientes</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="age_desc">Más antiguas en stock</option>
              <option value="brand">Marca (A-Z)</option>
            </select>
            <div className="flex items-center bg-white border border-brand-100 rounded-lg p-1">
              <button
                onClick={() => setView('gallery')}
                className={`p-2 rounded-md transition-all ${view === 'gallery' ? 'bg-brand-950 text-brand-100' : 'text-brand-400 hover:text-brand-700'}`}
                title="Vista galería"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('table')}
                className={`p-2 rounded-md transition-all ${view === 'table' ? 'bg-brand-950 text-brand-100' : 'text-brand-400 hover:text-brand-700'}`}
                title="Vista tabla"
              >
                <Rows3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          {[{ value: 'all', label: 'Todas' }, ...BAG_STATUS_OPTIONS].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === opt.value
                  ? 'bg-brand-950 text-brand-100 shadow-lg'
                  : 'bg-white text-brand-400 hover:bg-brand-50 border border-brand-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[10px] font-black text-brand-300 uppercase tracking-widest">
            {filteredBags.length} {filteredBags.length === 1 ? 'pieza' : 'piezas'}
          </span>
        </div>
      </div>

      {filteredBags.length === 0 ? (
        <div className="py-20 text-center glass-card">
          <div className="inline-flex p-6 rounded-full bg-brand-50 mb-4">
            <ShoppingBag className="h-12 w-12 text-brand-200" />
          </div>
          <p className="text-brand-400 font-bold">No se encontraron carteras con esos filtros.</p>
        </div>
      ) : view === 'table' ? (
        <div className="glass-card overflow-x-auto border-none shadow-xl shadow-brand-100/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black text-brand-400 uppercase tracking-widest border-b border-brand-50">
                <th className="px-4 py-4">Pieza</th>
                <th className="px-4 py-4 hidden sm:table-cell">S/N</th>
                <th className="px-4 py-4 hidden md:table-cell">Antigüedad</th>
                <th className="px-4 py-4">Precio</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-4 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filteredBags.map((bag) => {
                const age = ageInDays(bag);
                return (
                  <tr key={bag.id} className="hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-lg bg-brand-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {bag.photoUrl ? (
                            <img src={bag.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-brand-200" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-brand-950 truncate">{bag.brand || 'Sin Marca'}</p>
                          <p className="text-xs text-brand-400 truncate">{bag.model || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-brand-500">{bag.serialNumber || '---'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-brand-500 font-medium">
                      {bag.status === 'available' && age >= 0 ? `${age} días` : '—'}
                    </td>
                    <td className="px-4 py-3 font-display font-black text-brand-900">${Number(bag.price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        value={bag.status}
                        onChange={(e) => handleInlineStatus(bag, e.target.value)}
                        className={`text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 border-none cursor-pointer focus:ring-1 focus:ring-brand-400 ${bagStatus(bag.status).className}`}
                      >
                        {BAG_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openModal(bag)}
                        className="p-2 text-brand-400 hover:text-brand-700 hover:bg-brand-100 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
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
                <div className="absolute top-4 right-4 shadow-lg rounded-full">
                  <Badge {...bagStatus(bag.status)} />
                </div>
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

                  {bag.status === 'available' && bag.entryDate && (
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black text-brand-400 uppercase tracking-widest">
                      <Clock className="h-3 w-3" />
                      Antigüedad: {differenceInDays(new Date(), new Date(bag.entryDate))} días
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm px-1">
                    <span className="text-brand-400 font-bold uppercase text-xs tracking-widest">Grading</span>
                    <span className={`font-black ${
                      bag.grading === 'Mint' ? 'text-brand-600' : 'text-brand-800'
                    }`}>{bag.grading || 'Excellent'}</span>
                  </div>

                  <div className="flex justify-between text-sm px-1 pt-2">
                    <span className="text-brand-400 font-bold uppercase text-xs tracking-widest">S/N</span>
                    <span className="font-mono text-xs text-brand-500 font-bold">{bag.serialNumber || '---'}</span>
                  </div>

                  {bag.ownerId && (
                    <div className="pt-4 border-t border-brand-50 flex items-center justify-between">
                      <span className="text-xs font-black text-brand-400 uppercase tracking-widest">Propietario</span>
                      <span className="text-sm font-bold text-brand-700 truncate max-w-[140px]">
                        {clientName(bag.ownerId) || 'Desconocido'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {/* Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBag ? 'Editar Cartera' : 'Nueva Cartera'}
        onDelete={editingBag ? handleDelete : undefined}
        deleteDisabled={loading}
        deleteTitle="Eliminar Cartera"
      >
                  <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
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
                        <input ref={brandInputRef} type="text" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="input-field" placeholder="Ej. Chanel" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Modelo</label>
                        <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="input-field" placeholder="Ej. Classic Flap" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Hash className="h-3 w-3" /> Date Code / S/N
                        </label>
                        <input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="input-field" placeholder="Ej. LP4101" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3" /> Grading Luxury *
                        </label>
                        <select required value={formData.grading} onChange={e => setFormData({...formData, grading: e.target.value})} className="input-field">
                          <option value="Mint">Mint (Como nueva)</option>
                          <option value="Excellent">Excellent (Mínimo uso)</option>
                          <option value="Very Good">Very Good (Uso normal)</option>
                          <option value="Fair">Fair (Desgaste visible)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Detalles de conservación</label>
                      <textarea value={formData.conditionDetails} onChange={e => setFormData({...formData, conditionDetails: e.target.value})} rows={2} className="input-field" placeholder="Ej. Pátina en el asa, ligero roce en esquinas..." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Fecha de Ingreso *</label>
                        <input type="date" required value={formData.entryDate} onChange={e => setFormData({...formData, entryDate: e.target.value})} className="input-field" />
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-brand-50 pt-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Precio de Venta ($) *</label>
                        <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="input-field border-brand-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Costo / Valor Pactado ($)</label>
                        <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})} className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Propietario / Consignatario</label>
                      <select value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})} className="input-field">
                        <option value="">-- LVSM (Inventario Propio) --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas del Catálogo</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} className="input-field" placeholder="Descripción para el cliente..." />
                    </div>
                    <div className="pt-4 space-y-3">
                      <div className="flex flex-col sm:flex-row-reverse gap-3">
                        <button type="submit" disabled={loading || uploading} className="btn-primary flex-1">
                          {loading ? 'Guardando...' : editingBag ? 'Guardar Cambios' : 'Guardar Cartera'}
                        </button>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                          Cancelar
                        </button>
                      </div>
                      {!editingBag && (
                        <button
                          type="button"
                          disabled={loading || uploading}
                          onClick={(e) => handleSubmit(e, true)}
                          className="w-full text-xs font-black text-brand-500 uppercase tracking-widest hover:text-brand-800 transition-all py-2 disabled:opacity-50"
                        >
                          + Guardar y cargar otra
                        </button>
                      )}
                    </div>
                  </form>
      </Modal>
    </motion.div>
  );
};
