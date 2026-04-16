import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Clock, Flame, Target, BarChart3 } from 'lucide-react';

export default function Actividad() {
  const { user } = useAuth();
  const { currentMonth } = useMonth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const { myActivities, loading, createActivity, deleteActivity } = useActivities(currentMonth);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Stats
  const totalMinutes = useMemo(() => myActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myActivities]);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const sessionCount = myActivities.length;

  // Weekly hours for bar chart (last 4 weeks relative to current month)
  const weeklyData = useMemo(() => {
    const weeks = [];
    const monthEnd = new Date(year, month + 1, 0);
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(monthEnd);
      weekEnd.setDate(monthEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const weekMins = myActivities
        .filter(a => {
          const d = new Date(a.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((s, a) => s + (a.duration_minutes || 0), 0);

      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        hours: +(weekMins / 60).toFixed(1),
        minutes: weekMins,
      });
    }
    return weeks;
  }, [myActivities, year, month]);

  const maxWeekHours = Math.max(...weeklyData.map(w => w.hours), 1);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const map = {};
    myActivities.forEach(a => {
      const day = new Date(a.date).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(a);
    });
    return map;
  }, [myActivities]);

  const handleDayClick = (day) => {
    const date = new Date(year, month, day);
    if (activitiesByDate[day]) {
      setExpandedDay(expandedDay === day ? null : day);
    } else {
      setSelectedDate(date);
      setShowLogDialog(true);
    }
  };

  const handleLogForDay = (day) => {
    setSelectedDate(new Date(year, month, day));
    setShowLogDialog(true);
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Profile + calendar card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4"
      >
        {/* Profile row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-brand-400">
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-zinc-100">{userName}</p>
            <p className="text-[12px] text-zinc-500">{totalHours}h entrenadas este mes</p>
          </div>
        </div>

        {/* Calendar */}
        <CalendarGrid
          year={year}
          month={month}
          activitiesByDate={activitiesByDate}
          onDayClick={handleDayClick}
          expandedDay={expandedDay}
        />

        {/* Expanded day */}
        <AnimatePresence>
          {expandedDay && activitiesByDate[expandedDay] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-1.5 overflow-hidden"
            >
              {activitiesByDate[expandedDay].map((activity) => (
                <div
                  key={activity.id}
                  className="bg-surface-2 rounded-xl px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{ACTIVITY_TYPES[activity.type]?.emoji || '🏅'}</span>
                    <div>
                      <p className="text-[13px] font-medium text-zinc-200">
                        {ACTIVITY_TYPES[activity.type]?.label || activity.type}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        {activity.duration_minutes} min{activity.description ? ` · ${activity.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteActivity(activity.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-700 hover:text-red-400" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleLogForDay(expandedDay)}
                className="w-full bg-surface-2 border border-dashed border-white/[0.06] rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] text-zinc-600 hover:text-brand-400 hover:border-brand-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir actividad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Weekly hours bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Carga semanal</h3>
        </div>
        <div className="flex items-end gap-3 h-28">
          {weeklyData.map((week, idx) => {
            const pct = Math.max((week.hours / maxWeekHours) * 100, 4);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 font-mono">{week.hours}h</span>
                <div className="w-full bg-surface-3 rounded-md overflow-hidden" style={{ height: '80px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ delay: 0.2 + idx * 0.08, duration: 0.4 }}
                    className="w-full bg-brand-500/70 rounded-md mt-auto"
                    style={{ marginTop: 'auto' }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600">{week.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4 flex flex-col items-center">
          <Clock className="w-4 h-4 text-blue-400 mb-1.5" />
          <span className="text-xl font-bold text-zinc-100 font-mono">{totalHours}</span>
          <span className="text-[10px] text-zinc-600 mt-0.5">horas</span>
        </div>
        <div className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4 flex flex-col items-center">
          <Flame className="w-4 h-4 text-orange-400 mb-1.5" />
          <span className="text-xl font-bold text-zinc-100 font-mono">{sessionCount}</span>
          <span className="text-[10px] text-zinc-600 mt-0.5">sesiones</span>
        </div>
        <div className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4 flex flex-col items-center">
          <Target className="w-4 h-4 text-brand-400 mb-1.5" />
          <span className="text-xl font-bold text-zinc-100 font-mono">
            {sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0}
          </span>
          <span className="text-[10px] text-zinc-600 mt-0.5">min/sesión</span>
        </div>
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
        className="fixed bottom-24 right-5 w-13 h-13 bg-brand-500 hover:bg-brand-400 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/20 transition-colors z-40"
        style={{ width: 52, height: 52 }}
      >
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      <LogActivityDialog
        isOpen={showLogDialog}
        onClose={() => setShowLogDialog(false)}
        onSubmit={createActivity}
        selectedDate={selectedDate}
      />
    </div>
  );
}

function CalendarGrid({ year, month, activitiesByDate, onDayClick, expandedDay }) {
  const now = new Date();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const prevLast = new Date(year, month, 0).getDate();
  const trailing = [];
  for (let i = startDow - 1; i >= 0; i--) trailing.push(prevLast - i);

  return (
    <div className="grid grid-cols-7 gap-[5px]">
      {trailing.map(d => (
        <div key={`p-${d}`} className="aspect-square rounded-lg flex items-center justify-center">
          <span className="text-[10px] text-zinc-800">{d}</span>
        </div>
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        const acts = activitiesByDate[day] || [];
        const has = acts.length > 0;
        const isExp = expandedDay === day;
        const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;

        return (
          <button
            key={day}
            onClick={() => onDayClick(day)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${
              has
                ? isExp
                  ? 'bg-brand-400/90 ring-1 ring-brand-300/50'
                  : 'bg-brand-500/60'
                : isToday
                  ? 'bg-surface-2 ring-1 ring-brand-500/30'
                  : 'bg-surface-2/60'
            }`}
          >
            <span className={`text-[10px] font-medium leading-none ${
              has ? 'text-white' : isToday ? 'text-brand-400' : 'text-zinc-500'
            }`}>{day}</span>
            {emoji && <span className="text-[10px] leading-none mt-0.5">{emoji}</span>}
            {acts.length > 1 && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                <span className="text-[7px] font-bold text-surface-0">{acts.length}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
