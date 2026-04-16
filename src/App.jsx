import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { MonthProvider } from '@/lib/MonthContext';
import Login from '@/pages/Login';
import Feed from '@/pages/Feed';
import Actividad from '@/pages/Actividad';
import Grupos from '@/pages/Grupos';
import Mas from '@/pages/Mas';
import AppLayout from '@/components/AppLayout';
import LoadingScreen from '@/components/LoadingScreen';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/feed" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/feed" element={<ProtectedRoute><MonthProvider><AppLayout><Feed /></AppLayout></MonthProvider></ProtectedRoute>} />
      <Route path="/actividad" element={<ProtectedRoute><MonthProvider><AppLayout><Actividad /></AppLayout></MonthProvider></ProtectedRoute>} />
      <Route path="/grupos" element={<ProtectedRoute><MonthProvider><AppLayout><Grupos /></AppLayout></MonthProvider></ProtectedRoute>} />
      <Route path="/mas" element={<ProtectedRoute><MonthProvider><AppLayout><Mas /></AppLayout></MonthProvider></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
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
