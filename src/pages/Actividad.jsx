import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import LogActivityDialog from '@/components/LogActivityDialog';
import { ChevronRight, Settings, Sparkles, Plus, Trash2 } from 'lucide-react';

export default function Actividad() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { myActivities, loading, createActivity, deleteActivity } = useActivities(currentMonth);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState(null);

  // Calculate stats
  const totalMinutesThisMonth = useMemo(() => {
    return myActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
  }, [myActivities]);

  const totalHoursThisMonth = (totalMinutesThisMonth / 60).toFixed(1);

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
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (activitiesByDate[day]) {
      setExpandedDay(expandedDay === day ? null : day);
    } else {
      setSelectedDate(date);
      setShowLogDialog(true);
    }
  };

  const handleLogForDay = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    setShowLogDialog(true);
  };

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
              <p className="text-sm text-zinc-500">{totalHoursThisMonth}h este mes</p>
            </div>
          </div>
          <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            🏆 Performer
          </span>
        </div>

        {/* Calendar */}
        <CalendarGrid
          currentMonth={currentMonth}
          activitiesByDate={activitiesByDate}
          onDayClick={handleDayClick}
          expandedDay={expandedDay}
        />

        {/* Expanded day activities */}
        {expandedDay && activitiesByDate[expandedDay] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2"
          >
            {activitiesByDate[expandedDay].map((activity) => (
              <div
                key={activity.id}
                className="bg-surface-3 rounded-xl px-3 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {ACTIVITY_TYPES[activity.type]?.emoji || '🏅'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {ACTIVITY_TYPES[activity.type]?.label || activity.type}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {activity.duration_minutes} min
                      {activity.description ? ` · ${activity.description}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteActivity(activity.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                </button>
              </div>
            ))}
            <button
              onClick={() => handleLogForDay(expandedDay)}
              className="w-full bg-surface-3 border border-dashed border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-brand-400 hover:border-brand-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Añadir otra actividad
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Horas este mes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-zinc-200">
            <span className="font-semibold">{Math.floor(totalMinutesThisMonth / 60)}h {totalMinutesThisMonth % 60}min</span> de entrenamiento este mes
          </span>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatBox
          icon={<span className="text-blue-400 text-lg">◎</span>}
          value="—"
          label="Total"
        />
        <StatBox
          icon={<Sparkles className="w-5 h-5 text-brand-400" />}
          value={`${totalHoursThisMonth}h`}
          label="Este mes"
        />
        <StatBox
          icon={<span className="text-lg">🏅</span>}
          value={`${myActivities.length}`}
          label="Sesiones"
        />
      </motion.div>

      {/* Floating action button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        onClick={() => {
          setSelectedDate(new Date());
          setShowLogDialog(true);
        }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand-500 hover:bg-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/25 transition-colors z-40"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Log activity dialog */}
      <LogActivityDialog
        isOpen={showLogDialog}
        onClose={() => setShowLogDialog(false)}
        onSubmit={createActivity}
        selectedDate={selectedDate}
      />
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

function CalendarGrid({ currentMonth, activitiesByDate, onDayClick, expandedDay }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const now = new Date();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const trailingDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    trailingDays.push(prevMonthLastDay - i);
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {trailingDays.map((day) => (
        <div
          key={`prev-${day}`}
          className="aspect-square rounded-lg bg-surface-3/30 flex flex-col items-center justify-center"
        >
          <span className="text-xs text-zinc-700">{day}</span>
        </div>
      ))}

      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        const dayActivities = activitiesByDate[day] || [];
        const hasActivity = dayActivities.length > 0;
        const isExpanded = expandedDay === day;

        const mainEmoji = hasActivity
          ? ACTIVITY_TYPES[dayActivities[0].type]?.emoji || '🏅'
          : null;

        return (
          <button
            key={day}
            onClick={() => onDayClick(day)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${
              hasActivity
                ? isExpanded
                  ? 'bg-brand-400 scale-95'
                  : 'bg-brand-500/80 hover:bg-brand-500'
                : isToday
                  ? 'bg-surface-3 border border-brand-500/40'
                  : 'bg-surface-3 hover:bg-surface-4'
            }`}
          >
            <span className={`text-xs font-medium ${
              hasActivity ? 'text-white' : isToday ? 'text-brand-400' : 'text-zinc-400'
            }`}>
              {day}
            </span>
            {mainEmoji && (
              <span className="text-[11px] leading-none mt-0.5">{mainEmoji}</span>
            )}
            {dayActivities.length > 1 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-300 rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-surface-0">{dayActivities.length}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
