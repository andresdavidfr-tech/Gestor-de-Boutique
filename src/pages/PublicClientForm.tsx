import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType, logActivity } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Check, Loader2, Star, AlertCircle } from 'lucide-react';

export const PublicClientForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    categories: [] as string[],
    brands: [] as string[],
    personalStyle: '',
    wishlist: '',
    birthday: '',
    contactPreference: 'whatsapp'
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['Carteras y Bolsos', 'Billeteras y Marroquinería', 'Accesorios', 'Calzado'];
  const brands = ['Louis Vuitton', 'Chanel', 'Gucci', 'Prada', 'Yves Saint Laurent', 'Hermès', 'Dior', 'Fendi'];
  const styles = ['Clásico / Atemporal', 'Tendencias / Moderno', 'Vintage / Ediciones Limitadas'];

  const toggleItem = (list: string[], item: string, field: string) => {
    const newList = list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item];
    setFormData({ ...formData, [field]: newList });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'clients'), {
        ...formData,
        balance: 0,
        notes: `Registrado vía formulario público. Wishlist: ${formData.wishlist}`,
        createdAt: serverTimestamp()
      });
      
      await logActivity('Nuevo Cliente (Público)', { 
        name: formData.name,
        email: formData.email 
      });

      setSubmitted(true);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'clients');
      } catch (handledErr) {
        setError("Hubo un error al enviar tus datos. Por favor intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-none shadow-2xl border border-brand-100 text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.2 }}
            className="w-20 h-20 bg-brand-950 rounded-none flex items-center justify-center mx-auto mb-8 shadow-inner border border-brand-800"
          >
            <Check className="h-10 w-10 text-brand-200" />
          </motion.div>
          <h2 className="text-4xl font-display font-black text-brand-950 mb-4 tracking-tighter">¡Todo Listo!</h2>
          <p className="text-brand-600 font-medium leading-relaxed text-sm">
            Tus datos han sido registrados con éxito en LVSM. Nos pondremos en contacto contigo pronto.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex bg-brand-950 p-4 rounded-none shadow-xl border border-brand-800 mb-6">
            <ShoppingBag className="h-10 w-10 text-brand-200" strokeWidth={1} />
          </div>
          <h2 className="text-4xl font-display font-black text-brand-950 tracking-tighter">LVSM</h2>
          <p className="text-xs text-brand-500 font-bold uppercase tracking-[0.3em] mt-3">Registro de Cliente</p>
        </div>

        <div className="bg-white p-8 sm:p-12 shadow-2xl border border-brand-100 relative">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 rounded-none bg-red-50 border border-red-200 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800 leading-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Datos Obligatorios */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] flex-1 bg-brand-100" />
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest whitespace-nowrap">Datos de Contacto *</span>
                <div className="h-[1px] flex-1 bg-brand-100" />
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Nombre Completo *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Ej. Florencia L." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Email *</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">WhatsApp *</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="+54..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Perfil de Preferencias (Opcional) */}
            <div className="space-y-8 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] flex-1 bg-brand-100" />
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest whitespace-nowrap">Perfil de Preferencias</span>
                <div className="h-[1px] flex-1 bg-brand-100" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-4">¿Qué artículos buscás principalmente?</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleItem(formData.categories, cat, 'categories')}
                      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        formData.categories.includes(cat) 
                          ? 'bg-brand-950 text-brand-200 border-brand-950' 
                          : 'bg-white text-brand-400 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-4">Marcas de Interés</label>
                <div className="flex flex-wrap gap-2">
                  {brands.map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleItem(formData.brands, brand, 'brands')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        formData.brands.includes(brand) 
                          ? 'bg-brand-950 text-brand-200 border-brand-950' 
                          : 'bg-white text-brand-400 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-4">Estilo Personal</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {styles.map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData({ ...formData, personalStyle: style })}
                      className={`px-3 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all text-center ${
                        formData.personalStyle === style 
                          ? 'bg-brand-950 text-brand-200 border-brand-950 shadow-lg' 
                          : 'bg-white text-brand-400 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Star className="h-3 w-3 text-brand-400" /> Tu "Wishlist" o Artículo Soñado
                </label>
                <textarea 
                  value={formData.wishlist} 
                  onChange={e => setFormData({...formData, wishlist: e.target.value})} 
                  rows={3} 
                  className="input-field" 
                  placeholder="Contanos qué pieza estás buscando específicamente y te avisamos si ingresa..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Fecha de Cumpleaños (Mes y Día)</label>
                  <input 
                    type="text" 
                    value={formData.birthday} 
                    onChange={e => setFormData({...formData, birthday: e.target.value})} 
                    placeholder="Ej. 15 de Octubre"
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Canal de Contacto VIP</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, contactPreference: 'whatsapp' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 border transition-all ${
                        formData.contactPreference === 'whatsapp' 
                          ? 'bg-brand-50 text-brand-950 border-brand-300 shadow-sm' 
                          : 'bg-white text-brand-400 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, contactPreference: 'email' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 border transition-all ${
                        formData.contactPreference === 'email' 
                          ? 'bg-brand-50 text-brand-950 border-brand-300 shadow-sm' 
                          : 'bg-white text-brand-400 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-sm active:scale-95 transition-all">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Finalizar Registro'}
            </button>
          </form>
        </div>
        
        <p className="mt-10 text-center text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em]">
          LVSM &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
};
