import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp, where, limit, increment, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logActivity } from '../firebase';
import { Plus, Search, MapPin, Edit2, X, Users, DollarSign, History as HistoryIcon, Download } from 'lucide-react';
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
  const [transactionFormData, setTransactionFormData] = useState({
    type: 'payment_received',
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
    notes: ''
  });
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
        notes: client.notes || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '', balance: 0, notes: '' });
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
      
      // Calculate balance change
      // payment_received (cobranza): reduces debt (if balance is positive debt) or increases credit
      // payment_made (pago a cliente): increases debt or reduces credit
      // For this boutique, let's assume balance > 0 means client owes money (debt)
      // and balance < 0 means client has credit.
      // So payment_received reduces balance.
      const balanceChange = type === 'payment_received' ? -amount : amount;

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
        type, 
        amount 
      });

      setTransactionFormData({ type: 'payment_received', amount: 0, notes: '' });
      setIsTransactionModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    } finally {
      setLoading(false);
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
          'Nombres de Carteras': clientBags.map((b: any) => `${b.brand} ${b.model}`).join(', ')
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
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest ${
                      Number(client.balance || 0) > 0 ? 'bg-rose-100 text-rose-700' : 
                      Number(client.balance || 0) < 0 ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-brand-50 text-brand-400'
                    }`}>
                      Balance: ${Number(client.balance || 0).toFixed(2)}
                    </span>
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
                      ${Math.abs(Number(selectedClientForTransaction.balance || 0)).toFixed(2)}
                      <span className="text-xs ml-1 font-bold uppercase tracking-tighter">
                        {Number(selectedClientForTransaction.balance || 0) > 0 ? 'Deuda' : 'Crédito'}
                      </span>
                    </span>
                  </div>

                  <form onSubmit={handleSubmitTransaction} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setTransactionFormData({...transactionFormData, type: 'payment_received'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          transactionFormData.type === 'payment_received' 
                            ? 'border-rose-500 bg-rose-50 text-rose-700' 
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <DollarSign className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cobranza</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionFormData({...transactionFormData, type: 'payment_made'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          transactionFormData.type === 'payment_made' 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <DollarSign className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pago</span>
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
                      {loading ? 'Procesando...' : 'Registrar Movimiento'}
                    </button>
                  </form>

                  <div className="mt-10">
                    <h4 className="text-xs font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <HistoryIcon className="h-4 w-4" /> Últimos Movimientos
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-brand-50/50 rounded-xl border border-brand-50">
                          <div>
                            <p className="text-xs font-bold text-brand-900">
                              {t.type === 'payment_received' ? 'Cobranza' : 'Pago'}
                            </p>
                            <p className="text-[10px] text-brand-400 font-medium">
                              {t.date?.toDate ? t.date.toDate().toLocaleDateString() : 'Reciente'}
                            </p>
                          </div>
                          <span className={`text-sm font-black ${
                            t.type === 'payment_received' ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {t.type === 'payment_received' ? '-' : '+'}${t.amount.toFixed(2)}
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
                    <button onClick={() => setIsModalOpen(false)} className="text-brand-300 hover:text-brand-500 p-2 rounded-full hover:bg-brand-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
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
                    <div>
                      <label className="block text-xs font-black text-brand-500 uppercase tracking-widest mb-2">Notas Privadas</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="input-field" placeholder="Preferencias, talles, etc..." />
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
