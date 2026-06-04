import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { X, ShoppingBag } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

// Lazy-load route pages so the initial bundle stays small (code-splitting).
const PublicClientForm = lazy(() => import('./pages/PublicClientForm').then((m) => ({ default: m.PublicClientForm })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })));
const Bags = lazy(() => import('./pages/Bags').then((m) => ({ default: m.Bags })));
const Visits = lazy(() => import('./pages/Visits').then((m) => ({ default: m.Visits })));
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <ShoppingBag className="h-10 w-10 text-brand-300 animate-pulse" />
  </div>
);

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = (this as any).props;
    
    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
          <div className="glass-card p-10 max-w-lg w-full shadow-2xl shadow-brand-900/10 text-center">
            <div className="mx-auto h-20 w-20 bg-brand-950 rounded-none flex items-center justify-center mb-6 shadow-inner border border-brand-800">
              <X className="h-10 w-10 text-brand-200" />
            </div>
            <h2 className="text-3xl font-display font-black text-brand-950 mb-4 tracking-tighter">Algo salió mal</h2>
            <p className="text-brand-600 font-medium mb-6 leading-relaxed text-sm">Ha ocurrido un error inesperado. Estamos trabajando para solucionarlo.</p>
            <div className="bg-brand-50 p-4 rounded-none text-left mb-8 overflow-auto max-h-40 border border-brand-100">
              <code className="text-xs font-mono text-brand-800 break-words">
                {error?.message || "Error desconocido"}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6]">
        <div className="relative">
          <div className="h-24 w-24 bg-brand-950 animate-pulse flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-brand-200 animate-bounce" />
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 text-center">
            <p className="text-brand-400 font-display font-bold text-[10px] tracking-[0.3em] uppercase animate-pulse">
              LVSM...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/public/client-form" element={<PublicClientForm />} />

                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="clients/*" element={<Clients />} />
                    <Route path="bags/*" element={<Bags />} />
                    <Route path="visits/*" element={<Visits />} />
                    <Route path="history" element={<History />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
