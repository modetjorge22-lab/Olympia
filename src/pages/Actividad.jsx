import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { useGoals } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Target, Sparkles, TrendingUp, TrendingDown, ChevronDown, Calendar, Trophy, Pencil, Check, X, Moon, Dumbbell } from 'lucide-react';
import { getActivitySummary, getPlanSummary, DAY_PALETTE } from '@/utils/dayDisplay';
import { useTheme } from '@/lib/theme';
import { DashedFrame, BrushMark } from '@/components/sketch';
import { MUSCLE_GROUPS, detectMuscleGroups } from '@/utils/muscles';

// Sección sobre el lienzo vino — sin marco, separada por hairline superior
const glassCard = {
 background: 'transparent',
 borderTop: '1px solid rgba(var(--ink),0.12)',
 borderRadius: 0,
 paddingLeft: 0,
 paddingRight: 0,
};

const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';
const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const TEXT_FAINT = 'rgba(var(--ink),0.30)';

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
 background: 'var(--surface)',
 border: '1px solid rgba(var(--ink),0.15)',
 borderRadius: 8, padding: '6px 9px', fontSize: 10,
 boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
 }}>
 <p style={{ color: 'rgba(var(--ink),0.55)', fontSize: 9, marginBottom: 2 }}>
 {headerText}
 </p>
 <p style={{ color: 'rgba(var(--ink),0.95)', fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
 {totalText}
 </p>
 {showBreakdown && items.map((entry, i) => (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: i === 0 ? 3 : 1 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <div style={{ width: 5, height: 5, borderRadius: 1, background: entry.color || entry.fill }} />
 <span style={{ color: 'rgba(var(--ink),0.7)', fontSize: 9 }}>{entry.tooltipName || entry.name}</span>
 </div>
 <span style={{ color: 'rgba(var(--ink),0.85)', fontWeight: 500, fontSize: 9 }}>{entry.value}h</span>
 </div>
 ))}
 </div>
 );
}

function singleBarColor(hours, maxHours, color) {
 if (hours === 0) return 'rgba(var(--ink),0.08)';
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

 const selColor = ACCENT;

 return (
 <div ref={ref} style={{ position: 'relative' }}>
 <button
 onClick={() => setOpen(o => !o)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
 style={{
 background: 'rgba(var(--ink),0.08)',
 border: '1px solid rgba(var(--ink),0.18)',
 color: TEXT_PRIMARY,
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
 background: 'var(--surface)',
 backdropFilter: 'blur(24px)',
 WebkitBackdropFilter: 'blur(24px)',
 border: '1px solid rgba(var(--ink),0.16)',
 borderRadius: 12, padding: 6,
 boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
 }}
 >
 <MenuItem active={value === 'accumulated'} dot={ACCENT} label="Acumulado"
 onClick={() => { onChange('accumulated'); setOpen(false); }} />

 {types.length > 0 && (
 <>
 <div style={{ height: 1, background: 'rgba(var(--ink),0.12)', margin: '4px 6px' }} />
 <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_MUTED, padding: '4px 8px 2px' }}>Por actividad</p>
 {types.map(t => (
 <MenuItem key={t.key} active={value === t.key} dot={ACCENT}
 label={`${t.emoji} ${t.label}`}
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
 background: color ? `${color}22` : 'rgba(var(--ink),0.12)',
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
 const { chart: CH } = useTheme();
 const { currentMonth, goToMonth } = useMonth();
 const { myProfile } = useTeamMembers();
 const calendarRef = useRef(null);
 const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
 const avatarUrl = myProfile?.avatar_url || null;
 const { myActivities, allActivities, createActivity, deleteActivity, updateActivity } = useActivities(currentMonth);
 const { plans: weeklyPlans, addPlan, removePlan } = useWeeklyPlans(currentMonth);
 const { goals, createGoal, updateMark, deleteGoal, refresh: refreshGoals } = useGoals();

 // PR achievements — fuente de verdad para colorear días
 const [prAchievements, setPrAchievements] = useState([]);
 const fetchPrAchievements = useCallback(async () => {
 if (!user?.email) return;
 const { data } = await supabase
 .from('pr_achievements')
 .select('*')
 .eq('user_email', user.email)
 .order('date', { ascending: false });
 if (data) setPrAchievements(data);
 }, [user?.email]);
 useEffect(() => { fetchPrAchievements(); }, [fetchPrAchievements]);

 // Datos de sueño de Whoop
 const [whoopSleepData, setWhoopSleepData] = useState([]);
 const [showSleep, setShowSleep] = useState(false);
 useEffect(() => {
 if (!user?.email) return;
 supabase
 .from('whoop_sleep')
 .select('date, duration_minutes')
 .eq('user_email', user.email)
 .then(({ data }) => { if (data) setWhoopSleepData(data); });
 }, [user?.email]);

 const [showLogDialog, setShowLogDialog] = useState(false);
 const [editActivity, setEditActivity] = useState(null);
 const [convertPlan, setConvertPlan] = useState(null);
 const [selectedDate, setSelectedDate] = useState(new Date());
 const [expandedDay, setExpandedDay] = useState(null);
 const loadTF = 'weeks'; // vista fija semanal (se eliminó el toggle de días)
 const [actFilter, setActFilter] = useState('accumulated');

 // ── Metas / Marcas personales ──
 const [showGoalForm, setShowGoalForm] = useState(false);
 const [goalTitle, setGoalTitle] = useState('');
 const [goalUnit, setGoalUnit] = useState('');
 const [goalValue, setGoalValue] = useState('');
 const [goalActivityType, setGoalActivityType] = useState('');
 const [editingMarkId, setEditingMarkId] = useState(null);
 const [editingMarkValue, setEditingMarkValue] = useState('');

 // Cuando se bate una marca desde el diálogo de actividad
 const handlePrBeaten = async (prArray, date) => {
 for (const { goalId, newValue } of prArray) {
 if (newValue !== '' && newValue != null) {
 await updateMark(goalId, Number(newValue), date);
 }
 }
 // Actualizar la lista de achievements para colorear el día inmediatamente
 fetchPrAchievements();
 };

 // Borrar un PR achievement (revierte el color del día y la marca del goal si procede)
 const deletePrAchievement = async (prId) => {
 const pr = prAchievements.find(p => p.id === prId);
 if (!pr) return;
 await supabase.from('pr_achievements').delete().eq('id', prId);
 const remaining = prAchievements.filter(p => p.id !== prId);
 setPrAchievements(remaining);
 // Revertir el goal: buscar el PR más reciente restante para este goal
 const goalRemaining = remaining.filter(p => p.goal_id === pr.goal_id);
 if (goalRemaining.length === 0) {
 // Sin más PRs → limpiar pb_date y volver a la marca anterior
 await supabase.from('goals').update({ pb_date: null, current_value: pr.old_value ?? null }).eq('id', pr.goal_id);
 } else {
 const latest = [...goalRemaining].sort((a, b) => b.date.localeCompare(a.date))[0];
 await supabase.from('goals').update({ pb_date: latest.date, current_value: latest.new_value }).eq('id', pr.goal_id);
 }
 refreshGoals();
 };

 // Crear meta desde el formulario inline
 const handleCreateGoal = async () => {
 if (!goalTitle.trim()) return;
 await createGoal({
 title: goalTitle,
 unit: goalUnit,
 current_value: goalValue !== '' ? Number(goalValue) : null,
 activity_type: goalActivityType || null,
 });
 setGoalTitle(''); setGoalUnit(''); setGoalValue(''); setGoalActivityType('');
 setShowGoalForm(false);
 };

 // Guardar actualización manual de marca
 const handleSaveEditMark = async (goalId) => {
 if (editingMarkValue === '') return;
 await updateMark(goalId, Number(editingMarkValue), new Date().toISOString().slice(0, 10));
 setEditingMarkId(null);
 setEditingMarkValue('');
 };

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

 // Volumen de fuerza por grupo muscular (mes navegado).
 // Prioridad: grupos elegidos por el usuario (muscle_groups) → detección
 // por palabras clave (push/pull/términos exactos) → sin clasificar.
 const muscleData = useMemo(() => {
 const hours = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, 0]));
 let unmatchedMins = 0;
 let strengthCount = 0;
 myActivities.filter(a => a.type === 'strength_training').forEach(a => {
 strengthCount++;
 const explicit = Array.isArray(a.muscle_groups) ? a.muscle_groups.filter(k => k in hours) : [];
 const keys = explicit.length > 0
 ? explicit
 : detectMuscleGroups(`${a.title || ''} ${a.description || ''} ${a.progress_note || ''}`);
 const mins = a.duration_minutes || 0;
 if (keys.length === 0) { unmatchedMins += mins; return; }
 keys.forEach(k => { hours[k] += mins / keys.length / 60; });
 });
 return {
 data: MUSCLE_GROUPS.map(g => ({ label: g.label, hours: +hours[g.key].toFixed(1) })),
 unmatchedH: +(unmatchedMins / 60).toFixed(1),
 strengthCount,
 };
 }, [myActivities]);

 const padelWinRate = useMemo(() => {
 const games = myAllActivities.filter(a => a.type === 'padel' && a.match_result?.result);
 if (games.length === 0) return null;
 const wins = games.filter(a => a.match_result.result === 'win').length;
 return { wins, total: games.length, rate: Math.round((wins / games.length) * 100) };
 }, [myAllActivities]);

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

 // Helper reutilizable para calcular horas en un rango de fechas
 const computeHours = useCallback((startStr, endStr) => {
 const acts = myAllActivities.filter(a => {
 const ds = a.date?.slice(0, 10);
 return ds >= startStr && ds <= endStr;
 });
 if (actFilter === 'accumulated') return +(acts.reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1);
 return +(acts.filter(a => a.type === actFilter).reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1);
 }, [myAllActivities, actFilter]);

 const weeklyData = useMemo(() => {
 const today = new Date();
 today.setHours(23, 59, 59, 999);
 return Array.from({ length: 16 }, (_, i) => {
 const w = 15 - i;
 const end = new Date(today); end.setDate(today.getDate() - w * 7);
 const start = new Date(end); start.setDate(end.getDate() - 6);
 const startStr = toDateStr(start); const endStr = toDateStr(end);
 // Mostrar etiqueta solo si la semana empieza en los primeros 7 días del mes
 // (= primera semana real de ese mes en el gráfico)
 const showLabel = start.getDate() <= 7;
 // Media de horas de sueño por noche en esta semana
 const sleepInWeek = whoopSleepData.filter(s => s.date >= startStr && s.date <= endStr);
 const sleepHours = sleepInWeek.length > 0
 ? +(sleepInWeek.reduce((s, r) => s + (r.duration_minutes || 0), 0) / sleepInWeek.length / 60).toFixed(1)
 : null;
 return {
 label: `${start.getDate()}/${start.getMonth() + 1}`,
 monthLabel: showLabel ? MONTH_LABELS_SHORT[start.getMonth()] : '',
 intervalLabel: `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]}`,
 hours: computeHours(startStr, endStr),
 sleepHours,
 };
 });
 }, [myAllActivities, actFilter, computeHours, whoopSleepData]);

 const dailyData = useMemo(() => {
 const today = new Date();
 let lastMonth = -1;
 let lastLabelIdx = -10;
 return Array.from({ length: 60 }, (_, i) => {
 const d = 59 - i;
 const date = new Date(today); date.setDate(today.getDate() - d);
 const startStr = toDateStr(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
 const isNewMonth = date.getMonth() !== lastMonth;
 lastMonth = date.getMonth();
 const showLabel = isNewMonth && (i - lastLabelIdx >= 10);
 if (showLabel) lastLabelIdx = i;
 const sleepRecord = whoopSleepData.find(s => s.date === startStr);
 const sleepHours = sleepRecord ? +(sleepRecord.duration_minutes / 60).toFixed(1) : null;
 return {
 label: `${date.getDate()}/${date.getMonth() + 1}`,
 monthLabel: showLabel ? MONTH_LABELS_SHORT[date.getMonth()] : '',
 intervalLabel: `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getFullYear()}`,
 hours: computeHours(startStr, startStr),
 sleepHours,
 };
 });
 }, [myAllActivities, actFilter, computeHours, whoopSleepData]);

 const chartData = loadTF === 'weeks' ? weeklyData : dailyData;
 const maxHours = Math.max(
 ...chartData.map(d => d.hours || 0),
 ...(showSleep ? chartData.map(d => d.sleepHours || 0) : []),
 0.5
 );
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
 const hasActs = !!activitiesByDate[day]?.length;
 const hasPlans = !!plansByDayOfMonth[day]?.length;
 if (hasActs || hasPlans) setExpandedDay(expandedDay === day ? null : day);
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
 return { label: last7Hours > 0 ? 'Media' : 'Sin datos', color: 'rgba(var(--ink),0.55)', hours: last7Hours };
 }
 const avg = weekSums.reduce((s, h) => s + h, 0) / weekSums.length;
 // ±20% considerado "media"
 if (last7Hours > avg * 1.2) return { label: 'Alta', color: 'var(--success)', hours: last7Hours, avg };
 if (last7Hours < avg * 0.8) return { label: 'Baja', color: 'var(--warning)', hours: last7Hours, avg };
 return { label: 'Media', color: 'rgba(var(--ink),0.75)', hours: last7Hours, avg };
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

 // Set de fechas PR (fuente: pr_achievements, no goals.pb_date)
 const prDates = useMemo(() => {
 const set = new Set();
 prAchievements.forEach(pr => { if (pr.date) set.add(pr.date); });
 return set;
 }, [prAchievements]);

 // Map date → lista de PR achievements (para el día expandido)
 const prAchievementsByDate = useMemo(() => {
 const map = {};
 prAchievements.forEach(pr => {
 if (!map[pr.date]) map[pr.date] = [];
 map[pr.date].push(pr);
 });
 return map;
 }, [prAchievements]);

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
 {/* Mi Actividad — gráfica de carga */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
 style={{ background: 'rgba(var(--ink),0.12)', border: '1px solid rgba(var(--ink),0.16)' }}>
 <TrendingUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Mi Actividad</h2>
 <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
 Últimas 16 semanas · {chartSubtitle}
 </p>
 </div>
 </div>

 </div>

 <div className="mb-3 flex items-center gap-2">
 <ActivityDropdown value={actFilter} onChange={setActFilter} types={usedTypes} />
 <button
 onClick={() => setShowSleep(s => !s)}
 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0"
 style={showSleep ? {
 background: 'rgba(16,185,129,0.18)',
 border: '1px solid rgba(16,185,129,0.4)',
 color: 'var(--success)',
 } : {
 background: 'rgba(var(--ink),0.08)',
 border: '1px solid rgba(var(--ink),0.14)',
 color: TEXT_MUTED,
 }}>
 <Moon className="w-3 h-3" />
 Descanso
 </button>
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
 background: lastWeekVsAvgPct >= 0 ? 'rgba(52,211,153,0.14)' : 'rgba(251,191,36,0.14)',
 }}
 >
 {lastWeekVsAvgPct >= 0
 ? <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} />
 : <TrendingDown className="w-3 h-3" style={{ color: 'var(--warning)' }} />}
 <span className="text-[10px] font-semibold" style={{ color: lastWeekVsAvgPct >= 0 ? 'var(--success)' : 'var(--warning)' }}>
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

 {/* user-select:none previene la selección de texto nativa en long-press */}
 <div className="h-[160px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="cargaGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={CH.accent} stopOpacity="0.5" />
 <stop offset="100%" stopColor={CH.accent} stopOpacity="0.08" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 {/* minTickGap evita que las etiquetas de mes se solapen en móvil */}
 <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: CH.tick, fontWeight: 600 }} axisLine={{ stroke: CH.axis }} tickLine={false} interval={0} minTickGap={18} />
 <YAxis
 tick={{ fontSize: 9, fill: CH.tick }}
 axisLine={false}
 tickLine={false}
 width={26}
 domain={yDomain}
 ticks={yTicks}
 tickFormatter={(v) => `${v}h`}
 />
 <Tooltip
 cursor={{ stroke: CH.cursor, strokeWidth: 1, strokeDasharray: '3 3' }}
 content={(props) => {
 const payload = (props.payload || []).map(p => ({
 ...p,
 tooltipName: p.dataKey === 'sleepHours' ? 'Sueño/noche' : 'Entrenamiento',
 }));
 return <ChartTooltip {...props} payload={payload} />;
 }}
 />

 {/* Área de sueño — detrás del ejercicio */}
 {showSleep && (
 <Area
 type="monotone"
 dataKey="sleepHours"
 stroke="rgba(16,185,129,0.5)"
 strokeWidth={1}
 fill="rgba(16,185,129,0.18)"
 dot={false}
 activeDot={{ r: 4, fill: 'rgba(16,185,129,0.7)', strokeWidth: 0 }}
 isAnimationActive={false}
 connectNulls={false}
 name="Sueño"
 />
 )}

 {/* Área principal: período actual con puntos */}
 <Area
 type="monotone"
 dataKey="hours"
 stroke={CH.accent}
 strokeWidth={2.5}
 fill="url(#cargaGradient)"
 dot={{
 r: 3,
 fill: CH.accent,
 strokeWidth: 0,
 }}
 activeDot={{
 r: 5,
 fill: CH.accent,
 strokeWidth: 0,
 }}
 isAnimationActive={false}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 {/* Calendario — mismo marco que la gráfica, comparte el filtro de actividad */}
 <div ref={calendarRef} className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(var(--ink),0.08)' }}>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2.5">
 {avatarUrl ? (
 <img
 src={avatarUrl}
 alt={userName}
 className="w-8 h-8 rounded-full object-cover"
 style={{ border: '1.5px solid rgba(var(--ink),0.22)' }}
 />
 ) : (
 <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1.5px solid rgba(var(--ink),0.22)', color: TEXT_PRIMARY }}>
 {initials}
 </div>
 )}
 <div>
 <p className="text-[13px] font-semibold leading-tight" style={{ color: TEXT_PRIMARY }}>{userName}</p>
 <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>{totalHours}h este mes</p>
 </div>
 </div>
 {/* Mes visible — refuerza que esto es un calendario */}
 <span className="text-[11px] font-bold" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'rgba(var(--accent-rgb),0.8)' }}>
 {MONTH_NAMES_SHORT[month]} {year}
 </span>
 </div>

 <CalendarGrid year={year} month={month} activitiesByDate={activitiesByDate} plansByDayOfMonth={plansByDayOfMonth} prDates={prDates} onDayClick={handleDayClick} expandedDay={expandedDay} filterType={actFilter === 'accumulated' ? null : actFilter} />

 <AnimatePresence>
 {expandedDay && (activitiesByDate[expandedDay]?.length || plansByDayOfMonth[expandedDay]?.length) && (
 <div exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5 overflow-hidden">

 {/* Actividades realizadas */}
 {(activitiesByDate[expandedDay] || []).map(act => (
 <div key={act.id} className="rounded-xl px-3 py-2.5"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.12)' }}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="text-[15px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
 <div className="min-w-0">
 <p className="text-[13px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{ACTIVITY_TYPES[act.type]?.label || act.type}</p>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{act.duration_minutes} min{act.description ? ` · ${act.description}` : ''}</p>
 </div>
 </div>
 <div className="flex items-center gap-0.5 flex-shrink-0">
 <button onClick={e => { e.stopPropagation(); setEditActivity(act); }} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
 <Pencil className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
 </button>
 <button onClick={e => { e.stopPropagation(); deleteActivity(act.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
 <Trash2 className="w-3.5 h-3.5 transition-colors" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>
 </div>
 ))}

 {/* Entrenamientos planificados */}
 {(plansByDayOfMonth[expandedDay] || []).map(plan => (
 <div key={plan.id} className="rounded-xl px-3 py-2.5"
 style={{ background: DAY_PALETTE.planned.bg === 'transparent' ? 'rgba(var(--ink),0.05)' : DAY_PALETTE.planned.bg, border: '1.5px solid rgba(var(--ink),0.28)' }}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="text-[15px]">{ACTIVITY_TYPES[plan.activity_type]?.emoji || '📅'}</span>
 <div className="min-w-0">
 <p className="text-[13px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>
 {ACTIVITY_TYPES[plan.activity_type]?.label || plan.activity_type}
 <span className="ml-1.5 text-[10px] font-normal" style={{ color: TEXT_MUTED }}>planificado</span>
 </p>
 {plan.notes && <p className="text-[11px] truncate" style={{ color: TEXT_MUTED }}>{plan.notes}</p>}
 {plan.duration_minutes > 0 && <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{plan.duration_minutes} min</p>}
 </div>
 </div>
 <div className="flex items-center gap-0.5 flex-shrink-0">
 <button onClick={e => { e.stopPropagation(); setConvertPlan(plan); }} title="Marcar como realizada" className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
 <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} />
 </button>
 <button onClick={e => { e.stopPropagation(); removePlan(plan.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
 <Trash2 className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>
 </div>
 ))}

 {/* PR achievements del día — borrables */}
 {(() => {
 const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(expandedDay).padStart(2,'0')}`;
 return (prAchievementsByDate[ds] || []).map(pr => (
 <div key={pr.id} className="rounded-xl px-3 py-2.5"
 style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5 min-w-0">
 <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />
 <div className="min-w-0">
 <p className="text-[12px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{pr.goal_title}</p>
 <p className="text-[11px]" style={{ color: ACCENT }}>
 {pr.old_value != null ? `${pr.old_value} → ` : ''}{pr.new_value} {pr.unit}
 </p>
 </div>
 </div>
 <button onClick={e => { e.stopPropagation(); deletePrAchievement(pr.id); }}
 className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0">
 <Trash2 className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>
 ));
 })()}

 <button onClick={() => { setSelectedDate(new Date(year, month, expandedDay)); setShowLogDialog(true); }}
 className="w-full rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] transition-colors"
 style={{ background: 'rgba(var(--ink),0.05)', border: '1px dashed rgba(var(--ink),0.22)', color: TEXT_MUTED }}>
 <Plus className="w-3.5 h-3.5" /> Añadir actividad
 </button>
 </div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* ── Planificador ── */}
 <div className="rounded-2xl p-4" style={glassCard}>

 {/* Cabecera del card */}
 <div className="flex items-center gap-2.5 mb-2">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--ink),0.12)', border: '1px solid rgba(var(--ink),0.16)' }}>
 <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Planificador</h2>
 </div>

 {/* — Últimos 7 días — */}
 <div className="flex items-center justify-between mb-1">
 <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>Últimos 7 días</p>
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Carga</span>
 <span className="text-[12px] font-bold" style={{ color: loadLevel.color }}>{loadLevel.label}</span>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-2">
 {last7Days.map((d, i) => {
 const ds = toDateStr(d.date);
 const isPR = prDates.has(ds);
 const emoji = isPR ? '🏆'
 : d.hasActivity ? (ACTIVITY_TYPES[d.acts[0].type]?.emoji || '🏅')
 : d.hasPlan ? (ACTIVITY_TYPES[d.plans[0].activity_type]?.emoji || '🏅') : null;
 return (
 <div key={i} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => syncDayToCalendar(d.date)}>
 <span className="text-[9px] font-medium uppercase" style={{ color: TEXT_MUTED }}>{d.dayName}</span>
 <div className="w-9 h-9 rounded-full flex items-center justify-center"
 style={isPR ? { background: DAY_PALETTE.pr.bg, boxShadow: DAY_PALETTE.pr.glow }
 : d.hasActivity ? { background: DAY_PALETTE.completed.bg, boxShadow: DAY_PALETTE.completed.glow }
 : d.hasPlan ? { background: DAY_PALETTE.planned.bg, boxShadow: DAY_PALETTE.planned.glow }
 : d.isToday ? { background: 'transparent', border: '1.5px solid rgba(var(--accent-rgb),0.9)' }
 : { background: 'rgba(var(--ink),0.07)' }}
 >
 {emoji ? (
 <span className="text-[10px] leading-none">{emoji}</span>
 ) : (
 <span className="text-[11px] font-semibold leading-none"
 style={{ color: d.isToday ? TEXT_PRIMARY : 'rgba(var(--ink),0.4)' }}>
 {d.dayNum}
 </span>
 )}
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
 <div style={{ height: 1, background: 'rgba(var(--ink),0.12)', margin: '14px 0 12px' }} />

 {/* — Próximos 7 días — */}
 <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: TEXT_MUTED }}>Próximos 7 días</p>

 <div className="grid grid-cols-7 gap-2">
 {next7Days.map((d, i) => {
 const ds = toDateStr(d.date);
 const isPR = prDates.has(ds);
 const emoji = isPR ? '🏆'
 : d.hasActivity ? (ACTIVITY_TYPES[d.acts[0].type]?.emoji || '🏅')
 : d.hasPlan ? (ACTIVITY_TYPES[d.plans[0].activity_type]?.emoji || '🏅') : null;
 return (
 <div key={i} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => syncDayToCalendar(d.date)}>
 <span className="text-[9px] font-medium uppercase" style={{ color: TEXT_MUTED }}>{d.dayName}</span>
 <div className="w-9 h-9 rounded-full flex items-center justify-center"
 style={isPR ? { background: DAY_PALETTE.pr.bg, boxShadow: DAY_PALETTE.pr.glow }
 : d.hasActivity ? { background: DAY_PALETTE.completed.bg, boxShadow: DAY_PALETTE.completed.glow }
 : d.hasPlan ? { background: DAY_PALETTE.planned.bg, boxShadow: DAY_PALETTE.planned.glow }
 : { background: 'rgba(var(--ink),0.07)' }}
 >
 {emoji ? (
 <span className="text-[10px] leading-none">{emoji}</span>
 ) : (
 <span className="text-[11px] font-semibold leading-none" style={{ color: 'rgba(var(--ink),0.4)' }}>
 {d.dayNum}
 </span>
 )}
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
 {/* Buffer para drops de dobles entrenos */}
 <div style={{ minHeight: 12 }} />

 </div>


 {/* ── Metas / Marcas personales ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--ink),0.12)', border: '1px solid rgba(var(--ink),0.16)' }}>
 <Trophy className="w-3 h-3" style={{ color: TEXT_PRIMARY }} />
 </div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Metas</h2>
 </div>
 <button
 onClick={() => setShowGoalForm(v => !v)}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.14)', color: TEXT_PRIMARY }}>
 <Plus className="w-3 h-3" /> Nueva
 </button>
 </div>

 {/* Formulario nueva meta */}
 {showGoalForm && (
 <div className="rounded-xl p-3 mb-3 space-y-2"
 style={{ background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.14)' }}>
 <input
 type="text"
 placeholder="Nombre de la meta (ej: Press banca 1RM)"
 value={goalTitle}
 onChange={e => setGoalTitle(e.target.value)}
 className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
 />
 <div className="flex gap-2">
 <input
 type="number"
 placeholder="Marca actual"
 value={goalValue}
 onChange={e => setGoalValue(e.target.value)}
 className="flex-1 rounded-lg px-3 py-2 text-[12px] focus:outline-none"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
 />
 <input
 type="text"
 placeholder="Unidad (kg, min…)"
 value={goalUnit}
 onChange={e => setGoalUnit(e.target.value)}
 className="w-[100px] rounded-lg px-3 py-2 text-[12px] focus:outline-none"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
 />
 </div>
 <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
 <button
 onClick={() => setGoalActivityType('')}
 className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium"
 style={goalActivityType === '' ? { background: ACCENT, color: ON_ACCENT } : { background: 'rgba(var(--ink),0.07)', color: TEXT_MUTED }}>
 General
 </button>
 {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
 <button
 key={key}
 onClick={() => setGoalActivityType(key)}
 className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium"
 style={goalActivityType === key ? { background: ACCENT, color: ON_ACCENT } : { background: 'rgba(var(--ink),0.07)', color: TEXT_MUTED }}>
 <span>{emoji}</span>{label}
 </button>
 ))}
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleCreateGoal}
 disabled={!goalTitle.trim()}
 className="flex-1 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-40"
 style={{ background: ACCENT, color: ON_ACCENT }}>
 Guardar meta
 </button>
 <button
 onClick={() => setShowGoalForm(false)}
 className="px-4 py-2 rounded-lg text-[12px]"
 style={{ background: 'rgba(var(--ink),0.08)', color: TEXT_MUTED }}>
 Cancelar
 </button>
 </div>
 </div>
 )}

 {/* Lista de metas */}
 {goals.length === 0 && !showGoalForm ? (
 <p className="text-[12px] text-center py-3" style={{ color: TEXT_MUTED }}>
 Añade tu primera marca personal
 </p>
 ) : (
 <div className="space-y-2">
 {goals.map(goal => (
 <div key={goal.id} className="rounded-xl px-3 py-2.5"
 style={{ background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.1)' }}>
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <p className="text-[13px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{goal.title}</p>
 <div className="flex items-baseline gap-1.5 mt-0.5">
 {goal.current_value != null ? (
 <>
 <span className="text-[20px] font-bold font-mono leading-none" style={{ color: ACCENT }}>
 {goal.current_value}
 </span>
 <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{goal.unit}</span>
 {goal.pb_date && (
 <span className="text-[10px]" style={{ color: TEXT_MUTED }}>
 · {new Date(goal.pb_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
 </span>
 )}
 </>
 ) : (
 <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Sin marca registrada</span>
 )}
 </div>
 {goal.activity_type && (
 <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>
 {ACTIVITY_TYPES[goal.activity_type]?.emoji} {ACTIVITY_TYPES[goal.activity_type]?.label}
 </p>
 )}
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 <button
 onClick={() => { setEditingMarkId(goal.id); setEditingMarkValue(''); }}
 className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
 <Pencil className="w-3 h-3" style={{ color: ACCENT }} />
 </button>
 <button
 onClick={() => deleteGoal(goal.id)}
 className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)' }}>
 <Trash2 className="w-3 h-3" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>

 {/* Edición inline de marca */}
 {editingMarkId === goal.id && (
 <div className="flex gap-2 mt-2 items-center">
 <input
 type="number"
 autoFocus
 placeholder={`Nueva marca${goal.unit ? ` (${goal.unit})` : ''}`}
 value={editingMarkValue}
 onChange={e => setEditingMarkValue(e.target.value)}
 className="flex-1 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--accent-rgb),0.4)', color: TEXT_PRIMARY }}
 />
 <button
 onClick={() => handleSaveEditMark(goal.id)}
 disabled={editingMarkValue === ''}
 className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40"
 style={{ background: ACCENT }}>
 <Check className="w-3.5 h-3.5" style={{ color: ON_ACCENT }} />
 </button>
 <button
 onClick={() => setEditingMarkId(null)}
 className="w-8 h-8 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--ink),0.08)' }}>
 <X className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── Fuerza — volumen por grupo muscular ── */}
 {muscleData.strengthCount > 0 && (
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(var(--ink),0.12)', border: '1px solid rgba(var(--ink),0.16)' }}>
 <Dumbbell className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Fuerza</h2>
 <p className="text-[10px]" style={{ color: TEXT_MUTED }}>Horas por grupo muscular · según tus descripciones</p>
 </div>
 </div>
 <div className="h-[230px]" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart data={muscleData.data} cx="50%" cy="50%" outerRadius="72%">
 <PolarGrid stroke={CH.grid} />
 <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: CH.tick }} />
 <Radar dataKey="hours" stroke={CH.accent} strokeWidth={2} fill={CH.accent} fillOpacity={0.25} isAnimationActive={false} />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 {muscleData.unmatchedH > 0 && (
 <p className="text-[10px] text-center" style={{ color: TEXT_MUTED }}>
 {muscleData.unmatchedH}h sin clasificar — menciona el grupo muscular en la descripción para desglosarlas
 </p>
 )}
 </div>
 )}

 {/* Favorito */}
 {favoriteType && (
 <div className="rounded-2xl px-4 py-3" style={glassCard}>
 <div className="flex items-center gap-2">
 <Sparkles className="w-4 h-4" style={{ color: 'var(--info)' }} />
 <span className="text-[13px]" style={{ color: TEXT_SECONDARY }}>
 Favorito: <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{favoriteType.label?.toLowerCase()}</span> {favoriteType.emoji}
 </span>
 </div>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-3 gap-3">
 <StatBox
 icon={<span className="text-[16px]">🏓</span>}
 value={padelWinRate !== null ? `${padelWinRate.rate}%` : '—'}
 label="Win rate"
 sub={padelWinRate ? `${padelWinRate.wins}/${padelWinRate.total}` : 'Pádel'}
 />
 <StatBox icon={<Sparkles className="w-4 h-4" style={{ color: 'var(--info)' }} />} value={`${totalHours}h`} label="Este mes" />
 <StatBox icon={<Target className="w-4 h-4" style={{ color: '#10b981' }} />} value={`${ritmo}%`} label="Ritmo" />
 </div>

 {/* FAB — usa el color del fondo de la app */}
 <button
 onClick={() => { setSelectedDate(new Date()); setShowLogDialog(true); }}
 className="fixed bottom-24 right-5 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40"
 style={{
 background: ACCENT,
 boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
 }}>
 <Plus className="w-5 h-5" style={{ color: ON_ACCENT }} />
 </button>

 <LogActivityDialog
 isOpen={showLogDialog || !!editActivity || !!convertPlan}
 onClose={() => { setShowLogDialog(false); setEditActivity(null); setConvertPlan(null); }}
 onSubmit={async (data) => { await createActivity(data); if (convertPlan) { await removePlan(convertPlan.id); setConvertPlan(null); } }}
 onSubmitPlan={addPlan}
 onUpdate={updateActivity}
 editActivity={editActivity}
 prefillPlan={convertPlan}
 selectedDate={selectedDate}
 goals={goals}
 onPrBeaten={handlePrBeaten}
 />
 </div>
 );
}

function StatBox({ icon, value, label, sub }) {
 return (
 <div className="rounded-2xl p-4 flex flex-col items-center" style={glassCard}>
 {icon}
 <span className="text-[22px] font-bold font-mono mt-1.5" style={{ color: TEXT_PRIMARY }}>{value}</span>
 <span className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>{label}</span>
 {sub && <span className="text-[9px]" style={{ color: TEXT_MUTED }}>{sub}</span>}
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

function CalendarGrid({ year, month, activitiesByDate, plansByDayOfMonth = {}, prDates = new Set(), onDayClick, expandedDay, filterType = null }) {
 const now = new Date();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 let startDow = new Date(year, month, 1).getDay() - 1;
 if (startDow < 0) startDow = 6;
 const trailing = [];
 for (let i = 0; i < startDow; i++) trailing.push(i);

 return (
 <>
  <div className="grid grid-cols-7 gap-x-[5px] gap-y-1.5">
 {/* Iniciales de la semana — deja claro que es un calendario */}
 {['L','M','X','J','V','S','D'].map(d => (
 <span key={`dow-${d}`} className="text-center text-[8px] font-semibold"
 style={{ fontFamily: '"JetBrains Mono", monospace', color: 'rgba(var(--accent-rgb),0.55)' }}>
 {d}
 </span>
 ))}
 {trailing.map(i => (
 <div key={`p-${i}`} className="w-8 h-8 mx-auto" aria-hidden="true" />
 ))}
 {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
 const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
 const acts = activitiesByDate[day] || [];
 const has = acts.length > 0;
 const matchesFilter = !filterType || acts.some(a => a.type === filterType);
 const show = has && matchesFilter;
 const matchCount = filterType ? acts.filter(a => a.type === filterType).length : acts.length;
 const planned = plansByDayOfMonth[day] || [];
 const showPlan = !has && planned.length > 0 && !filterType;
 const isExp = expandedDay === day;
 const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const isFuture = new Date(year, month, day) > now;
 const isPR = prDates.has(dateStr) && matchesFilter;
 const emoji = isPR ? '🏆'
 : show ? (ACTIVITY_TYPES[filterType || acts[0].type]?.emoji || '🏅')
 : showPlan ? (ACTIVITY_TYPES[planned[0].activity_type]?.emoji || '🏅')
 : null;
 return (
 <button key={day} onClick={() => onDayClick(day)}
 className="w-8 h-8 mx-auto flex items-center justify-center transition-all relative"
 style={isToday ? { border: '1.5px solid rgba(var(--accent-rgb),0.9)', borderRadius: 8 } : {}}>
 {!isToday && (
 <DashedFrame
 color={showPlan ? 'rgba(var(--accent-rgb),0.9)' : undefined}
 opacity={isFuture ? 0.22 : 0.45}
 />
 )}
 <span className="text-[9px] font-semibold leading-none"
 style={{ fontFamily: '"JetBrains Mono", monospace', color: showPlan ? 'rgba(var(--accent-rgb),0.95)' : isToday ? TEXT_PRIMARY : `rgba(var(--accent-rgb),${isFuture ? 0.4 : 0.8})` }}>
 {day}
 </span>
 {(show || isPR) && <BrushMark opacity={isExp ? 1 : 0.92} />}
 {isPR && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, lineHeight: 1 }}>🏆</span>}
 {show && matchCount > 1 && (
 <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
 style={{ background: '#fff', border: '1px solid rgba(var(--ink),0.12)' }}>
 <span className="text-[7px] font-bold" style={{ color: '#1c2620' }}>{matchCount}</span>
 </div>
 )}
 {showPlan && planned.length > 1 && (
 <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
 style={{ background: '#fff', border: '1px solid rgba(125,107,167,0.4)' }}>
 <span className="text-[7px] font-bold" style={{ color: DAY_PALETTE.planned.text }}>{planned.length}</span>
 </div>
 )}
 </button>
 );
 })}
 </div>
 </>
 );
}
