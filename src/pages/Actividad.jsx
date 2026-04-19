import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Target, Sparkles, TrendingUp, ChevronDown } from 'lucide-react';

const glassCard = {
  background: 'rgba(245,237,224,0.92)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';
const TEXT_FAINT = 'rgba(42,26,17,0.35)';

const ACTIVITY_COLORS = {
  strength_training: '#6366f1',
  running:           '#10b981',
  swimming:          '#38bdf8',
  cycling:           '#f59e0b',
  tennis:            '#a78bfa',
  padel:             '#fb923c',
  football:          '#4ade80',
  yoga:              '#f472b6',
  hiking:            '#84cc16',
  martial_arts:      '#f87171',
  other:             '#71717a',
};

const TIMEFRAMES = [
  { key: 'weeks', label: 'Sem' },
  { key: 'days',  label: 'Días' },
];

function ChartTooltip({ active, payload, label, labelPrefix }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter(p => p.value != null && p.value > 0);
  if (items.length === 0) return null;
  return (
    <div style={{
      background: '#281811',
      border: '1px solid rgba(245,237,224,0.15)',
      borderRadius: 10, padding: '8px 12px', fontSize: 11,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 110,
    }}>
      <p style={{ color: 'rgba(245,237,224,0.5)', fontSize: 10, marginBottom: 4 }}>
        {labelPrefix || ''}{label}
      </p>
      {items.map((entry, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: i === 0 ? 0 : 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: entry.color || entry.fill }} />
            <span style={{ color: 'rgba(245,237,224,0.85)' }}>{entry.tooltipName || entry.name}</span>
          </div>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{entry.value}h</span>
        </div>
      ))}
    </div>
  );
}

function singleBarColor(hours, maxHours, color) {
  if (hours === 0) return 'rgba(42,26,17,0.08)';
  const r = Math.min(hours / Math.max(maxHours, 0.5), 1);
  const opacity = 0.35 + r * 0.6;
  const hex = color.replace('#','');
  const bigint = parseInt(hex, 16);
  const r2 = (bigint >> 16) & 255;
  const g  = (bigint >>  8) & 255;
  const b  =  bigint & 255;
  return `rgba(${r2},${g},${b},${opacity})`;
}

function ActivityDropdown({ value, onChange, types }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = value === 'accumulated'
    ? { label: 'Acumulado' }
    : value === 'all'
    ? { label: 'Todas' }
    : { ...ACTIVITY_TYPES[value] };

  const isGeneral = value === 'accumulated' || value === 'all';
  const selColor = isGeneral ? 'rgba(42,26,17,0.5)' : ACTIVITY_COLORS[value];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
        style={isGeneral ? {
          background: 'rgba(42,26,17,0.08)',
          border: '1px solid rgba(42,26,17,0.15)',
          color: TEXT_PRIMARY,
        } : {
          background: `${ACTIVITY_COLORS[value]}20`,
          border: `1px solid ${ACTIVITY_COLORS[value]}50`,
          color: ACTIVITY_COLORS[value],
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selColor }} />
        Actividad: {selected.label}
        <ChevronDown className="w-3 h-3 flex-shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: TEXT_MUTED }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
              minWidth: 180,
              background: 'rgba(245,237,224,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.45)',
              borderRadius: 12, padding: 6,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_MUTED, padding: '4px 8px 2px' }}>General</p>
            <MenuItem active={value === 'accumulated'} dot="rgba(42,26,17,0.5)" label="Acumulado"
              onClick={() => { onChange('accumulated'); setOpen(false); }} />
            <MenuItem active={value === 'all'} dot="rgba(42,26,17,0.5)" label="Todas"
              onClick={() => { onChange('all'); setOpen(false); }} />

            {types.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(42,26,17,0.1)', margin: '4px 6px' }} />
                <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_MUTED, padding: '4px 8px 2px' }}>Por actividad</p>
                {types.map(t => (
                  <MenuItem key={t.key} active={value === t.key} dot={ACTIVITY_COLORS[t.key]}
                    label={`${t.emoji} ${t.label}`} color={ACTIVITY_COLORS[t.key]}
                    onClick={() => { onChange(t.key); setOpen(false); }} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ active, dot, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all text-left"
      style={active ? {
        background: color ? `${color}22` : 'rgba(42,26,17,0.1)',
        color: color || TEXT_PRIMARY,
      } : {
        color: TEXT_SECONDARY,
      }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      {label}
    </button>
  );
}

export default function Actividad() {
  const { user } = useAuth();
  const { currentMonth } = useMonth();
  const { myProfile } = useTeamMembers();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = myProfile?.avatar_url || null;
  const { myActivities, allActivities, createActivity, deleteActivity } = useActivities(currentMonth);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [expandedDay, setExpandedDay]     = useState(null);
  const [loadTF, setLoadTF]               = useState('weeks');
  const [actFilter, setActFilter]         = useState('accumulated');

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const myAllActivities = useMemo(
    () => allActivities.filter(a => a.user_email === user?.email),
    [allActivities, user]
  );

  const usedTypes = useMemo(() => {
    const keys = new Set(myAllActivities.map(a => a.type));
    return Object.entries(ACTIVITY_TYPES)
      .filter(([k]) => keys.has(k))
      .map(([key, val]) => ({ key, ...val }));
  }, [myAllActivities]);

  const totalMinutes      = useMemo(() => myActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myActivities]);
  const totalHours        = (totalMinutes / 60).toFixed(1);
  const totalAllTimeMins  = useMemo(() => myAllActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myAllActivities]);
  const totalAllTimeHours = (totalAllTimeMins / 60).toFixed(1);

  const weeksInMonth  = Math.ceil(new Date(year, month + 1, 0).getDate() / 7);
  const expectedHours = weeksInMonth * 5;
  const ritmo = expectedHours > 0 ? Math.round((totalMinutes / 60) / expectedHours * 100) : 0;

  const favoriteType = useMemo(() => {
    const counts = {};
    myActivities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? ACTIVITY_TYPES[top[0]] : null;
  }, [myActivities]);

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function buildBuckets(count, getBounds) {
    return Array.from({ length: count }, (_, i) => {
      const { start, end, label } = getBounds(i);
      const startStr = toDateStr(start);
      const endStr   = toDateStr(end);
      const acts = myAllActivities.filter(a => {
        const ds = a.date?.slice(0, 10);
        return ds >= startStr && ds <= endStr;
      });

      const point = { label };

      if (actFilter === 'all') {
        const minsByType = {};
        let totalMins = 0;
        acts.forEach(a => {
          minsByType[a.type] = (minsByType[a.type] || 0) + (a.duration_minutes || 0);
          totalMins += (a.duration_minutes || 0);
        });
        Object.entries(minsByType).forEach(([type, mins]) => {
          point[type] = +(mins / 60).toFixed(2);
        });
        point.hours = +(totalMins / 60).toFixed(1);
      } else if (actFilter === 'accumulated') {
        const totalMins = acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);
        point.hours = +(totalMins / 60).toFixed(1);
      } else {
        const mins = acts
          .filter(a => a.type === actFilter)
          .reduce((s, a) => s + (a.duration_minutes || 0), 0);
        point.hours = +(mins / 60).toFixed(1);
      }
      return point;
    });
  }

  const weeklyData = useMemo(() => {
    const refDate = new Date(year, month + 1, 0);
    return buildBuckets(16, i => {
      const w = 15 - i;
      const end = new Date(refDate);
      end.setDate(refDate.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start, end, label: `${start.getDate()}/${start.getMonth() + 1}` };
    });
  }, [myAllActivities, year, month, actFilter]);

  const dailyData = useMemo(() => {
    const today = new Date();
    return buildBuckets(60, i => {
      const d = 59 - i;
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      return { start, end, label: `${date.getDate()}/${date.getMonth() + 1}` };
    });
  }, [myAllActivities, actFilter]);

  const chartData = loadTF === 'weeks' ? weeklyData : dailyData;
  const maxHours  = Math.max(...chartData.map(d => d.hours || 0), 0.5);
  const xInterval = loadTF === 'weeks' ? 3 : 9;

  const visibleTypes = useMemo(() => {
    const keys = new Set();
    chartData.forEach(p => Object.keys(p).forEach(k => {
      if (k !== 'label' && k !== 'hours' && (p[k] || 0) > 0) keys.add(k);
    }));
    return Object.entries(ACTIVITY_TYPES)
      .filter(([k]) => keys.has(k))
      .map(([key, val]) => ({ key, ...val }));
  }, [chartData]);

  const strengthData = useMemo(() => {
    const refDate = new Date(year, month + 1, 0);
    return Array.from({ length: 16 }, (_, i) => {
      const w = 15 - i;
      const end = new Date(refDate);
      end.setDate(refDate.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const acts = myAllActivities.filter(a => {
        const ds = a.date?.slice(0, 10);
        return ds >= toDateStr(start) && ds <= toDateStr(end) && a.type === 'strength_training';
      });
      return {
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        progreso:      +(acts.filter(a => a.training_type === 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1),
        consolidacion: +(acts.filter(a => a.training_type !== 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1),
      };
    });
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
    if (activitiesByDate[day]) setExpandedDay(expandedDay === day ? null : day);
    else { setSelectedDate(new Date(year, month, day)); setShowLogDialog(true); }
  };

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const chartSubtitle = actFilter === 'accumulated'
    ? 'Total acumulado'
    : actFilter === 'all'
    ? 'Todas las actividades'
    : `${ACTIVITY_TYPES[actFilter]?.emoji} ${ACTIVITY_TYPES[actFilter]?.label}`;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <h1 className="text-[17px] font-bold" style={{ color: 'rgba(245,237,224,0.92)' }}>Mi Actividad</h1>

      {/* Carga de ejercicio */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Carga de ejercicio</h2>
              <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
                {loadTF === 'weeks' ? 'Últimas 16 semanas' : 'Últimos 60 días'} · {chartSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg p-1 flex-shrink-0"
            style={{ background: 'rgba(42,26,17,0.07)', border: '1px solid rgba(42,26,17,0.1)' }}>
            {TIMEFRAMES.map(tf => (
              <button key={tf.key} onClick={() => setLoadTF(tf.key)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                style={loadTF === tf.key ? {
                  background: '#2a1a11',
                  color: 'rgba(245,237,224,0.95)',
                } : {
                  color: TEXT_MUTED,
                }}>
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <ActivityDropdown value={actFilter} onChange={setActFilter} types={usedTypes} />
        </div>

        <div className="h-[148px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="24%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={xInterval} />
              <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={22} />
              <Tooltip
                cursor={{ fill: 'rgba(42,26,17,0.04)' }}
                content={(props) => {
                  const payload = (props.payload || []).map(p => {
                    if (p.dataKey === 'hours') return { ...p, tooltipName: 'Horas' };
                    const t = ACTIVITY_TYPES[p.dataKey];
                    return { ...p, tooltipName: t ? `${t.emoji} ${t.label}` : p.name };
                  });
                  return <ChartTooltip {...props} payload={payload} />;
                }}
              />

              {actFilter === 'all' && visibleTypes.length > 0 ? (
                visibleTypes.map((t, i) => (
                  <Bar key={t.key} dataKey={t.key} stackId="a" fill={ACTIVITY_COLORS[t.key]} fillOpacity={0.85}
                    radius={i === visibleTypes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))
              ) : (
                <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={singleBarColor(entry.hours, maxHours,
                      actFilter === 'accumulated' || actFilter === 'all' ? '#2a1a11' : (ACTIVITY_COLORS[actFilter] || '#2a1a11')
                    )} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {actFilter === 'all' && visibleTypes.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {visibleTypes.map(t => (
              <div key={t.key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: ACTIVITY_COLORS[t.key], opacity: 0.85 }} />
                <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{t.label}</span>
              </div>
            ))}
          </div>
        )}

        {actFilter !== 'all' && (
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-[10px]" style={{ color: TEXT_MUTED }}>Poco</span>
            <div className="flex gap-0.5">
              {[0.3, 0.45, 0.6, 0.75, 0.95].map((op, i) => {
                const baseColor = actFilter === 'accumulated' ? '#2a1a11' : (ACTIVITY_COLORS[actFilter] || '#2a1a11');
                const hex = baseColor.replace('#', '');
                const bint = parseInt(hex, 16);
                const rgb = `${(bint>>16)&255},${(bint>>8)&255},${bint&255}`;
                return <div key={i} className="w-3.5 h-2 rounded-sm" style={{ background: `rgba(${rgb},${op})` }} />;
              })}
            </div>
            <span className="text-[10px]" style={{ color: TEXT_MUTED }}>Mucho</span>
          </div>
        )}
      </motion.div>

      {/* Progreso en fuerza */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
            <span className="text-sm">💪</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Progreso en fuerza</h2>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Progreso vs Consolidación · 16 semanas</p>
          </div>
        </div>
        <div className="h-[148px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strengthData} barCategoryGap="22%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={22} />
              <Tooltip cursor={{ fill: 'rgba(42,26,17,0.04)' }}
                content={(props) => {
                  const payload = (props.payload || []).map(p => ({ ...p, tooltipName: p.name }));
                  return <ChartTooltip {...props} payload={payload} labelPrefix="Sem " />;
                }} />
              <Bar dataKey="progreso"      name="Progreso"      stackId="a" fill="rgba(139,92,246,0.85)" radius={[0,0,0,0]} />
              <Bar dataKey="consolidacion" name="Consolidación" stackId="a" fill="rgba(16,185,129,0.85)"  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[['rgba(139,92,246,0.85)', 'Progreso'], ['rgba(16,185,129,0.85)', 'Consolidación']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Perfil + Calendario */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-11 h-11 rounded-xl object-cover"
                style={{ border: '1.5px solid rgba(99,102,241,0.4)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)' }}
              />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[12px]"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(99,102,241,0.12))', border: '1.5px solid rgba(99,102,241,0.4)', color: '#2a1a11', boxShadow: '0 2px 12px rgba(99,102,241,0.2)' }}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>{userName}</p>
              <p className="text-[12px]" style={{ color: TEXT_SECONDARY }}>{totalHours}h este mes</p>
            </div>
          </div>
        </div>

        <CalendarGrid year={year} month={month} activitiesByDate={activitiesByDate} onDayClick={handleDayClick} expandedDay={expandedDay} />

        <AnimatePresence>
          {expandedDay && activitiesByDate[expandedDay] && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5 overflow-hidden">
              {activitiesByDate[expandedDay].map(act => (
                <div key={act.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ background: 'rgba(42,26,17,0.07)', border: '1px solid rgba(42,26,17,0.1)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: TEXT_PRIMARY }}>{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
                      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 transition-colors" style={{ color: TEXT_MUTED }} />
                  </button>
                </div>
              ))}
              <button onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
                className="w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] transition-colors"
                style={{ background: 'rgba(42,26,17,0.04)', border: '1px dashed rgba(42,26,17,0.18)', color: TEXT_MUTED }}>
                <Plus className="w-3.5 h-3.5" /> Añadir actividad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Favorito */}
      {favoriteType && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-2xl px-4 py-3" style={glassCard}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#4338ca' }} />
            <span className="text-[13px]" style={{ color: TEXT_SECONDARY }}>
              Favorito: <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{favoriteType.label?.toLowerCase()}</span> {favoriteType.emoji}
            </span>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="grid grid-cols-3 gap-3">
        <StatBox icon={<TrendingUp className="w-4 h-4" style={{ color: '#3b82f6' }} />}   value={`${totalAllTimeHours}h`} label="Total"    />
        <StatBox icon={<Sparkles   className="w-4 h-4" style={{ color: '#4338ca' }} />} value={`${totalHours}h`}        label="Este mes" />
        <StatBox icon={<Target     className="w-4 h-4" style={{ color: '#10b981' }} />} value={`${ritmo}%`}            label="Ritmo"    />
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
        onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
        className="fixed bottom-24 right-5 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40"
        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.5)' }}>
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      <LogActivityDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} onSubmit={createActivity} selectedDate={selectedDate} />
    </div>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center" style={glassCard}>
      {icon}
      <span className="text-[22px] font-bold font-mono mt-1.5" style={{ color: TEXT_PRIMARY }}>{value}</span>
      <span className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>{label}</span>
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
        <div key={`p-${d}`} className="aspect-square rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(42,26,17,0.04)' }}>
          <span className="text-[10px]" style={{ color: 'rgba(42,26,17,0.3)' }}>{d}</span>
        </div>
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        const acts  = activitiesByDate[day] || [];
        const has   = acts.length > 0;
        const isExp = expandedDay === day;
        const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;
        return (
          <button key={day} onClick={() => onDayClick(day)}
            className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
            style={has
              ? isExp
                ? { background: '#7a9583', boxShadow: '0 3px 10px rgba(122,149,131,0.4)', border: '1px solid rgba(255,255,255,0.25)' }
                : { background: '#8fa898', boxShadow: '0 1px 4px rgba(143,168,152,0.25)' }
              : isToday
                ? { background: 'rgba(42,26,17,0.14)', border: '1px solid rgba(42,26,17,0.22)' }
                : { background: 'rgba(42,26,17,0.07)' }
            }>
            <span className="text-[11px] font-semibold leading-none"
              style={{ color: has ? '#1c2620' : isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}>
              {day}
            </span>
            {emoji && <span className="text-[10px] leading-none mt-0.5">{emoji}</span>}
            {acts.length > 1 && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: '#fff', border: '1px solid rgba(42,26,17,0.1)' }}>
                <span className="text-[7px] font-bold" style={{ color: '#1c2620' }}>{acts.length}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
