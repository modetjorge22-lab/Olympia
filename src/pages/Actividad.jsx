import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Target, Sparkles, TrendingUp } from 'lucide-react';

const glassCard = {
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  background: 'rgba(17, 19, 26, 0.65)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const chartTooltipStyle = {
  backgroundColor: 'rgba(11,11,15,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 11,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

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

  const myAllActivities = useMemo(() => allActivities.filter(a => a.user_email === user?.email), [allActivities, user]);

  const totalMinutes = useMemo(() => myActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myActivities]);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalAllTimeMinutes = useMemo(() => myAllActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myAllActivities]);
  const totalAllTimeHours = (totalAllTimeMinutes / 60).toFixed(1);

  const weeksInMonth = Math.ceil(new Date(year, month + 1, 0).getDate() / 7);
  const expectedHours = weeksInMonth * 5;
  const ritmo = expectedHours > 0 ? Math.round((totalMinutes / 60) / expectedHours * 100) : 0;

  const favoriteType = useMemo(() => {
    const counts = {};
    myActivities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? ACTIVITY_TYPES[top[0]] : null;
  }, [myActivities]);

  const weeklyChartData = useMemo(() => {
    const weeks = [];
    const refDate = new Date(year, month + 1, 0);
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
      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        hours: +(totalMins / 60).toFixed(1),
        current: w === 0,
      });
    }
    return weeks;
  }, [myAllActivities, year, month]);

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
      const consolMins = weekActs.filter(a => a.training_type !== 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0);
      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        progreso: +((progressMins) / 60).toFixed(1),
        consolidacion: +((consolMins) / 60).toFixed(1),
      });
    }
    return weeks;
  }, [myAllActivities, year, month]);

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

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <h1 className="text-[17px] font-bold text-zinc-100">Mi actividad</h1>

      {/* Training load chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-sm">🏋️</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-zinc-100">Carga de ejercicio</h2>
            <p className="text-[11px] text-zinc-600">Horas entrenadas · últimas 16 semanas</p>
          </div>
        </div>
        <div className="h-[150px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData} barCategoryGap="22%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}h`, 'Horas']} />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                {weeklyChartData.map((entry, i) => (
                  <rect key={i} fill={entry.current ? '#6366f1' : 'rgba(255,255,255,0.12)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Strength chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span className="text-sm">💪</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-zinc-100">Entrenamientos de fuerza</h2>
            <p className="text-[11px] text-zinc-600">Progreso vs Consolidación · 16 semanas</p>
          </div>
        </div>
        <div className="h-[150px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strengthChartData} barCategoryGap="22%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconType="square" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Bar dataKey="progreso" name="Progreso" stackId="a" fill="#8b5cf6" radius={[0,0,0,0]} />
              <Bar dataKey="consolidacion" name="Consolidación" stackId="a" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Profile + Calendar card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[12px]"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
                border: '1.5px solid rgba(99,102,241,0.25)',
                color: '#818cf8',
                boxShadow: '0 2px 12px rgba(99,102,241,0.15)',
              }}
            >
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-zinc-100">{userName}</p>
              <p className="text-[12px] text-zinc-500">{totalHours}h este mes</p>
            </div>
          </div>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
          >
            🏆 Performer
          </span>
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
                <div
                  key={act.id}
                  className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
                    <div>
                      <p className="text-[13px] font-medium text-zinc-200">{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
                      <p className="text-[11px] text-zinc-600">{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-zinc-700 hover:text-red-400 transition-colors" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
                className="w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] text-zinc-600 hover:text-indigo-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Añadir actividad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Favorite activity */}
      {favoriteType && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3" style={glassCard}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[13px] text-zinc-300">
              Favorito: <span className="font-semibold text-zinc-100">{favoriteType.label?.toLowerCase()}</span> {favoriteType.emoji}
            </span>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="grid grid-cols-3 gap-3">
        <StatBox icon={<TrendingUp className="w-4 h-4 text-blue-400" />} value={`${totalAllTimeHours}h`} label="Total" accent="#3b82f6" />
        <StatBox icon={<Sparkles className="w-4 h-4 text-indigo-400" />} value={`${totalHours}h`} label="Este mes" accent="#6366f1" />
        <StatBox icon={<Target className="w-4 h-4 text-emerald-400" />} value={`${ritmo}%`} label="Ritmo" accent="#10b981" />
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
        onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
        className="fixed bottom-24 right-5 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          border: '1px solid rgba(99,102,241,0.5)',
        }}
      >
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      <LogActivityDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} onSubmit={createActivity} selectedDate={selectedDate} />
    </div>
  );
}

function StatBox({ icon, value, label, accent }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(17, 19, 26, 0.65)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px ${accent}08`,
      }}
    >
      {icon}
      <span className="text-[22px] font-bold text-zinc-100 font-mono mt-1.5">{value}</span>
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
          <button
            key={day}
            onClick={() => onDayClick(day)}
            className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
            style={has
              ? isExp
                ? { background: 'rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.5)' }
                : { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.25)' }
              : isToday
                ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }
                : { background: 'rgba(255,255,255,0.03)' }
            }
          >
            <span className={`text-[10px] font-medium leading-none ${has ? 'text-indigo-200' : isToday ? 'text-zinc-300' : 'text-zinc-600'}`}>{day}</span>
            {emoji && <span className="text-[9px] leading-none mt-0.5">{emoji}</span>}
            {acts.length > 1 && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">{acts.length}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
