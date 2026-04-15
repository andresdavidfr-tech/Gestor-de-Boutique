import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, ShoppingBag, LayoutDashboard, LogOut, Calendar, Menu, X, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Layout: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clientes', path: '/clients', icon: Users },
    { name: 'Carteras', path: '/bags', icon: ShoppingBag },
    { name: 'Visitas', path: '/visits', icon: Calendar },
    { name: 'Historial', path: '/history', icon: History },
  ];

  useEffect(() => {
    if (user && user.uid) {
      const updateActivity = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            lastActive: serverTimestamp(),
            lastPath: location.pathname
          }, { merge: true });
        } catch (e) {
          // Silent fail for activity tracking
        }
      };
      updateActivity();
    }
  }, [location.pathname, user]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-white/90 backdrop-blur-md border-b border-brand-100 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-display font-bold text-brand-950 tracking-tighter">LVSM</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="text-brand-400 hover:text-brand-600 p-2" title="Cerrar Sesión">
            <LogOut className="h-5 w-5" />
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-brand-600 hover:text-brand-800 focus:outline-none p-2 rounded-full hover:bg-brand-50 transition-colors">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-brand-950/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-brand-100 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-24 flex items-center justify-between px-6 border-b border-brand-50 bg-brand-950">
          <h1 className="text-2xl font-display font-black text-brand-200 tracking-tighter">LVSM</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-brand-200 hover:text-white focus:outline-none">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200",
                  isActive 
                    ? "bg-brand-50 text-brand-950 border-l-4 border-brand-500" 
                    : "text-brand-400 hover:bg-brand-50 hover:text-brand-900"
                )}
              >
                <Icon className={cn("mr-3 h-4 w-4", isActive ? "text-brand-500" : "text-brand-300")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="p-6 border-t border-brand-50 bg-brand-50/30">
            <div className="flex items-center mb-6 px-2">
              <div className="relative">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=Florencia&background=b08d57&color=fff`} 
                  alt="User" 
                  className="h-10 w-10 rounded-none border border-brand-200 shadow-sm" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-brand-500 border border-white rounded-full"></div>
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-black text-brand-950 uppercase tracking-widest truncate">Florencia</p>
                <p className="text-xs text-brand-400 font-bold uppercase tracking-[0.2em]">Administradora</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-brand-600 hover:bg-white hover:shadow-sm transition-all active:scale-95"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-10">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
