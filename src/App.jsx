import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/theme';
import { MonthProvider } from '@/lib/MonthContext';
import { DataProvider } from '@/lib/DataContext';
import AppLayout from '@/components/AppLayout';
import LoadingScreen from '@/components/LoadingScreen';

// Landing importada de forma directa (no lazy): debe pintarse al instante,
// sin splash ni espera de chunk.
import Landing from '@/pages/Landing';

// Lazy-load para code splitting — cada página en su propio chunk
const Login = lazy(() => import('@/pages/Login'));
const Feed = lazy(() => import('@/pages/Feed'));
const Actividad = lazy(() => import('@/pages/Actividad'));
const Grupos = lazy(() => import('@/pages/Grupos'));
const Mas = lazy(() => import('@/pages/Mas'));

// Splash mínimo corto — suficiente para que no parpadee, sin hacer esperar
const MIN_SPLASH_MS = 700;

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
// Precarga los chunks de todas las pestañas en cuanto la app está ociosa,
// para que el primer cambio de pestaña no muestre un hueco en blanco.
function usePrefetchPages() {
  useEffect(() => {
    const t = setTimeout(() => {
      import('@/pages/Feed');
      import('@/pages/Actividad');
      import('@/pages/Grupos');
      import('@/pages/Mas');
    }, 900);
    return () => clearTimeout(t);
  }, []);
}

function AuthedLayout() {
  const { user, loading } = useAuth();
  const splashDone = useMinSplash();
  usePrefetchPages();
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

// Para la landing: sin splash ni LoadingScreen. Mientras el auth resuelve
// (lectura casi instantánea de la sesión local) mostramos un lienzo vacío del
// color de la landing — así el usuario logueado nunca ve un frame de la
// landing antes de entrar a la app, y el visitante nuevo no percibe la espera.
function LandingRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100dvh', background: '#f8f3ea' }} />;
  if (user) return <Navigate to="/actividad" replace />;
  return children;
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
      {/* Landing pública en la raíz — los usuarios logueados van directos a la app */}
      <Route path="/" element={<LandingRoute><Landing /></LandingRoute>} />
      <Route path="*" element={<Navigate to="/actividad" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
