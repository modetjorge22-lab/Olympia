import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { ChevronRight, Settings, Sparkles, Pill, Target } from 'lucide-react';

export default function Actividad() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Profile card with calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl p-4"
      >
        {/* Profile header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-4 flex items-center justify-center">
              <span className="text-base font-semibold text-zinc-400">
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-zinc-100">{userName}</p>
              <p className="text-sm text-zinc-500">—h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              🏆 Performer
            </span>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </div>

        {/* Calendar placeholder */}
        <CalendarGrid />
      </motion.div>

      {/* Plan Semanal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100">Plan Semanal</span>
            <Settings className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-zinc-400 font-semibold">0/0</span>
        </div>
        <div className="w-full h-1.5 bg-surface-4 rounded-full mt-3">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: '0%' }} />
        </div>
        <p className="text-sm text-zinc-600 mt-2">Clic para configurar tu plan</p>
      </motion.div>

      {/* Horas este mes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-zinc-200">
            <span className="font-semibold">—h —min</span> de entrenamiento este mes
          </span>
        </div>
      </motion.div>

      {/* Suplementos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💊</span>
            <span className="text-zinc-200 font-semibold">Suplementos</span>
            <span className="text-zinc-400 font-semibold">0/0</span>
          </div>
          <Settings className="w-4 h-4 text-zinc-500" />
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatBox icon={<Target className="w-5 h-5 text-blue-400" />} value="—h" label="Total" />
        <StatBox icon={<Sparkles className="w-5 h-5 text-brand-400" />} value="—h" label="Este mes" />
        <StatBox icon={<span className="text-lg">🏅</span>} value="—%" label="Ritmo" />
      </motion.div>
    </div>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1">
      {icon}
      <span className="text-2xl font-bold text-zinc-100">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function CalendarGrid() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Adjust so Monday = 0
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;
  
  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const trailingDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    trailingDays.push(prevMonthLastDay - i);
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {/* Trailing days from previous month */}
      {trailingDays.map((day) => (
        <div
          key={`prev-${day}`}
          className="aspect-square rounded-lg bg-surface-3/50 flex flex-col items-center justify-center"
        >
          <span className="text-xs text-zinc-700">{day}</span>
        </div>
      ))}
      
      {/* Current month days */}
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
        const isToday = day === now.getDate();
        
        return (
          <div
            key={day}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${
              isToday
                ? 'bg-brand-500/20 border border-brand-500/40'
                : 'bg-surface-3'
            }`}
          >
            <span className={`text-xs ${isToday ? 'text-brand-400 font-semibold' : 'text-zinc-400'}`}>
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}
