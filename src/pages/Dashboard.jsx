import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Activity,
  Users,
  TrendingUp,
  LogOut,
  Calendar,
  Flame,
  Trophy,
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-surface-2 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
    <p className="text-2xl font-bold text-zinc-100 font-display">{value}</p>
  </motion.div>
);

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-1/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <span className="text-lg font-bold text-zinc-100 font-display">GoHub's Gym</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-display">
            Hola, {userName} 👋
          </h1>
          <p className="text-zinc-500 mt-1">Aquí tienes tu resumen de actividad</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Flame}
            label="Entrenamientos"
            value="—"
            color="bg-orange-500/10 text-orange-400"
            delay={0.1}
          />
          <StatCard
            icon={Calendar}
            label="Esta semana"
            value="—"
            color="bg-blue-500/10 text-blue-400"
            delay={0.15}
          />
          <StatCard
            icon={Trophy}
            label="Racha"
            value="—"
            color="bg-amber-500/10 text-amber-400"
            delay={0.2}
          />
          <StatCard
            icon={Users}
            label="Equipo"
            value="—"
            color="bg-brand-500/10 text-brand-400"
            delay={0.25}
          />
        </div>

        {/* Placeholder sections */}
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="lg:col-span-2 bg-surface-2 border border-white/5 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Actividad reciente</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <Activity className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">Aún no hay actividades registradas</p>
              <p className="text-xs text-zinc-700 mt-1">Conecta Strava o registra un entrenamiento para empezar</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="bg-surface-2 border border-white/5 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Progreso</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">Las estadísticas aparecerán aquí</p>
              <p className="text-xs text-zinc-700 mt-1">Cuando tengas datos de entrenamiento</p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
