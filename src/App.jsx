import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { MonthProvider } from '@/lib/MonthContext';
import { DataProvider } from '@/lib/DataContext';
import AppLayout from '@/components/AppLayout';
import LoadingScreen from '@/components/LoadingScreen';

// Lazy-load para code splitting — cada página en su propio chunk
const Login = lazy(() => import('@/pages/Login'));
const Feed = lazy(() => import('@/pages/Feed'));
const Actividad = lazy(() => import('@/pages/Actividad'));
const Grupos = lazy(() => import('@/pages/Grupos'));
const Mas = lazy(() => import('@/pages/Mas'));

const MIN_SPLASH_MS = 2000;

function useMinSplash() {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);
  return elapsed;
}

// Pequeño spinner para Suspense entre páginas (no bloquea toda la pantalla)
function PageFallback() {
  return <div style={{ minHeight: '60vh' }} />;
}

// Layout único: MonthProvider + DataProvider + AppLayout
// Se monta UNA vez. Sólo la <Outlet /> cambia al navegar.
function AuthedLayout() {
  const { user, loading } = useAuth();
  const splashDone = useMinSplash();
  if (loading || !splashDone) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <MonthProvider>
      <DataProvider>
        <AppLayout>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </DataProvider>
    </MonthProvider>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const splashDone = useMinSplash();
  if (loading || !splashDone) return <LoadingScreen />;
  if (user) return <Navigate to="/actividad" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Suspense fallback={<LoadingScreen />}><Login /></Suspense></PublicRoute>} />
      <Route element={<AuthedLayout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/actividad" element={<Actividad />} />
        <Route path="/grupos" element={<Grupos />} />
        <Route path="/mas" element={<Mas />} />
      </Route>
      <Route path="/" element={<Navigate to="/actividad" replace />} />
      <Route path="*" element={<Navigate to="/actividad" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
