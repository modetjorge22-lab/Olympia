import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Target, Sparkles, TrendingUp, ChevronDown } from 'lucide-react';

const glassCard = {
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  background: 'rgba(17, 19, 26, 0.65)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const tooltipStyle = {
  backgroundColor: 'rgba(11,11,15,0.97)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 11,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
};

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

// Intensidad de barra única según ratio
function singleBarColor(hours, maxHours, color) {
  if (hours === 0) return 'rgba(255,255,255,0.06)';
  const r = Math.min(hours / Math.max(maxHours, 0.5), 1);
  const opacity = 0.22 + r * 0.73;
  // Convierte hex a rgb para poder aplicar opacity
  const hex = color.replace('#','');
  const bigint = parseInt(hex, 16);
  const r2 = (bigint >> 16) & 255;
  const g  = (bigint >>  8) & 255;
  const b  =  bigint & 255;
  return `rgba(${r2},${g},${b},${opacity})`;
}

// ── Dropdown component ──
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
    ? { label: 'Acumulado', color: 'rgba(255,255,255,0.35)', emoji: null }
    : value === 'all'
    ? { label: 'Todas', color: 'rgba(255,255,255,0.35)', emoji: null }
    : { ...ACTIVITY_TYPES[value], color: ACTIVITY_COLORS[value], emoji: ACTIVITY_TYPES[value]?.emoji };

  const isGeneral = value === 'accumulated' || value === 'all';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
        style={open || !isGeneral ? {
          background: isGeneral ? 'rgba(255,255,255,0.07)' : `${ACTIVITY_COLORS[value]}18`,
          border: `1px solid ${isGeneral ? 'rgba(255,255,255,0.14)' : ACTIVITY_COLORS[value] + '35'}`,
          color: isGeneral ? 'rgba(255,255,255,0.75)' : ACTIVITY_COLORS[value],
        } : {
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        {/* dot */}
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: isGeneral ? 'rgba(255,255,255,0.4)' : ACTIVITY_COLORS[value] }} />
        Actividad: {selected.label}
        <ChevronDown
          className="w-3 h-3 flex-shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'rgba(255,255,255,0.3)' }}
        />
      </button>

      {/* Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 50,
              minWidth: 172,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              background: 'rgba(13,13,18,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            }}
          >
            {/* General */}
            <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', padding: '4px 8px 2px' }}>General</p>
            <MenuItem
              active={value === 'accumulated'}
              dot="rgba(255,255,255,0.35)"
              label="Acumulado"
              onClick={() => { onChange('accumulated'); setOpen(false); }}
            />
            <MenuItem
              active={value === 'all'}
              dot="rgba(255,255,255,0.35)"
              label="Todas"
              onClick={() => { onChange('all'); setOpen(false); }}
            />

            {/* Divider */}
            {types.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 6px' }} />
                <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', padding: '4px 8px 2px' }}>Por actividad</p>
                {types.map(t => (
                  <MenuItem
                    key={t.key}
                    active={value === t.key}
                    dot={ACTIVITY_COLORS[t.key]}
                    label={`${t.emoji} ${t.label}`}
                    color={ACTIVITY_COLORS[t.key]}
                    onClick={() => { onChange(t.key); setOpen(false); }}
                  />
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
        background: color ? `${color}18` : 'rgba(255,255,255,0.07)',
        color: color || 'rgba(255,255,255,0.85)',
      } : {
        color: 'rgba(255,255,255,0.5)',
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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const { myActivities, allActivities, createActivity, deleteActivity } = useActivities(currentMonth);

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [expandedDay, setExpandedDay]     = useState(null);
  const [loadTF, setLoadTF]               = useState('weeks');
  // 'accumulated' = total sin dividir por tipo (barra única por intensidad)
  // 'all'         = apilado por tipo con colores
  // '<type>'      = solo ese tipo
  const [actFilter, setActFilter]         = useState('accumulated');

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const myAllActivities = useMemo(
    () => allActivities.filter(a => a.user_email === user?.email),
    [allActivities, user]
  );

  // Tipos con datos registrados
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

  // ── Construir datos del chart ──
  // Convierte fecha local a string YYYY-MM-DD para comparar sin problemas de timezone
  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function buildBuckets(count, getBounds) {
    return Array.from({ length: count }, (_, i) => {
      const { start, end, label } = getBounds(i);
      const startStr = toDateStr(start);
      const endStr   = toDateStr(end);

      // Comparar como strings YYYY-MM-DD — evita problemas de UTC vs local
      const acts = myAllActivities.filter(a => {
        const ds = a.date?.slice(0, 10); // "2024-04-15"
        return ds >= startStr && ds <= endStr;
      });

      const point = { label };

      if (actFilter === 'all') {
        // Apilado por tipo
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
        // Total acumulado, barra única
        const totalMins = acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);
        point.hours = +(totalMins / 60).toFixed(1);
      } else {
        // Tipo específico
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

  const chartData    = loadTF === 'weeks' ? weeklyData : dailyData;
  const maxHours     = Math.max(...chartData.map(d => d.hours || 0), 0.5);
  const xInterval    = loadTF === 'weeks' ? 3 : 9;

  // Tipos visibles en el período actual
  const visibleTypes = useMemo(() => {
    const keys = new Set();
    chartData.forEach(p => Object.keys(p).forEach(k => {
      if (k !== 'label' && k !== 'hours' && (p[k] || 0) > 0) keys.add(k);
    }));
    return Object.entries(ACTIVITY_TYPES)
      .filter(([k]) => keys.has(k))
      .map(([key, val]) => ({ key, ...val }));
  }, [chartData]);

  // ── Strength chart ──
  const strengthData = useMemo(() => {
    const refDate = new Date(year, month + 1, 0);
    return Array.from({ length: 16 }, (_, i) => {
      const w = 15 - i;
      const end = new Date(refDate);
      end.setDate(refDate.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const acts = myAllActivities.filter(a => {
        const d = new Date(a.date);
        return d >= start && d <= end && a.type === 'strength_training';
      });
      return {
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        progreso:      +(acts.filter(a => a.training_type === 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1),
        consolidacion: +(acts.filter(a => a.training_type !== 'progress').reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1),
      };
    });
  }, [myAllActivities, year, month]);

  // ── Calendario ──
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

  // Subtítulo del chart
  const chartSubtitle = actFilter === 'accumulated'
    ? 'Total acumulado'
    : actFilter === 'all'
    ? 'Todas las actividades'
    : `${ACTIVITY_TYPES[actFilter]?.emoji} ${ACTIVITY_TYPES[actFilter]?.label}`;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <h1 className="text-[17px] font-bold text-zinc-100">Mi Actividad</h1>

      {/* ── Carga de ejercicio ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={glassCard}>

        {/* Fila título + toggle timeframe */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-zinc-100">Carga de ejercicio</h2>
              <p className="text-[10px] text-zinc-600">
                {loadTF === 'weeks' ? 'Últimas 16 semanas' : 'Últimos 60 días'} · {chartSubtitle}
              </p>
            </div>
          </div>

          {/* Timeframe toggle */}
          <div className="flex items-center gap-1 rounded-lg p-1 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TIMEFRAMES.map(tf => (
              <button key={tf.key} onClick={() => setLoadTF(tf.key)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                style={loadTF === tf.key ? {
                  background: 'rgba(99,102,241,0.25)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.3)',
                } : {
                  color: 'rgba(255,255,255,0.28)',
                  border: '1px solid transparent',
                }}>
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fila dropdown actividad */}
        <div className="mb-3">
          <ActivityDropdown
            value={actFilter}
            onChange={setActFilter}
            types={usedTypes}
          />
        </div>

        {/* Chart */}
        <div className="h-[148px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="24%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={xInterval} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v, name) => {
                  if (name === 'hours') return [`${v}h`, 'Horas'];
                  const t = ACTIVITY_TYPES[name];
                  return [`${v}h`, t ? `${t.emoji} ${t.label}` : name];
                }}
              />

              {actFilter === 'all' && visibleTypes.length > 0 ? (
                // Barras apiladas por tipo con sus colores
                visibleTypes.map((t, i) => (
                  <Bar
                    key={t.key}
                    dataKey={t.key}
                    stackId="a"
                    fill={ACTIVITY_COLORS[t.key]}
                    fillOpacity={0.75}
                    radius={i === visibleTypes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  />
                ))
              ) : (
                // Barra única (acumulado o tipo específico) con intensidad de color
                <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={singleBarColor(
                        entry.hours,
                        maxHours,
                        actFilter === 'accumulated' || actFilter === 'all'
                          ? '#6366f1'
                          : (ACTIVITY_COLORS[actFilter] || '#6366f1')
                      )}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda tipos (solo modo Todas) */}
        {actFilter === 'all' && visibleTypes.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {visibleTypes.map(t => (
              <div key={t.key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: ACTIVITY_COLORS[t.key], opacity: 0.8 }} />
                <span className="text-[10px] text-zinc-600">{t.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Leyenda intensidad (modo acumulado o tipo único) */}
        {actFilter !== 'all' && (
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-[10px] text-zinc-700">Poco</span>
            <div className="flex gap-0.5">
              {[0.22, 0.37, 0.54, 0.70, 0.95].map((op, i) => {
                const baseColor = actFilter === 'accumulated' ? '#6366f1' : (ACTIVITY_COLORS[actFilter] || '#6366f1');
                const hex = baseColor.replace('#', '');
                const bint = parseInt(hex, 16);
                const rgb = `${(bint>>16)&255},${(bint>>8)&255},${bint&255}`;
                return <div key={i} className="w-3.5 h-2 rounded-sm" style={{ background: `rgba(${rgb},${op})` }} />;
              })}
            </div>
            <span className="text-[10px] text-zinc-700">Mucho</span>
          </div>
        )}
      </motion.div>

      {/* ── Entrenamientos de fuerza ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span className="text-sm">💪</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-zinc-100">Entrenamientos de fuerza</h2>
            <p className="text-[11px] text-zinc-600">Progreso vs Consolidación · 16 semanas</p>
          </div>
        </div>
        <div className="h-[148px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strengthData} barCategoryGap="22%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="progreso"      name="Progreso"      stackId="a" fill="rgba(139,92,246,0.75)" radius={[0,0,0,0]} />
              <Bar dataKey="consolidacion" name="Consolidación" stackId="a" fill="rgba(16,185,129,0.7)"  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[['rgba(139,92,246,0.75)', 'Progreso'], ['rgba(16,185,129,0.7)', 'Consolidación']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-[10px] text-zinc-600">{l}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Perfil + Calendario ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[12px]"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(99,102,241,0.05))', border: '1.5px solid rgba(99,102,241,0.25)', color: '#818cf8', boxShadow: '0 2px 12px rgba(99,102,241,0.15)' }}>
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-zinc-100">{userName}</p>
              <p className="text-[12px] text-zinc-500">{totalHours}h este mes</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
            🏆 Performer
          </span>
        </div>

        <CalendarGrid year={year} month={month} activitiesByDate={activitiesByDate} onDayClick={handleDayClick} expandedDay={expandedDay} />

        <AnimatePresence>
          {expandedDay && activitiesByDate[expandedDay] && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5 overflow-hidden">
              {activitiesByDate[expandedDay].map(act => (
                <div key={act.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
                    <div>
                      <p className="text-[13px] font-medium text-zinc-200">{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
                      <p className="text-[11px] text-zinc-600">{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-zinc-700 hover:text-red-400 transition-colors" />
                  </button>
                </div>
              ))}
              <button onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
                className="w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] text-zinc-600 hover:text-indigo-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                <Plus className="w-3.5 h-3.5" /> Añadir actividad
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Favorito ── */}
      {favoriteType && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-2xl px-4 py-3" style={glassCard}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[13px] text-zinc-300">
              Favorito: <span className="font-semibold text-zinc-100">{favoriteType.label?.toLowerCase()}</span> {favoriteType.emoji}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Stats ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="grid grid-cols-3 gap-3">
        <StatBox icon={<TrendingUp className="w-4 h-4 text-blue-400" />}   value={`${totalAllTimeHours}h`} label="Total"    accent="#3b82f6" />
        <StatBox icon={<Sparkles   className="w-4 h-4 text-indigo-400" />} value={`${totalHours}h`}        label="Este mes" accent="#6366f1" />
        <StatBox icon={<Target     className="w-4 h-4 text-emerald-400" />} value={`${ritmo}%`}            label="Ritmo"    accent="#10b981" />
      </motion.div>

      {/* ── FAB ── */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
        onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
        className="fixed bottom-24 right-5 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40"
        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.5)' }}>
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      <LogActivityDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} onSubmit={createActivity} selectedDate={selectedDate} />
    </div>
  );
}

function StatBox({ icon, value, label, accent }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center"
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(17,19,26,0.65)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px ${accent}08` }}>
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
        const acts  = activitiesByDate[day] || [];
        const has   = acts.length > 0;
        const isExp = expandedDay === day;
        const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;
        return (
          <button key={day} onClick={() => onDayClick(day)}
            className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
            style={has
              ? isExp ? { background: 'rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.5)' }
                      : { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.25)' }
              : isToday ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }
                        : { background: 'rgba(255,255,255,0.03)' }}>
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
