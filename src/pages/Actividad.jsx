import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Clock, Flame, Target, ChevronRight, Sparkles } from 'lucide-react';

export default function Actividad() {
  const { user } = useAuth();
  const { currentMonth } = useMonth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const { myActivities, allActivities, loading, createActivity, deleteActivity } = useActivities(currentMonth);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // My all-time activities for charts
  const myAllActivities = useMemo(() => allActivities.filter(a => a.user_email === user?.email), [allActivities, user]);

  // Stats
  const totalMinutes = useMemo(() => myActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myActivities]);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalAllTimeMinutes = useMemo(() => myAllActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myAllActivities]);
  const totalAllTimeHours = (totalAllTimeMinutes / 60).toFixed(1);

  // Weekly goal ratio
  const weeksInMonth = Math.ceil(new Date(year, month + 1, 0).getDate() / 7);
  const expectedHours = weeksInMonth * 5; // rough 5h/week target
  const ritmo = expectedHours > 0 ? Math.round((totalMinutes / 60) / expectedHours * 100) : 0;

  // Favorite activity this month
  const favoriteType = useMemo(() => {
    const counts = {};
    myActivities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? ACTIVITY_TYPES[top[0]] : null;
  }, [myActivities]);

  // 16-week bar chart data (all training hours)
  const weeklyChartData = useMemo(() => {
    const weeks = [];
    const refDate = new Date(year, month + 1, 0); // end of current month
    for (let w = 15; w >= 0; w--) {
      const weekEnd = new Date(refDate);
      weekEnd.setDate(refDate.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const weekActs = myAllActivities.filter(a => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      });
      const totalMins = weekActs.reduce((s, a) => s + (a.duration_minutes || 0), 0);
      const isCurrentWeek = w === 0;

      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        hours: +(totalMins / 60).toFixed(1),
        current: isCurrentWeek,
      });
    }
    return weeks;
  }, [myAllActivities, year, month]);

  // 16-week strength chart (progress vs consolidation)
  const strengthChartData = useMemo(() => {
    const weeks = [];
    const refDate = new Date(year, month + 1, 0);
    for (let w = 15; w >= 0; w--) {
      const weekEnd = new Date(refDate);
      weekEnd.setDate(refDate.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const weekActs = myAllActivities.filter(a => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd && a.type === 'strength_training';
      });

      const progressMins = weekActs.filter(a => a.training_type === 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0);
      const consolMins = weekActs.filter(a => a.training_type === 'consolidation').reduce((s, a) => s + (a.duration_minutes || 0), 0);
      const otherMins = weekActs.filter(a => !a.training_type || (a.training_type !== 'progress' && a.training_type !== 'consolidation')).reduce((s, a) => s + (a.duration_minutes || 0), 0);

      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        progreso: +((progressMins) / 60).toFixed(1),
        consolidacion: +((consolMins + otherMins) / 60).toFixed(1),
      });
    }
    return weeks;
  }, [myAllActivities, year, month]);

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
    if (activitiesByDate[day]) {
      setExpandedDay(expandedDay === day ? null : day);
    } else {
      setSelectedDate(new Date(year, month, day));
      setShowLogDialog(true);
    }
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Title */}
      <h1 className="text-[17px] font-bold text-zinc-100">Mi actividad</h1>

      {/* Exercise load - 16 week bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🏋️</span>
          <h2 className="text-[15px] font-bold text-zinc-100">Carga de ejercicio</h2>
        </div>
        <div className="h-[160px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData} barCategoryGap="20%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#52525b' }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }}
                formatter={(v) => [`${v}h`, 'Horas']}
              />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]} fill="#3f3f46" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-zinc-600 text-center">Horas entrenadas · últimas 16 semanas</p>
      </motion.div>

      {/* Strength training chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">💪</span>
          <h2 className="text-[15px] font-bold text-zinc-100">Entrenamientos de fuerza</h2>
        </div>
        <div className="h-[160px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strengthChartData} barCategoryGap="20%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#52525b' }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
              <Bar dataKey="progreso" name="Progreso" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="consolidacion" name="Consolidación" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-zinc-600 text-center">Horas de fuerza · últimas 16 semanas</p>
      </motion.div>

      {/* Profile + Calendar card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center">
              <span className="text-[12px] font-bold text-brand-400">
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-zinc-100">{userName}</p>
              <p className="text-[12px] text-zinc-500">{totalHours}h este mes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-brand-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              🏆 Performer
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
          </div>
        </div>

        <CalendarGrid
          year={year} month={month}
          activitiesByDate={activitiesByDate}
          onDayClick={handleDayClick}
          expandedDay={expandedDay}
        />

        <AnimatePresence>
          {expandedDay && activitiesByDate[expandedDay] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-1.5 overflow-hidden"
            >
              {activitiesByDate[expandedDay].map(act => (
                <div key={act.id} className="bg-surface-2 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
                    <div>
                      <p className="text-[13px] font-medium text-zinc-200">{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
                      <p className="text-[11px] text-zinc-600">{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5 text-zinc-700 hover:text-red-400" />
                  </button>
                </div>
              ))}
              <button onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
                className="w-full bg-surface-2 border border-dashed border-white/[0.06] rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] text-zinc-600 hover:text-brand-400 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Añadir actividad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Favorite activity */}
      {favoriteType && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-surface-1 border border-white/[0.04] rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-[13px] text-zinc-300">Favorito: entrenando <span className="font-semibold text-zinc-100">{favoriteType.label.toLowerCase()}</span> {favoriteType.emoji}</span>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3">
        <StatBox icon={<Target className="w-4 h-4 text-blue-400" />} value={`${totalAllTimeHours}h`} label="Total" />
        <StatBox icon={<Sparkles className="w-4 h-4 text-brand-400" />} value={`${totalHours}h`} label="Este mes" />
        <StatBox icon={<span className="text-sm">🏅</span>} value={`${ritmo}%`} label="Ritmo" />
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
        className="fixed bottom-24 right-5 w-[52px] h-[52px] bg-brand-500 hover:bg-brand-400 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/20 z-40"
      >
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      <LogActivityDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} onSubmit={createActivity} selectedDate={selectedDate} />
    </div>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4 flex flex-col items-center">
      {icon}
      <span className="text-[22px] font-bold text-zinc-100 font-mono mt-1">{value}</span>
      <span className="text-[10px] text-zinc-600 mt-0.5">{label}</span>
    </div>
  );
}

function CalendarGrid({ year, month, activitiesByDate, onDayClick, expandedDay }) {
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = new Date(year, month, 1).getDay() - 1;
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
          <button key={day} onClick={() => onDayClick(day)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative ${
              has ? isExp ? 'bg-brand-400/90 ring-1 ring-brand-300/40' : 'bg-brand-500/60'
                : isToday ? 'bg-surface-2 ring-1 ring-brand-500/30' : 'bg-surface-2/60'
            }`}>
            <span className={`text-[10px] font-medium leading-none ${has ? 'text-white' : isToday ? 'text-brand-400' : 'text-zinc-500'}`}>{day}</span>
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
