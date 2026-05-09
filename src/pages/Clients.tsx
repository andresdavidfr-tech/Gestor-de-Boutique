import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp, where, limit, increment, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logActivity } from '../firebase';
import { Plus, Search, MapPin, Edit2, X, Users, DollarSign, History as HistoryIcon, Download, ShoppingBag, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

import { motion, AnimatePresence } from 'motion/react';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedClientForTransaction, setSelectedClientForTransaction] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [transactionFormData, setTransactionFormData] = useState({
    type: 'sold',
    amount: 0,
    notes: ''
  });
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    balance: 0,
    notes: '',
    categories: [] as string[],
    brands: [] as string[],
    personalStyle: '',
    wishlist: '',
    birthday: '',
    contactPreference: 'whatsapp'
  });

  const categoryOptions = ['Carteras y Bolsos', 'Billeteras y Marroquinería', 'Accesorios', 'Calzado'];
  const brandOptions = ['Louis Vuitton', 'Chanel', 'Gucci', 'Prada', 'Yves Saint Laurent', 'Hermès', 'Dior', 'Fendi'];
  const styleOptions = ['Clásico / Atemporal', 'Tendencias / Moderno', 'Vintage / Ediciones Limitadas'];

  const toggleListItem = (list: string[], item: string, field: string) => {
    const newList = list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item];
    setFormData({ ...formData, [field]: newList });
  };
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError(null);
      return true;
    }
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(email)) {
      setEmailError('Email inválido');
      return false;
    }
    setEmailError(null);
    return true;
  };

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clients');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedClientForTransaction) {
      const q = query(
        collection(db, 'transactions'), 
        where('clientId', '==', selectedClientForTransaction.id),
        orderBy('date', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));
      return () => unsubscribe();
    }
  }, [selectedClientForTransaction]);

  const filteredClients = clients.filter(client => 
    (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (client.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const openModal = (client?: any) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        balance: client.balance || 0,
        notes: client.notes || '',
        categories: client.categories || [],
        brands: client.brands || [],
        personalStyle: client.personalStyle || '',
        wishlist: client.wishlist || '',
        birthday: client.birthday || '',
        contactPreference: client.contactPreference || 'whatsapp'
      });
    } else {
      setEditingClient(null);
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        address: '', 
        balance: 0, 
        notes: '',
        categories: [],
        brands: [],
        personalStyle: '',
        wishlist: '',
        birthday: '',
        contactPreference: 'whatsapp'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForTransaction) return;
    setLoading(true);
    try {
      const amount = Number(transactionFormData.amount);
      const type = transactionFormData.type;
      
      const balanceChange = type === 'paid' ? -amount : amount;
      const actionLabel = 
        type === 'sold' ? 'Venta' : 
        type === 'paid' ? 'Cobro' : 'Adeudo';

      if (editingTransaction) {
        // Reverse old balance change
        const oldAmount = Number(editingTransaction.amount);
        const oldType = editingTransaction.type;
        const oldBalanceChange = oldType === 'paid' ? -oldAmount : oldAmount;

        await updateDoc(doc(db, 'transactions', editingTransaction.id), {
          amount,
          type,
          notes: transactionFormData.notes,
          updatedAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'clients', selectedClientForTransaction.id), {
          balance: increment(-oldBalanceChange + balanceChange)
        });

        await logActivity('Transacción Editada', { 
          clientName: selectedClientForTransaction.name, 
          type: actionLabel, 
          amount 
        });
      } else {
        await addDoc(collection(db, 'transactions'), {
          clientId: selectedClientForTransaction.id,
          amount,
          type,
          notes: transactionFormData.notes,
          date: serverTimestamp()
        });

        await updateDoc(doc(db, 'clients', selectedClientForTransaction.id), {
          balance: increment(balanceChange)
        });

        await logActivity('Nueva Transacción', { 
          clientName: selectedClientForTransaction.name, 
          type: actionLabel, 
          amount 
        });
      }

      setTransactionFormData({ type: 'sold', amount: 0, notes: '' });
      setEditingTransaction(null);
      setIsTransactionModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (tx: any) => {
    setEditingTransaction(tx);
    setTransactionFormData({
      type: tx.type || 'sold',
      amount: tx.amount || 0,
      notes: tx.notes || ''
    });
  };

  const handleDeleteTransaction = async (tx: any) => {
    if (!selectedClientForTransaction) return;
    
    const confirmDelete = window.confirm(`¿Estás seguro que deseas eliminar este movimiento de $${tx.amount}? El balance del cliente se ajustará automáticamente.`);
    
    if (confirmDelete) {
      setLoading(true);
      try {
        // Reverse balance change
        const amount = Number(tx.amount);
        const type = tx.type;
        const balanceChange = type === 'paid' ? -amount : amount;

        await deleteDoc(doc(db, 'transactions', tx.id));
        
        await updateDoc(doc(db, 'clients', selectedClientForTransaction.id), {
          balance: increment(-balanceChange)
        });

        await logActivity('Movimiento Eliminado', { 
          clientName: selectedClientForTransaction.name, 
          amount: tx.amount 
        });

        if (editingTransaction?.id === tx.id) {
          setEditingTransaction(null);
          setTransactionFormData({ type: 'sold', amount: 0, notes: '' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'transactions');
      } finally {
        setLoading(false);
      }
    }
  };

  const openTransactionModal = (client: any) => {
    setSelectedClientForTransaction(client);
    setIsTransactionModalOpen(true);
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      // Fetch all transactions
      const txSnapshot = await getDocs(collection(db, 'transactions'));
      const allTx = txSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

      // Fetch all bags
      const bagsSnapshot = await getDocs(collection(db, 'bags'));
      const allBags = bagsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

      const dataToExport = clients.map(client => {
        const clientTx = allTx.filter((tx: any) => tx.clientId === client.id);
        const clientBags = allBags.filter((bag: any) => bag.ownerId === client.id);

        return {
          Nombre: client.name,
          Email: client.email,
          Teléfono: client.phone,
          Dirección: client.address,
          Balance: client.balance,
          Notas: client.notes,
          'Fecha Registro': client.createdAt?.toDate ? client.createdAt.toDate().toLocaleDateString() : '',
          'Total Transacciones': clientTx.length,
          'Carteras Vinculadas': clientBags.length,
          'Nombres de Carteras': clientBags.map((b: any) => `${b.brand} ${b.model}`).join(', '),
          Categorías: (client.categories || []).join(', '),
          Marcas: (client.brands || []).join(', '),
          Estilo: client.personalStyle,
          Wishlist: client.wishlist,
          Cumpleaños: client.birthday,
          'Canal Preferido': client.contactPreference
        };
      });

      const txDataToExport = allTx.map((tx: any) => {
        const client = clients.find(c => c.id === tx.clientId);
        return {
          Cliente: client ? client.name : 'Desconocido',
          Tipo: tx.type === 'payment_received' ? 'Cobranza' : 'Pago',
          Monto: tx.amount,
          Notas: tx.notes,
          Fecha: tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : ''
        };
      });

      const bagsDataToExport = allBags.map((bag: any) => {
        const client = clients.find(c => c.id === bag.ownerId);
        return {
          Marca: bag.brand,
          Modelo: bag.model,
          Condición: bag.condition,
          Estado: bag.status,
          Precio: bag.price,
          Propietario: client ? client.name : 'Ninguno',
          Notas: bag.notes
        };
      });

      const workbook = XLSX.utils.book_new();

      const worksheetClients = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(workbook, worksheetClients, "Clientes");

      if (txDataToExport.length > 0) {
        const worksheetTx = XLSX.utils.json_to_sheet(txDataToExport);
        XLSX.utils.book_append_sheet(workbook, worksheetTx, "Transacciones");
      }

      if (bagsDataToExport.length > 0) {
        const worksheetBags = XLSX.utils.json_to_sheet(bagsDataToExport);
        XLSX.utils.book_append_sheet(workbook, worksheetBags, "Carteras");
      }

      XLSX.writeFile(workbook, `Reporte_Vintage_LVSM_${new Date().toISOString().split('T')[0]}.xlsx`);
      logActivity('Exportación Excel Completa', { count: clients.length });
    } catch (error) {
      console.error("Error exporting to excel", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && !validateEmail(formData.email)) return;
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        balance: Number(formData.balance)
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), dataToSave);
        await logActivity('Actualización de Cliente', { name: dataToSave.name, id: editingClient.id });
      } else {
        const docRef = await addDoc(collection(db, 'clients'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        await logActivity('Nuevo Cliente', { name: dataToSave.name, id: docRef.id });
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingClient ? OperationType.UPDATE : OperationType.CREATE, 'clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!editingClient) return;
    
    const confirmDelete = window.confirm(`¿Estás seguro que deseas eliminar al cliente "${editingClient.name}"? Esta acción no se puede deshacer y los registros asociados podrían quedar huérfanos.`);
    
    if (confirmDelete) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'clients', editingClient.id));
        await logActivity('Eliminación de Cliente', { name: editingClient.name, id: editingClient.id });
        setIsModalOpen(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'clients');
      } finally {
        setLoading(false);
      }
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
          <h1 className="text-4xl font-display font-black text-brand-950 tracking-tight">Clientes</h1>
          <p className="text-brand-500 font-medium">Gestiona tu cartera de clientes con elegancia</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={exportToExcel}
            className="btn-secondary"
          >
            <Download className="-ml-1 mr-2 h-5 w-5" />
            Exportar Excel
          </button>
          <button 
            onClick={() => openModal()}
            className="btn-primary"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="flex items-center px-6 py-4 glass-card">
        <Search className="h-5 w-5 text-brand-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar clientes por nombre o email..."
          className="flex-1 border-none focus:ring-0 text-sm min-w-0 bg-transparent placeholder-brand-300 text-brand-900 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden border-none shadow-xl shadow-brand-100/20">
        <ul className="divide-y divide-brand-50">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, idx) => (
              <motion.li 
                key={client.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 hover:bg-brand-50/50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex items-center space-x-5 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {client.photoUrl ? (
                        <img className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md" src={client.photoUrl} alt="" />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-600 font-black text-xl shadow-inner">
                          {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-brand-950 truncate">{client.name || 'Sin nombre'}</p>
                      <p className="text-sm text-brand-500 font-medium truncate">{client.email || 'Sin email'}</p>
                      <p className="text-sm text-brand-400 font-medium truncate">{client.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-4 sm:space-x-0 sm:space-y-3 pl-20 sm:pl-0">
                    <div className="text-right">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        Number(client.balance || 0) > 0 ? 'bg-rose-100 text-rose-700' : 
                        Number(client.balance || 0) < 0 ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-brand-50 text-brand-400'
                      }`}>
                        Balance: {Number(client.balance || 0) > 0 ? '+' : ''}{Number(client.balance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      {client.address && (
                        <a 
                          href={`https://waze.com/ul?q=${encodeURIComponent(client.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-full transition-all"
                          title="Ir con Waze"
                        >
                          <MapPin className="h-5 w-5" />
                        </a>
                      )}
                      <button 
                        onClick={() => openTransactionModal(client)}
                        className="p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-100 rounded-full transition-all"
                        title="Administrar Saldo"
                      >
                        <DollarSign className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => openModal(client)}
                        className="p-2 text-brand-400 hover:text-brand-600 hover:bg-brand-100 rounded-full transition-all"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {filteredClients.length === 0 && (
            <li className="p-20 text-center">
              <div className="inline-flex p-6 rounded-full bg-brand-50 mb-4">
                <Users className="h-12 w-12 text-brand-200" />
              </div>
              <p className="text-brand-400 font-bold">No se encontraron clientes.</p>
            </li>
          )}
        </ul>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTransactionModalOpen && selectedClientForTransaction && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm transition-opacity" 
                aria-hidden="true" 
                onClick={() => setIsTransactionModalOpen(false)}
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
                    <div>
                      <h3 className="text-2xl font-display font-bold text-brand-950">
                        Administrar Saldo
                      </h3>
                      <p className="text-brand-500 font-medium text-sm">{selectedClientForTransaction.name}</p>
                    </div>
                    <button onClick={() => setIsTransactionModalOpen(false)} className="text-brand-300 hover:text-brand-500 p-2 rounded-full hover:bg-brand-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                    <div className="mb-8 p-6 bg-brand-50 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-black text-brand-500 uppercase tracking-widest">Balance Actual</span>
                      <span className={`text-2xl font-display font-black ${
                        Number(selectedClientForTransaction.balance || 0) > 0 ? 'text-rose-600' : 
                        Number(selectedClientForTransaction.balance || 0) < 0 ? 'text-emerald-600' : 
                        'text-brand-400'
                      }`}>
                        {Number(selectedClientForTransaction.balance || 0) > 0 ? '+' : ''}{Number(selectedClientForTransaction.balance || 0).toFixed(2)}
                        <span className="text-[10px] ml-2 font-black uppercase tracking-widest opacity-70">
                          {Number(selectedClientForTransaction.balance || 0) > 0 ? 'Deuda' : Number(selectedClientForTransaction.balance || 0) < 0 ? 'Crédito' : 'SIN SALDO'}
                        </span>
                      </span>
                    </div>

                  <form onSubmit={handleSubmitTransaction} className="space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setTransactionFormData({...transactionFormData, type: 'sold'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          transactionFormData.type === 'sold' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <ShoppingBag className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Vendido por</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFormData({...transactionFormData, type: 'paid'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          transactionFormData.type === 'paid' 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <DollarSign className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pagado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFormData({...transactionFormData, type: 'debt'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          transactionFormData.type === 'debt' 
                            ? 'border-rose-500 bg-rose-100 text-rose-700' 
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <DollarSign className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Adeudado</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Monto ($) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        value={transactionFormData.amount} 
                        onChange={e => setTransactionFormData({...transactionFormData, amount: parseFloat(e.target.value) || 0})} 
                        className="input-field text-2xl font-display font-bold" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas</label>
                      <textarea 
                        value={transactionFormData.notes} 
                        onChange={e => setTransactionFormData({...transactionFormData, notes: e.target.value})} 
                        rows={2} 
                        className="input-field" 
                        placeholder="Ej. Pago en efectivo, transferencia..." 
                      />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full py-4">
                      {loading ? 'Procesando...' : editingTransaction ? 'Actualizar Movimiento' : 'Registrar Movimiento'}
                    </button>
                    {editingTransaction && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingTransaction(null);
                          setTransactionFormData({ type: 'sold', amount: 0, notes: '' });
                        }}
                        className="w-full text-xs font-black text-brand-400 uppercase tracking-widest hover:text-brand-600 transition-all border-none bg-transparent"
                      >
                        Cancelar Edición
                      </button>
                    )}
                  </form>

                  <div className="mt-10">
                    <h4 className="text-xs font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <HistoryIcon className="h-4 w-4" /> Últimos Movimientos
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {transactions.map((t) => (
                        <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          editingTransaction?.id === t.id ? 'bg-brand-100 border-brand-200' : 'bg-brand-50/50 border-brand-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => handleEditTransaction(t)}
                                className="p-1.5 text-brand-400 hover:text-brand-600 hover:bg-white rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteTransaction(t)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-brand-900">
                                {t.type === 'sold' ? 'Venta' : t.type === 'paid' ? 'Cobro' : 'Adeudo'}
                              </p>
                              <p className="text-[10px] text-brand-400 font-medium">
                                {t.date?.toDate ? t.date.toDate().toLocaleDateString() : 'Reciente'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-black ${
                            t.type === 'sold' ? 'text-blue-600' : t.type === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {t.type === 'paid' ? '-' : '+'}${t.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {transactions.length === 0 && (
                        <p className="text-center py-4 text-xs text-brand-300 font-bold uppercase tracking-widest">Sin movimientos</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

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
                        {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {editingClient && (
                          <button 
                            type="button"
                            onClick={handleDeleteClient}
                            disabled={loading}
                            className="text-rose-400 hover:text-rose-600 p-2 rounded-full hover:bg-rose-50 transition-all"
                            title="Eliminar Cliente"
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
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Nombre Completo *</label>
                      <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Ej. Maria Garcia" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Email</label>
                        <input 
                          type="email" 
                          value={formData.email} 
                          onChange={e => {
                            setFormData({...formData, email: e.target.value});
                            validateEmail(e.target.value);
                          }} 
                          className={`input-field ${emailError ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : ''}`} 
                          placeholder="maria@ejemplo.com" 
                        />
                        {emailError && <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest">{emailError}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Teléfono</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="+54 9..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Dirección</label>
                      <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="input-field" placeholder="Calle, Número, Ciudad..." />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Balance Inicial ($)</label>
                      <input type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="input-field" />
                    </div>

                    <div className="pt-6 border-t border-brand-50">
                      <h4 className="text-xs font-black text-brand-400 uppercase tracking-widest mb-6">Perfil de Preferencias</h4>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-3">Categorías de Interés</label>
                          <div className="flex flex-wrap gap-2">
                            {categoryOptions.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => toggleListItem(formData.categories, cat, 'categories')}
                                className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border transition-all ${
                                  formData.categories.includes(cat) 
                                    ? 'bg-brand-950 text-brand-200 border-brand-950' 
                                    : 'bg-white text-brand-400 border-brand-100'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-3">Marcas</label>
                          <div className="flex flex-wrap gap-2">
                            {brandOptions.map(brand => (
                              <button
                                key={brand}
                                type="button"
                                onClick={() => toggleListItem(formData.brands, brand, 'brands')}
                                className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest border transition-all ${
                                  formData.brands.includes(brand) 
                                    ? 'bg-brand-950 text-brand-200 border-brand-950' 
                                    : 'bg-white text-brand-400 border-brand-100'
                                }`}
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Cumpleaños</label>
                            <input type="text" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} className="input-field py-2" placeholder="DD/MM" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Canal VIP</label>
                            <select value={formData.contactPreference} onChange={e => setFormData({...formData, contactPreference: e.target.value})} className="input-field py-2">
                              <option value="whatsapp">WhatsApp</option>
                              <option value="email">Email</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Wishlist / Holy Grail</label>
                          <textarea value={formData.wishlist} onChange={e => setFormData({...formData, wishlist: e.target.value})} rows={2} className="input-field" placeholder="Artículos soñados..." />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas Privadas</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="input-field" placeholder="Detalles de interés, talles, etc..." />
                    </div>
                    <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
                      <button type="submit" disabled={loading} className="btn-primary flex-1">
                        {loading ? 'Guardando...' : 'Guardar Cliente'}
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
