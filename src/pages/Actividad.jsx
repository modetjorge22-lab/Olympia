import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid, ReferenceLine } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { Plus, Trash2, Target, Sparkles, TrendingUp, TrendingDown, ChevronDown, Calendar } from 'lucide-react';
import { getActivitySummary, getPlanSummary, DAY_PALETTE } from '@/utils/dayDisplay';

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
 running: '#10b981',
 swimming: '#38bdf8',
 cycling: '#f59e0b',
 tennis: '#a78bfa',
 padel: '#fb923c',
 football: '#4ade80',
 yoga: '#f472b6',
 hiking: '#84cc16',
 martial_arts: '#f87171',
 other: '#71717a',
};

const TIMEFRAMES = [
 { key: 'weeks', label: 'Sem' },
 { key: 'days', label: 'Días' },
];

function ChartTooltip({ active, payload, label, labelPrefix }) {
 if (!active || !payload?.length) return null;
 const items = payload.filter(p => p.value != null && p.value > 0);
 if (items.length === 0) return null;
 const intervalLabel = payload[0]?.payload?.intervalLabel;
 const headerText = intervalLabel || `${labelPrefix || ''}${label}`;

 const total = items.reduce((s, e) => s + (e.value || 0), 0);
 const totalH = Math.floor(total);
 const totalM = Math.round((total - totalH) * 60);
 const totalText = totalM === 0 ? `${totalH}h` : `${totalH}h ${totalM}min`;

 const showBreakdown = items.length > 1;

 return (
 <div style={{
 background: '#2a121a',
 border: '1px solid rgba(245,237,224,0.15)',
 borderRadius: 8, padding: '6px 9px', fontSize: 10,
 boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
 }}>
 <p style={{ color: 'rgba(245,237,224,0.55)', fontSize: 9, marginBottom: 2 }}>
 {headerText}
 </p>
 <p style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
 {totalText}
 </p>
 {showBreakdown && items.map((entry, i) => (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: i === 0 ? 3 : 1 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <div style={{ width: 5, height: 5, borderRadius: 1, background: entry.color || entry.fill }} />
 <span style={{ color: 'rgba(245,237,224,0.7)', fontSize: 9 }}>{entry.tooltipName || entry.name}</span>
 </div>
 <span style={{ color: 'rgba(245,237,224,0.85)', fontWeight: 500, fontSize: 9 }}>{entry.value}h</span>
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
 const g = (bigint >> 8) & 255;
 const b = bigint & 255;
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
 : { ...ACTIVITY_TYPES[value] };

 const isGeneral = value === 'accumulated';
 const selColor = isGeneral ? 'rgba(42,18,26,0.7)' : ACTIVITY_COLORS[value];

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
 <div exit={{ opacity: 0, y: -6, scale: 0.97 }}
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
 <MenuItem active={value === 'accumulated'} dot="rgba(42,18,26,0.7)" label="Acumulado"
 onClick={() => { onChange('accumulated'); setOpen(false); }} />

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
 </div>
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
 const { currentMonth, goToMonth } = useMonth();
 const { myProfile } = useTeamMembers();
 const calendarRef = useRef(null);
 const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
 const avatarUrl = myProfile?.avatar_url || null;
 const { myActivities, allActivities, createActivity, deleteActivity, updateActivity } = useActivities(currentMonth);
 const { plans: weeklyPlans, addPlan, removePlan } = useWeeklyPlans(currentMonth);

 const [showLogDialog, setShowLogDialog] = useState(false);
 const [selectedDate, setSelectedDate] = useState(new Date());
 const [expandedDay, setExpandedDay] = useState(null);
 const [loadTF, setLoadTF] = useState('weeks');
 const [actFilter, setActFilter] = useState('accumulated');

 const year = currentMonth.getFullYear();
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

 const totalMinutes = useMemo(() => myActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myActivities]);
 const totalHours = (totalMinutes / 60).toFixed(1);
 const totalAllTimeMins = useMemo(() => myAllActivities.reduce((s, a) => s + (a.duration_minutes || 0), 0), [myAllActivities]);
 const totalAllTimeHours = (totalAllTimeMins / 60).toFixed(1);

 const weeksInMonth = Math.ceil(new Date(year, month + 1, 0).getDate() / 7);
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
 const bounds = getBounds(i);
 const { start, end, label } = bounds;
 const startStr = toDateStr(start);
 const endStr = toDateStr(end);
 const acts = myAllActivities.filter(a => {
 const ds = a.date?.slice(0, 10);
 return ds >= startStr && ds <= endStr;
 });

 const point = {
 label,
 monthLabel: bounds.monthLabel,
 intervalLabel: bounds.intervalLabel,
 };

 if (actFilter === 'accumulated') {
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

 const MONTH_LABELS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
 const MONTH_NAMES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

 const weeklyData = useMemo(() => {
 // Referencia siempre HOY: la última semana mostrada es la actual,
 // independientemente del mes que esté navegado en el calendario.
 const today = new Date();
 today.setHours(23, 59, 59, 999);
 let lastMonth = -1;
 return buildBuckets(16, i => {
 const w = 15 - i;
 const end = new Date(today);
 end.setDate(today.getDate() - w * 7);
 const start = new Date(end);
 start.setDate(end.getDate() - 6);
 // Solo mostramos la inicial cuando cambia el mes (en el primer día visible de ese mes)
 const showMonth = start.getMonth() !== lastMonth;
 lastMonth = start.getMonth();
 return {
 start,
 end,
 label: `${start.getDate()}/${start.getMonth() + 1}`,
 monthLabel: showMonth ? MONTH_LABELS_SHORT[start.getMonth()] : '',
 intervalLabel: `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]}`,
 };
 });
 }, [myAllActivities, actFilter]);

 const dailyData = useMemo(() => {
 const today = new Date();
 let lastMonth = -1;
 return buildBuckets(60, i => {
 const d = 59 - i;
 const date = new Date(today);
 date.setDate(today.getDate() - d);
 const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
 const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
 const showMonth = date.getMonth() !== lastMonth;
 lastMonth = date.getMonth();
 return {
 start,
 end,
 label: `${date.getDate()}/${date.getMonth() + 1}`,
 monthLabel: showMonth ? MONTH_LABELS_SHORT[date.getMonth()] : '',
 intervalLabel: `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getFullYear()}`,
 };
 });
 }, [myAllActivities, actFilter]);

 const chartData = loadTF === 'weeks' ? weeklyData : dailyData;
 const maxHours = Math.max(...chartData.map(d => d.hours || 0), 0.5);
 const xInterval = loadTF === 'weeks' ? 3 : 9;

 // Eje Y: max = pico real (sin headroom). Tope en la barra/punto más alto.
 const { yDomain, yTicks } = useMemo(() => {
 if (maxHours <= 0) return { yDomain: [0, 1], yTicks: [0, 1] };
 // Pasos preferidos para los ticks intermedios
 const niceSteps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
 const idealStep = maxHours / 4;
 const step = niceSteps.find(s => s >= idealStep) || 100;
 // Redondeo al siguiente múltiplo de step para que el pico quede dentro
 const max = Math.ceil(maxHours / step) * step;
 const numTicks = Math.round(max / step) + 1;
 const ticks = Array.from({ length: numTicks }, (_, i) => +(i * step).toFixed(1));
 return { yDomain: [0, max], yTicks: ticks };
 }, [maxHours]);


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

 // Sincroniza un día (de cualquier mes) con el calendario principal.
 // - Si el día tiene actividades reales: cambia mes si necesario, lo expande y hace scroll.
 // - Si está vacío: abre el diálogo de logging para crear actividad en ese día.
 const syncDayToCalendar = (date) => {
 const yr = date.getFullYear();
 const mo = date.getMonth();
 const day = date.getDate();
 const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 const hasActivities = myAllActivities.some(a => a.date?.slice(0, 10) === ds);

 if (yr !== year || mo !== month) goToMonth(date);

 if (hasActivities) {
 setExpandedDay(day);
 // Esperamos al re-render del nuevo mes antes de hacer scroll
 setTimeout(() => {
 calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }, 120);
 } else {
 setSelectedDate(date);
 setShowLogDialog(true);
 }
 };

 const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

 // ── Últimos 7 días ──
 const last7Days = useMemo(() => {
 const today = new Date();
 const days = [];
 for (let i = 6; i >= 0; i--) {
 const d = new Date(today);
 d.setDate(today.getDate() - i);
 const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const acts = myAllActivities.filter(a => a.date?.slice(0,10) === ds);
 const dayPlans = weeklyPlans.filter(p => p.date?.slice(0,10) === ds);
 const hasActivity = acts.length > 0;
 days.push({
 date: d,
 dayNum: d.getDate(),
 dayName: ['D','L','M','X','J','V','S'][d.getDay()],
 isToday: i === 0,
 acts,
 plans: dayPlans,
 hasActivity,
 hasPlan: !hasActivity && dayPlans.length > 0,
 minutes: acts.reduce((s, a) => s + (a.duration_minutes || 0), 0),
 });
 }
 return days;
 }, [myAllActivities, weeklyPlans]);

 // ── Próximos 7 días (sin contar hoy) ──
 const next7Days = useMemo(() => {
 const today = new Date();
 const days = [];
 for (let i = 1; i <= 7; i++) {
 const d = new Date(today);
 d.setDate(today.getDate() + i);
 const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const acts = myAllActivities.filter(a => a.date?.slice(0,10) === ds);
 const dayPlans = weeklyPlans.filter(p => p.date?.slice(0,10) === ds);
 const hasActivity = acts.length > 0;
 days.push({
 date: d,
 dayNum: d.getDate(),
 dayName: ['D','L','M','X','J','V','S'][d.getDay()],
 acts,
 plans: dayPlans,
 hasActivity,
 hasPlan: !hasActivity && dayPlans.length > 0,
 });
 }
 return days;
 }, [myAllActivities, weeklyPlans]);

 // ── Carga: comparar horas de los últimos 7 días vs media de semanas previas ──
 const loadLevel = useMemo(() => {
 const last7Mins = last7Days.reduce((s, d) => s + d.minutes, 0);
 const last7Hours = last7Mins / 60;

 // Media de las 12 semanas anteriores (sin contar la actual)
 const today = new Date();
 const weekSums = [];
 for (let w = 1; w <= 12; w++) {
 const end = new Date(today);
 end.setDate(today.getDate() - w * 7);
 const start = new Date(end);
 start.setDate(end.getDate() - 6);
 const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
 const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
 const mins = myAllActivities
 .filter(a => { const ds = a.date?.slice(0,10); return ds >= startStr && ds <= endStr; })
 .reduce((s, a) => s + (a.duration_minutes || 0), 0);
 if (mins > 0) weekSums.push(mins / 60);
 }

 if (weekSums.length === 0) {
 return { label: last7Hours > 0 ? 'Media' : 'Sin datos', color: '#8c7364', hours: last7Hours };
 }
 const avg = weekSums.reduce((s, h) => s + h, 0) / weekSums.length;
 // ±20% considerado "media"
 if (last7Hours > avg * 1.2) return { label: 'Alta', color: '#047857', hours: last7Hours, avg };
 if (last7Hours < avg * 0.8) return { label: 'Baja', color: '#b45309', hours: last7Hours, avg };
 return { label: 'Media', color: '#6e5647', hours: last7Hours, avg };
 }, [last7Days, myAllActivities]);

 const chartSubtitle = actFilter === 'accumulated'
 ? 'Total acumulado'
 : `${ACTIVITY_TYPES[actFilter]?.emoji} ${ACTIVITY_TYPES[actFilter]?.label}`;

 // ── Horas última semana + media del periodo + media para línea referencia ──
 const lastWeekHours = useMemo(() => {
 const today = new Date();
 const end = new Date(today);
 end.setDate(today.getDate() - 1);
 end.setHours(23, 59, 59, 999);
 const start = new Date(today);
 start.setDate(today.getDate() - 7);
 start.setHours(0, 0, 0, 0);
 const startStr = toDateStr(start);
 const endStr = toDateStr(end);
 const acts = myAllActivities.filter(a => {
 const ds = a.date?.slice(0, 10);
 if (!ds || ds < startStr || ds > endStr) return false;
 if (actFilter === 'accumulated') return true;
 return a.type === actFilter;
 });
 const totalMins = acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);
 return +(totalMins / 60).toFixed(1);
 }, [myAllActivities, actFilter]);

 // Media semanal del periodo (sin contar la última semana actual, es decir,
 // tu "media habitual" antes de esta semana).
 const avgWeeklyHours = useMemo(() => {
 const today = new Date();
 today.setHours(23, 59, 59, 999);
 const endRef = new Date(today);
 endRef.setDate(today.getDate() - 7); // hasta hace 7 días
 const totalDays = (loadTF === 'weeks' ? 16 * 7 : 60) - 7;
 const startRef = new Date(endRef);
 startRef.setDate(endRef.getDate() - totalDays + 1);
 startRef.setHours(0, 0, 0, 0);
 const startStr = toDateStr(startRef);
 const endStr = toDateStr(endRef);
 const acts = myAllActivities.filter(a => {
 const ds = a.date?.slice(0, 10);
 if (!ds || ds < startStr || ds > endStr) return false;
 if (actFilter === 'accumulated') return true;
 return a.type === actFilter;
 });
 const totalMins = acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);
 const numWeeks = totalDays / 7;
 return numWeeks > 0 ? +((totalMins / 60) / numWeeks).toFixed(1) : 0;
 }, [myAllActivities, loadTF, actFilter]);

 // Línea media para el chart: en weeks usamos la media semanal directa;
 // en days la dividimos entre 7 para una "media diaria".
 const referenceLineValue = loadTF === 'weeks'
 ? avgWeeklyHours
 : +(avgWeeklyHours / 7).toFixed(2);

 // % de la última semana respecto a la media (positivo = por encima).
 const lastWeekVsAvgPct = avgWeeklyHours > 0
 ? Math.round(((lastWeekHours - avgWeeklyHours) / avgWeeklyHours) * 100)
 : null;

 // Mapas para calendar/planner
 // Día del mes mostrado → planes
 const plansByDayOfMonth = useMemo(() => {
 const map = {};
 weeklyPlans.forEach(p => {
 const d = new Date(p.date + 'T00:00:00');
 if (d.getFullYear() === year && d.getMonth() === month) {
 const day = d.getDate();
 if (!map[day]) map[day] = [];
 map[day].push(p);
 }
 });
 return map;
 }, [weeklyPlans, year, month]);

 // Fecha YYYY-MM-DD → actividades reales registradas (rico, para mostrar resumen)
 const activitiesByDateStr = useMemo(() => {
 const map = {};
 myAllActivities.forEach(a => {
 const ds = a.date?.slice(0, 10);
 if (!ds) return;
 if (!map[ds]) map[ds] = [];
 map[ds].push(a);
 });
 return map;
 }, [myAllActivities]);

 return (
 <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
 <h1 className="text-[17px] font-bold" style={{ color: 'rgba(245,237,224,0.92)' }}>Mi Actividad</h1>

 {/* ── Planificador ── */}
 <div className="rounded-2xl p-4" style={glassCard}>

 {/* Cabecera del card */}
 <div className="flex items-center gap-2.5 mb-4">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
 <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Planificador</h2>
 </div>

 {/* — Últimos 7 días — */}
 <div className="flex items-center justify-between mb-2">
 <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>Últimos 7 días</p>
 <div className="text-right">
 <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Carga</p>
 <p className="text-[12px] font-bold" style={{ color: loadLevel.color }}>{loadLevel.label}</p>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-2">
 {last7Days.map((d, i) => {
 const emoji = d.hasActivity
 ? (ACTIVITY_TYPES[d.acts[0].type]?.emoji || '🏅')
 : d.hasPlan ? (ACTIVITY_TYPES[d.plans[0].activity_type]?.emoji || '🏅') : null;
 return (
 <div key={i} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => syncDayToCalendar(d.date)}>
 <span className="text-[9px] font-medium uppercase" style={{ color: TEXT_MUTED }}>{d.dayName}</span>
 <div
 className="w-full aspect-square rounded-lg flex flex-col items-center justify-center"
 style={d.hasActivity ? {
 background: DAY_PALETTE.completed.bg,
 boxShadow: DAY_PALETTE.completed.glow,
 } : d.hasPlan ? {
 background: DAY_PALETTE.planned.bg,
 boxShadow: DAY_PALETTE.planned.glow,
 } : d.isToday ? {
 background: 'rgba(42,26,17,0.14)',
 border: '1px solid rgba(42,26,17,0.22)',
 } : {
 background: 'rgba(42,26,17,0.07)',
 }}
 >
 <span className="text-[11px] font-semibold leading-none"
 style={{ color: d.hasActivity ? DAY_PALETTE.completed.text : d.hasPlan ? DAY_PALETTE.planned.text : d.isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}>
 {d.dayNum}
 </span>
 {emoji && <span className="text-[10px] leading-none mt-0.5">{emoji}</span>}
 </div>
 {d.hasActivity
 ? d.acts.map((act, idx) => {
 const s = getActivitySummary(act, ACTIVITY_TYPES);
 return s ? <DaySummaryDrop key={idx} summary={s} palette={DAY_PALETTE.completed} /> : null;
 })
 : d.hasPlan
 ? d.plans.map((plan, idx) => {
 const s = getPlanSummary(plan, ACTIVITY_TYPES);
 return s ? <DaySummaryDrop key={idx} summary={s} palette={DAY_PALETTE.planned} /> : null;
 })
 : null}
 </div>
 );
 })}
 </div>

 {/* Separador */}
 <div style={{ height: 1, background: 'rgba(42,26,17,0.1)', margin: '14px 0 12px' }} />

 {/* — Próximos 7 días — */}
 <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>Próximos 7 días</p>

 <div className="grid grid-cols-7 gap-2">
 {next7Days.map((d, i) => {
 const emoji = d.hasActivity
 ? (ACTIVITY_TYPES[d.acts[0].type]?.emoji || '🏅')
 : d.hasPlan ? (ACTIVITY_TYPES[d.plans[0].activity_type]?.emoji || '🏅') : null;
 return (
 <div key={i} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => syncDayToCalendar(d.date)}>
 <span className="text-[9px] font-medium uppercase" style={{ color: TEXT_MUTED }}>{d.dayName}</span>
 <div
 className="w-full aspect-square rounded-lg flex flex-col items-center justify-center"
 style={d.hasActivity ? {
 background: DAY_PALETTE.completed.bg,
 boxShadow: DAY_PALETTE.completed.glow,
 } : d.hasPlan ? {
 background: DAY_PALETTE.planned.bg,
 boxShadow: DAY_PALETTE.planned.glow,
 } : {
 background: 'rgba(42,26,17,0.07)',
 }}
 >
 <span className="text-[11px] font-semibold leading-none"
 style={{ color: d.hasActivity ? DAY_PALETTE.completed.text : d.hasPlan ? DAY_PALETTE.planned.text : 'rgba(42,26,17,0.45)' }}>
 {d.dayNum}
 </span>
 {emoji && <span className="text-[10px] leading-none mt-0.5">{emoji}</span>}
 </div>
 {d.hasActivity
 ? d.acts.map((act, idx) => {
 const s = getActivitySummary(act, ACTIVITY_TYPES);
 return s ? <DaySummaryDrop key={idx} summary={s} palette={DAY_PALETTE.completed} /> : null;
 })
 : d.hasPlan
 ? d.plans.map((plan, idx) => {
 const s = getPlanSummary(plan, ACTIVITY_TYPES);
 return s ? <DaySummaryDrop key={idx} summary={s} palette={DAY_PALETTE.planned} /> : null;
 })
 : null}
 </div>
 );
 })}
 </div>

 </div>

 {/* Carga de ejercicio */}
 <div className="rounded-2xl p-4" style={glassCard}>
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

 {/* Última semana + comparativa con la media habitual */}
 <div className="mb-3 flex items-baseline gap-3 flex-wrap">
 <div className="flex items-baseline gap-1.5">
 <span className="text-[28px] font-bold font-mono leading-none" style={{ color: TEXT_PRIMARY }}>
 {lastWeekHours}h
 </span>
 <span className="text-[10px]" style={{ color: TEXT_MUTED }}>
 últ. 7 días
 </span>
 </div>
 {lastWeekVsAvgPct !== null && (
 <div
 className="flex items-center gap-1 px-2 py-0.5 rounded-md"
 style={{
 background: lastWeekVsAvgPct >= 0 ? 'rgba(143,168,152,0.22)' : 'rgba(180,83,9,0.18)',
 }}
 >
 {lastWeekVsAvgPct >= 0
 ? <TrendingUp className="w-3 h-3" style={{ color: '#1c5838' }} />
 : <TrendingDown className="w-3 h-3" style={{ color: '#b45309' }} />}
 <span className="text-[10px] font-semibold" style={{ color: lastWeekVsAvgPct >= 0 ? '#1c5838' : '#b45309' }}>
 {lastWeekVsAvgPct >= 0 ? '+' : ''}{lastWeekVsAvgPct}% vs media
 </span>
 </div>
 )}
 {avgWeeklyHours > 0 && (
 <span className="text-[10px]" style={{ color: TEXT_MUTED }}>
 (media: {avgWeeklyHours}h/sem)
 </span>
 )}
 </div>

 <div className="h-[160px] -ml-2">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="cargaGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={actFilter === 'accumulated' ? '#2a121a' : (ACTIVITY_COLORS[actFilter] || '#2a121a')} stopOpacity="0.42" />
 <stop offset="100%" stopColor={actFilter === 'accumulated' ? '#2a121a' : (ACTIVITY_COLORS[actFilter] || '#2a121a')} stopOpacity="0.02" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,26,17,0.08)" vertical={false} />
 <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: TEXT_MUTED, fontWeight: 600 }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={0} />
 <YAxis
 tick={{ fontSize: 9, fill: TEXT_MUTED }}
 axisLine={false}
 tickLine={false}
 width={26}
 domain={yDomain}
 ticks={yTicks}
 tickFormatter={(v) => `${v}h`}
 />
 <Tooltip
 cursor={{ stroke: 'rgba(42,26,17,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
 content={(props) => {
 const payload = (props.payload || []).map(p => ({ ...p, tooltipName: 'Horas' }));
 return <ChartTooltip {...props} payload={payload} />;
 }}
 />

 {/* Línea horizontal discontinua: media habitual */}
 {referenceLineValue > 0 && (
 <ReferenceLine
 y={referenceLineValue}
 stroke="rgba(42,18,26,0.5)"
 strokeDasharray="4 4"
 strokeWidth={1}
 label={{
 value: `Media ${loadTF === 'weeks' ? referenceLineValue + 'h' : referenceLineValue + 'h/d'}`,
 position: 'insideTopRight',
 fill: 'rgba(42,18,26,0.65)',
 fontSize: 9,
 offset: 4,
 }}
 />
 )}

 {/* Área única que une los puntos. Dots prominentes en cada bucket. */}
 <Area
 type="monotone"
 dataKey="hours"
 stroke={actFilter === 'accumulated' ? '#2a121a' : (ACTIVITY_COLORS[actFilter] || '#2a121a')}
 strokeWidth={2.5}
 fill="url(#cargaGradient)"
 dot={{
 r: 3,
 fill: actFilter === 'accumulated' ? '#2a121a' : (ACTIVITY_COLORS[actFilter] || '#2a121a'),
 strokeWidth: 0,
 }}
 activeDot={{
 r: 5,
 fill: actFilter === 'accumulated' ? '#2a121a' : (ACTIVITY_COLORS[actFilter] || '#2a121a'),
 strokeWidth: 0,
 }}
 isAnimationActive={false}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>


 {/* Perfil + Calendario */}
 <div ref={calendarRef} className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 {avatarUrl ? (
 <img
 src={avatarUrl}
 alt={userName}
 className="w-11 h-11 rounded-xl object-cover"
 style={{ border: '1.5px solid rgba(42,26,17,0.18)' }}
 />
 ) : (
 <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[12px]"
 style={{ background: 'rgba(42,26,17,0.08)', border: '1.5px solid rgba(42,26,17,0.18)', color: '#2a1a11' }}>
 {initials}
 </div>
 )}
 <div>
 <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>{userName}</p>
 <p className="text-[12px]" style={{ color: TEXT_SECONDARY }}>{totalHours}h este mes</p>
 </div>
 </div>
 </div>

 <CalendarGrid year={year} month={month} activitiesByDate={activitiesByDate} plansByDayOfMonth={plansByDayOfMonth} onDayClick={handleDayClick} expandedDay={expandedDay} />

 <AnimatePresence>
 {expandedDay && activitiesByDate[expandedDay] && (
 <div exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5 overflow-hidden">
 {activitiesByDate[expandedDay].map(act => {
 return (
 <div key={act.id} className="rounded-xl px-3 py-2.5"
 style={{ background: 'rgba(42,26,17,0.07)', border: '1px solid rgba(42,26,17,0.1)' }}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
 <div className="min-w-0">
 <p className="text-[13px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
 </div>
 </div>
 <button onClick={e => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0">
 <Trash2 className="w-3.5 h-3.5 transition-colors" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>
 );
 })}
 <button onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
 className="w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] transition-colors"
 style={{ background: 'rgba(42,26,17,0.04)', border: '1px dashed rgba(42,26,17,0.18)', color: TEXT_MUTED }}>
 <Plus className="w-3.5 h-3.5" /> Añadir actividad
 </button>
 </div>
 )}
 </AnimatePresence>
 </div>

 {/* Favorito */}
 {favoriteType && (
 <div className="rounded-2xl px-4 py-3" style={glassCard}>
 <div className="flex items-center gap-2">
 <Sparkles className="w-4 h-4" style={{ color: '#4338ca' }} />
 <span className="text-[13px]" style={{ color: TEXT_SECONDARY }}>
 Favorito: <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{favoriteType.label?.toLowerCase()}</span> {favoriteType.emoji}
 </span>
 </div>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-3 gap-3">
 <StatBox icon={<TrendingUp className="w-4 h-4" style={{ color: '#3b82f6' }} />} value={`${totalAllTimeHours}h`} label="Total" />
 <StatBox icon={<Sparkles className="w-4 h-4" style={{ color: '#4338ca' }} />} value={`${totalHours}h`} label="Este mes" />
 <StatBox icon={<Target className="w-4 h-4" style={{ color: '#10b981' }} />} value={`${ritmo}%`} label="Ritmo" />
 </div>

 {/* FAB — usa el color del fondo de la app */}
 <button
 onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
 className="fixed bottom-24 right-5 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40"
 style={{
 background: '#2a121a',
 boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
 border: '1px solid rgba(245,237,224,0.18)',
 }}>
 <Plus className="w-5 h-5" style={{ color: 'rgba(245,237,224,0.95)' }} />
 </button>

 <LogActivityDialog
 isOpen={showLogDialog}
 onClose={() => setShowLogDialog(false)}
 onSubmit={createActivity}
 onSubmitPlan={addPlan}
 selectedDate={selectedDate}
 />
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

function DaySummaryDrop({ summary, palette, extraCount = 0 }) {
 if (!summary?.name) return null;
 const lineStyle = {
 width: 1,
 borderLeft: `1px dashed ${palette.line}`,
 alignSelf: 'stretch',
 };
 return (
 <div className="flex w-full" style={{ marginTop: 3 }}>
 <div style={lineStyle} />
 <div
 className="flex-1 flex flex-col justify-center"
 style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 2, paddingRight: 2, textAlign: 'center', lineHeight: 1.15, minWidth: 0 }}
 >
 <p style={{
 fontSize: 8.5,
 fontWeight: 600,
 color: palette.textOnSummary,
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 }}>
 {summary.name}
 </p>
 {summary.duration && (
 <p style={{
 fontSize: 8,
 fontWeight: 500,
 color: palette.textOnSummary,
 opacity: 0.78,
 }}>
 {summary.duration}
 </p>
 )}
 {extraCount > 0 && (
 <p style={{
 fontSize: 7.5,
 color: palette.textOnSummary,
 opacity: 0.6,
 }}>
 +{extraCount}
 </p>
 )}
 </div>
 <div style={lineStyle} />
 </div>
 );
}

function CalendarGrid({ year, month, activitiesByDate, plansByDayOfMonth = {}, onDayClick, expandedDay }) {
 const now = new Date();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 let startDow = new Date(year, month, 1).getDay() - 1;
 if (startDow < 0) startDow = 6;
 const trailing = [];
 for (let i = 0; i < startDow; i++) trailing.push(i);

 return (
 <div className="grid grid-cols-7 gap-[5px]">
 {trailing.map(i => (
 <div key={`p-${i}`} className="aspect-square" aria-hidden="true" />
 ))}
 {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
 const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
 const acts = activitiesByDate[day] || [];
 const has = acts.length > 0;
 const planned = plansByDayOfMonth[day] || [];
 const hasPlan = !has && planned.length > 0;
 const isExp = expandedDay === day;
 const emoji = has
 ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅')
 : (hasPlan ? (ACTIVITY_TYPES[planned[0].activity_type]?.emoji || '🏅') : null);
 return (
 <button key={day} onClick={() => onDayClick(day)}
 className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
 style={has
 ? isExp
 ? { background: DAY_PALETTE.completed.bgExpanded, boxShadow: '0 3px 10px rgba(122,149,131,0.4)', border: '1px solid rgba(255,255,255,0.25)' }
 : { background: DAY_PALETTE.completed.bg, boxShadow: DAY_PALETTE.completed.glow }
 : hasPlan
 ? { background: DAY_PALETTE.planned.bg, boxShadow: DAY_PALETTE.planned.glow }
 : isToday
 ? { background: 'rgba(42,26,17,0.14)', border: '1px solid rgba(42,26,17,0.22)' }
 : { background: 'rgba(42,26,17,0.07)' }
 }>
 <span className="text-[11px] font-semibold leading-none"
 style={{ color: has ? DAY_PALETTE.completed.text : hasPlan ? DAY_PALETTE.planned.text : isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}>
 {day}
 </span>
 {emoji && <span className="text-[10px] leading-none mt-0.5">{emoji}</span>}
 {acts.length > 1 && (
 <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
 style={{ background: '#fff', border: '1px solid rgba(42,26,17,0.1)' }}>
 <span className="text-[7px] font-bold" style={{ color: '#1c2620' }}>{acts.length}</span>
 </div>
 )}
 {!has && planned.length > 1 && (
 <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
 style={{ background: '#fff', border: '1px solid rgba(125,107,167,0.4)' }}>
 <span className="text-[7px] font-bold" style={{ color: DAY_PALETTE.planned.text }}>{planned.length}</span>
 </div>
 )}
 </button>
 );
 })}
 </div>
 );
}
