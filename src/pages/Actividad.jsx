import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useMonth } from '@/lib/MonthContext';
import LogActivityDialog from '@/components/LogActivityDialog';
import { useGoals } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronDown, X, ChevronUp, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { MUSCLE_GROUPS, detectMuscleGroups } from '@/utils/muscles';
import { buildSeasonalSeries, formatHours } from '@/utils/seasonal';
import { TrainingSection, MonthScroller, toDateStr as tcDateStr } from '@/components/TrainingCalendar';
import MuscleLoad from '@/components/MuscleLoad';
import DayDetailSheet from '@/components/DayDetailSheet';
import GoalsSection from '@/components/GoalsSection';
import ObjectivesPanel from '@/components/ObjectivesPanel';
import { useObjectives } from '@/hooks/useObjectives';
import { useDiet } from '@/hooks/useDiet';
import { SleepWeeklyCard, SleepNightCard, buildNightPoints, fmtH } from '@/components/SleepCards';
import { DietDayRow, DietSheetHost, DietSettingsRow, useDietSheet } from '@/components/DietPanel';

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

// Títulos de sección — misma voz que la marca Olympia: DM Sans regular,
// espaciado suave, en minúsculas, sin negrita ni iconos.
const SECTION_TITLE = {
 fontFamily: '"DM Sans", system-ui, sans-serif',
 fontWeight: 400,
 fontSize: 13,
 letterSpacing: '0.14em',
 textTransform: 'none',
 // Valor literal: esta constante se declara antes que TEXT_PRIMARY y
 // referenciarla aquí rompería el módulo en tiempo de carga (TDZ).
 color: 'rgba(var(--ink),0.95)',
};

// Barra tipo liquid glass para controles
const glassBar = {
 background: 'var(--glass-bg)',
 border: '1px solid var(--glass-border)',
};
const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const TEXT_FAINT = 'rgba(var(--ink),0.30)';


// Tarjetas reordenables de «Tus gráficas». Sueño y noche solo con datos de WHOOP.
const CARD_KEYS = ['ritmo', 'fuerza', 'sueno', 'noche'];

function ChartTooltip({ active, payload, label, labelPrefix, extra = null }) {
 if (!active || !payload?.length) return null;
 const items = payload.filter(p => p.value != null && p.value > 0);
 if (items.length === 0 && !extra) return null;
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
 <p style={{ color: 'rgba(var(--ink),0.95)', fontSize: 11, lineHeight: 1.2 }}>
 {totalText}
 </p>
 {showBreakdown && items.map((entry, i) => (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: i === 0 ? 3 : 1 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <div style={{ width: 5, height: 5, borderRadius: 1, background: entry.color || entry.fill }} />
 <span style={{ color: 'rgba(var(--ink),0.7)', fontSize: 9 }}>{entry.tooltipName || entry.name}</span>
 </div>
 <span style={{ color: 'rgba(var(--ink),0.85)', fontSize: 9 }}>{entry.value}h</span>
 </div>
 ))}
 {extra && (
 <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
 <div style={{ width: 8, height: 2, borderRadius: 1, background: 'rgba(var(--sleep-line),0.8)' }} />
 <span style={{ color: 'rgba(var(--ink),0.7)', fontSize: 9 }}>{extra}</span>
 </div>
 )}
 </div>
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
 const { myObjectives, available: objectivesAvailable, createObjective, deleteObjective } = useObjectives();
 const [goalsTab, setGoalsTab] = useState('objectives'); // 'objectives' | 'marks'

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
 const [showSleep, setShowSleep] = useState(() => { try { return localStorage.getItem('olympia_carga_descanso') === '1'; } catch { return false; } });
 const toggleSleep = () => setShowSleep(v => { try { localStorage.setItem('olympia_carga_descanso', v ? '0' : '1'); } catch { /* sin almacenamiento */ } return !v; });
 // La línea se monta al encender (y se dibuja de izquierda a derecha) y se
 // desmonta 650 ms después de apagar, cuando ha terminado el fundido.
 const [sleepMounted, setSleepMounted] = useState(showSleep);
 const [sleepDrawKey, setSleepDrawKey] = useState(0);
 const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 useEffect(() => {
 if (showSleep) { setSleepMounted(true); setSleepDrawKey(k => k + 1); return; }
 const t = setTimeout(() => setSleepMounted(false), 650);
 return () => clearTimeout(t);
 }, [showSleep]);
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
 const [muscleTF, setMuscleTF] = useState('1m'); // '1m' | '3m' | '6m'
 const [seasonTF, setSeasonTF] = useState('1m'); // ritmo estacional: '1m' | '3m'
 const [detailDate, setDetailDate] = useState(null); // día abierto en la hoja de detalle
 // Disciplina alimentaria + qué se ve en semana y calendario (filtro único)
 const diet = useDiet();
 const dietSheet = useDietSheet();
 const [viewMode, setViewModeState] = useState(() => {
 try { return localStorage.getItem('olympia_tu_view') || 'both'; } catch { return 'both'; }
 });
 const setViewMode = (v) => { setViewModeState(v); try { localStorage.setItem('olympia_tu_view', v); } catch { /* sin almacenamiento */ } };
 const view = diet.active ? viewMode : 'train';
 const [editCards, setEditCards] = useState(false);
 const [cardOrder, setCardOrder] = useState(() => {
 try {
 const saved = JSON.parse(localStorage.getItem('olympia_tu_cards'));
 if (Array.isArray(saved)) {
 // Las tarjetas nuevas se añaden al final de un orden ya guardado.
 const valid = saved.filter(k => CARD_KEYS.includes(k));
 return [...valid, ...CARD_KEYS.filter(k => !valid.includes(k))];
 }
 } catch { /* noop */ }
 return CARD_KEYS;
 });
 useEffect(() => {
 try { localStorage.setItem('olympia_tu_cards', JSON.stringify(cardOrder)); } catch { /* noop */ }
 }, [cardOrder]);
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

 // Volumen de fuerza por grupo muscular en el periodo elegido (M/3M/6M,
 // anclado al mes navegado) + periodo anterior como comparación fantasma.
 // Prioridad: grupos elegidos por el usuario (muscle_groups) → detección
 // por palabras clave (push/pull/términos exactos) → sin clasificar.
 const muscleData = useMemo(() => {
 const n = muscleTF === '1m' ? 1 : muscleTF === '3m' ? 3 : 6;
 const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 const sStr = fmt(new Date(year, month - (n - 1), 1));
 const eStr = fmt(new Date(year, month + 1, 0));
 const psStr = fmt(new Date(year, month - (2 * n - 1), 1));
 const peStr = fmt(new Date(year, month - (n - 1), 0));

 const cur = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, 0]));
 const prev = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, 0]));
 let unmatchedMins = 0;
 let strengthCount = 0;
 myAllActivities.filter(a => a.type === 'strength_training').forEach(a => {
 const ds = a.date?.slice(0, 10);
 if (!ds) return;
 const inCur = ds >= sStr && ds <= eStr;
 const inPrev = ds >= psStr && ds <= peStr;
 if (!inCur && !inPrev) return;
 const explicit = Array.isArray(a.muscle_groups) ? a.muscle_groups.filter(k => k in cur) : [];
 const keys = explicit.length > 0
 ? explicit
 : detectMuscleGroups(`${a.title || ''} ${a.description || ''} ${a.progress_note || ''}`);
 const mins = a.duration_minutes || 0;
 if (inCur) {
 strengthCount++;
 if (keys.length === 0) { unmatchedMins += mins; return; }
 keys.forEach(k => { cur[k] += mins / keys.length / 60; });
 } else if (keys.length > 0) {
 keys.forEach(k => { prev[k] += mins / keys.length / 60; });
 }
 });
 const classifiedH = Object.values(cur).reduce((s, h) => s + h, 0);
 return {
 data: MUSCLE_GROUPS.map(g => ({ label: g.label, hours: +cur[g.key].toFixed(1), prev: +prev[g.key].toFixed(1) })),
 unmatchedH: +(unmatchedMins / 60).toFixed(1),
 totalH: +(classifiedH + unmatchedMins / 60).toFixed(1),
 strengthCount,
 };
 }, [myAllActivities, muscleTF, year, month]);

 // Ritmo estacional — horas acumuladas vs el periodo anterior equivalente
 const seasonal = useMemo(() => buildSeasonalSeries(
 actFilter === 'accumulated' ? myAllActivities : myAllActivities.filter(a => a.type === actFilter), {
 year, month, months: seasonTF === '1m' ? 1 : 3,
 }), [myAllActivities, year, month, seasonTF, actFilter]);

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
 const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
 startStr, endStr,
 label: `${start.getDate()}/${start.getMonth() + 1}`,
 monthLabel: showLabel ? MONTH_LABELS_SHORT[start.getMonth()] : '',
 intervalLabel: `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]}`,
 hours: computeHours(startStr, endStr),
 sleepHours,
 };
 });
 }, [myAllActivities, actFilter, computeHours, whoopSleepData]);

 // La noche después: entreno del día D × sueño fechado D+1 (últimos 60 días)
 const nightPoints = useMemo(() => buildNightPoints(myAllActivities, whoopSleepData), [myAllActivities, whoopSleepData]);

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

 // Eje Y: tope en el pico real redondeado a la hora (no al múltiplo del
 // paso: un pico de 10,4 h da 0–11 h, no 0–15 h). Marcas cada 1/2/5 h.
 const { yDomain, yTicks } = useMemo(() => {
 if (maxHours <= 0) return { yDomain: [0, 1], yTicks: [0, 1] };
 const max = Math.max(1, Math.ceil(maxHours));
 const step = max <= 6 ? 1 : max <= 14 ? 2 : max <= 30 ? 5 : 10;
 const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
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
 // Fecha YYYY-MM-DD → planes
 const plansByDateStr = useMemo(() => {
 const map = {};
 weeklyPlans.forEach(p => {
 const ds = p.date?.slice(0, 10);
 if (!ds) return;
 (map[ds] = map[ds] || []).push(p);
 });
 return map;
 }, [weeklyPlans]);

 // Filtro global de la pestaña (null = todas) aplicado a semana y calendario
 const typeFilter = actFilter === 'accumulated' ? null : actFilter;
 const filterMap = (map, key) => !typeFilter ? map : Object.fromEntries(
 Object.entries(map).map(([d, l]) => [d, l.filter(x => x[key] === typeFilter)]).filter(([, l]) => l.length));

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
 // Mapas filtrados memorizados: sin esto, cada render recrea 266 celdas de la semana
 const fActsByDate = useMemo(() => filterMap(activitiesByDateStr, 'type'), [activitiesByDateStr, typeFilter]);
 const fPlansByDate = useMemo(() => filterMap(plansByDateStr, 'activity_type'), [plansByDateStr, typeFilter]);

 // Tarjetas de gráficas reordenables (orden persistido por dispositivo)
 const chartCards = {
 ritmo: (<>
 {/* ── Ritmo estacional — acumulado vs periodo anterior ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-start justify-between gap-3 mb-3">
 <div>
 <h2 style={SECTION_TITLE}>Ritmo estacional</h2>
 <div className="flex items-baseline gap-2 mt-1.5">
 <span className="text-[20px] leading-none" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_PRIMARY }}>
 {formatHours(seasonal.totalH)}
 </span>
 <span className="text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_MUTED }}>
 vs {formatHours(seasonal.prevTotalH)}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-0.5 rounded-full p-1 flex-shrink-0" style={glassBar}>
 {[['1m', 'Último mes'], ['3m', '3M']].map(([key, lbl]) => (
 <button key={key} onClick={() => setSeasonTF(key)}
 className="px-2.5 py-1 rounded-full text-[10px] transition-ui whitespace-nowrap"
 style={seasonTF === key
 ? { background: 'rgba(var(--ink),0.1)', color: TEXT_PRIMARY }
 : { color: TEXT_MUTED }}>
 {lbl}
 </button>
 ))}
 </div>
 </div>

 <div className="h-[170px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={seasonal.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="seasonGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={CH.accent} stopOpacity="0.45" />
 <stop offset="100%" stopColor={CH.accent} stopOpacity="0.05" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 <XAxis dataKey="label" tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }}
 tickLine={false} interval={Math.max(1, Math.floor(seasonal.data.length / 4)) - 1} minTickGap={20} />
 <YAxis tick={{ fontSize: 9, fill: CH.tick }} axisLine={false} tickLine={false}
 width={26} tickFormatter={(v) => `${v}h`} />
 <Tooltip
 cursor={{ stroke: CH.cursor, strokeWidth: 1, strokeDasharray: '3 3' }}
 content={(props) => {
 const payload = (props.payload || []).map(p => ({
 ...p,
 tooltipName: p.dataKey === 'prev' ? 'Periodo anterior' : 'Ahora',
 }));
 return <ChartTooltip {...props} payload={payload} />;
 }}
 />
 {/* Periodo anterior — línea de referencia apagada */}
 <Area type="monotone" dataKey="prev" stroke={CH.tick} strokeWidth={1.5}
 fill="transparent" dot={false} isAnimationActive={false} connectNulls />
 {/* Periodo actual — acento con relleno y puntos */}
 <Area type="monotone" dataKey="cur" stroke={CH.accent} strokeWidth={2.5}
 fill="url(#seasonGradient)" dot={{ r: 2, fill: CH.accent, strokeWidth: 0 }}
 activeDot={{ r: 4, fill: CH.accent, strokeWidth: 0 }} isAnimationActive={false} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 </>),
 sueno: whoopSleepData.length > 0 ? <SleepWeeklyCard weeks={weeklyData} CH={CH} glassCard={glassCard} /> : null,
 noche: whoopSleepData.length > 0 ? <SleepNightCard points={nightPoints} weeks={weeklyData} CH={CH} glassCard={glassCard} /> : null,
 fuerza: (<>
 {/* ── Fuerza — volumen por grupo muscular ── */}
 {muscleData.strengthCount > 0 && (
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-start justify-between gap-3 mb-1">
 <div>
 <h2 style={SECTION_TITLE}>Entrenamientos de fuerza</h2>
 <p className="text-[10px] mt-1" style={{ color: TEXT_MUTED }}>
 {muscleData.totalH}h · {muscleTF === '1m' ? 'último mes' : muscleTF === '3m' ? 'últimos 3 meses' : 'últimos 6 meses'}
 </p>
 </div>
 <div className="flex items-center gap-0.5 rounded-full p-1 flex-shrink-0" style={glassBar}>
 {[['1m', 'Último mes'], ['3m', '3M'], ['6m', '6M']].map(([key, lbl]) => (
 <button key={key} onClick={() => setMuscleTF(key)}
 className="px-2.5 py-1 rounded-full text-[10px] transition-ui whitespace-nowrap"
 style={muscleTF === key
 ? { background: 'rgba(var(--ink),0.1)', color: TEXT_PRIMARY }
 : { color: TEXT_MUTED }}>
 {lbl}
 </button>
 ))}
 </div>
 </div>
 <div className="h-[250px]" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart data={muscleData.data} cx="50%" cy="50%" outerRadius="60%">
 <defs>
 {/* Relleno radial — mismo lenguaje que el degradado de Mi Actividad */}
 <radialGradient id="muscleGradient">
 <stop offset="0%" stopColor={CH.accent} stopOpacity="0.5" />
 <stop offset="100%" stopColor={CH.accent} stopOpacity="0.1" />
 </radialGradient>
 </defs>
 {/* Anillos discontinuos — eco de las rayas del calendario */}
 <PolarGrid stroke={CH.axis} strokeDasharray="3 5" radialLines={false} />
 <PolarAngleAxis
 dataKey="label"
 tick={(props) => {
 const { x, y, textAnchor, payload } = props;
 const item = muscleData.data.find(d => d.label === payload.value);
 return (
 <g>
 <text x={x} y={y} textAnchor={textAnchor} fontSize="9" fill={CH.tick}
 fontFamily='"JetBrains Mono", monospace'>
 {payload.value}
 </text>
 <text x={x} y={y + 12} textAnchor={textAnchor} fontSize="10" fill={CH.accent}
 fontFamily='"JetBrains Mono", monospace'>
 {item && item.hours > 0 ? `${item.hours}h` : '–'}
 </text>
 </g>
 );
 }}
 />
 <Radar
 dataKey="hours"
 stroke={CH.accent}
 strokeWidth={2}
 strokeLinejoin="round"
 fill="url(#muscleGradient)"
 fillOpacity={1}
 dot={{ r: 2.5, fill: CH.accent, strokeWidth: 0 }}
 isAnimationActive={false}
 />
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
 </>),
 };
 // Solo las tarjetas con contenido; subir/bajar intercambia con la vecina visible.
 const visibleCards = cardOrder.filter(k => chartCards[k]);
 const moveVisible = (i, d) => {
 const a = visibleCards[i], b = visibleCards[i + d];
 if (!b) return;
 setCardOrder(o => { const n = [...o]; const ia = n.indexOf(a), ib = n.indexOf(b); [n[ia], n[ib]] = [n[ib], n[ia]]; return n; });
 };

 return (
 <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
 {/* ── Entrenamiento — semana deslizable + filtro global de la pestaña ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <TrainingSection
 activitiesByDate={fActsByDate}
 plansByDate={fPlansByDate}
 prDates={prDates}
 onDayClick={setDetailDate}
 usedTypes={usedTypes.map(t => t.key)}
 typeLabels={Object.fromEntries(Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.label]))}
 filter={typeFilter}
 onFilterChange={(t) => setActFilter(t || 'accumulated')}
 dietByDate={diet.byDate}
 view={view}
 onViewChange={diet.active ? setViewMode : undefined}
 >
 {/* Snapshot fijo — últimos 7 días vs media y tendencia de 16 semanas */}
 {view !== 'food' && (
 <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(var(--ink),0.06)' }}>
 {/* Una sola línea de cifras: la gráfica es la protagonista */}
 <div className="flex items-center justify-between gap-3 mb-1">
 <div className="flex items-baseline gap-2 min-w-0">
 <span className="text-[17px] leading-none" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_PRIMARY }}>
 {formatHours(lastWeekHours)}
 </span>
 <span className="text-[10px] truncate" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_MUTED }}>
 7 días
 {avgWeeklyHours > 0 && (
 <span style={{ color: lastWeekHours >= avgWeeklyHours ? 'var(--accent)' : TEXT_MUTED }}>
 {' · '}{lastWeekHours >= avgWeeklyHours ? '↑' : '↓'} {formatHours(Math.abs(lastWeekHours - avgWeeklyHours))} vs media
 </span>
 )}
 {typeFilter ? ` · ${ACTIVITY_TYPES[typeFilter]?.label}` : ''}
 </span>
 </div>
 {whoopSleepData.length > 0 && (
 <button onClick={toggleSleep} aria-pressed={showSleep}
 className="o-press text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
 style={{ ...glassBar, color: showSleep ? 'rgb(var(--sleep-line))' : TEXT_MUTED }}>
 <Moon className="w-3 h-3" />Descanso
 </button>
 )}
 </div>
 <div className="h-[160px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData} syncId="carga" margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="cargaGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={CH.accent} stopOpacity="0.4" />
 <stop offset="100%" stopColor={CH.accent} stopOpacity="0.04" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 <XAxis dataKey="label" tickFormatter={(v) => chartData.find(d => d.label === v)?.monthLabel || ''}
 tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }} tickLine={false} interval={0} minTickGap={18} />
 <YAxis tick={{ fontSize: 9, fill: CH.tick }} axisLine={false} tickLine={false} width={24}
 domain={yDomain} ticks={yTicks} tickFormatter={(v) => `${v}h`} />
 <Tooltip
 cursor={{ stroke: CH.cursor, strokeWidth: 1, strokeDasharray: '3 3' }}
 content={(props) => {
 const d = props.payload?.[0]?.payload;
 return <ChartTooltip {...props}
 payload={(props.payload || []).filter(p => p.dataKey === 'hours').map(p => ({ ...p, tooltipName: 'Entrenamiento' }))}
 extra={showSleep && d?.sleepHours != null ? `${fmtH(d.sleepHours)} de sueño / noche` : null} />;
 }}
 />
 <Area type="monotone" dataKey="hours" stroke={CH.accent} strokeWidth={2}
 fill="url(#cargaGradient)"
 dot={{ r: 2.2, fill: CH.accent, fillOpacity: 1, strokeWidth: 0 }}
 activeDot={{ r: 4, fill: CH.accent, strokeWidth: 0 }} isAnimationActive={false} />
 {/* Descanso: línea menta translúcida en el mismo eje (ambas en horas).
     Entra dibujándose de izquierda a derecha y sale con un fundido. */}
 {whoopSleepData.length > 0 && sleepMounted && (
 <Area key={sleepDrawKey} type="monotone" dataKey="sleepHours" className="sleep-line"
 stroke="rgb(var(--sleep-line))" strokeOpacity={showSleep ? 0.6 : 0} strokeWidth={1.75}
 fill="transparent" dot={false} activeDot={showSleep ? { r: 3, fill: 'rgb(var(--sleep-line))', strokeWidth: 0 } : false}
 isAnimationActive={!reducedMotion} animationDuration={1100} animationEasing="ease-in-out"
 connectNulls={false} />
 )}
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 )}
 </TrainingSection>
 </div>

 {/* ── Calendario — meses con scroll vertical ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <MonthScroller
 activitiesByDate={fActsByDate}
 plansByDate={fPlansByDate}
 prDates={prDates}
 onDayClick={setDetailDate}
 dietByDate={diet.byDate}
 view={view}
 />
 </div>

 {/* ── Carga muscular ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <h2 style={SECTION_TITLE}>Carga muscular</h2>
 <div className="-mt-6">
 <MuscleLoad activities={myAllActivities} />
 </div>
 </div>

 {/* ── Tus gráficas — tarjetas reordenables ── */}
 <div className="flex justify-end -mb-2">
 <button onClick={() => setEditCards(v => !v)}
 className="text-[10px] px-3 py-1 rounded-full"
 style={{ ...glassBar, color: editCards ? 'var(--accent)' : TEXT_MUTED }}>
 {editCards ? 'Hecho' : 'Ordenar'}
 </button>
 </div>
 {visibleCards.map((key, idx) => (
 <motion.div key={key} layout={editCards} transition={{ duration: 0.25 }} className="relative">
 {editCards && (
 <div className="absolute right-0 top-3 z-10 flex gap-1">
 <button disabled={idx === 0} onClick={() => moveVisible(idx, -1)}
 className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30" style={glassBar} aria-label="Subir">
 <ChevronUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </button>
 <button disabled={idx === visibleCards.length - 1} onClick={() => moveVisible(idx, 1)}
 className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30" style={glassBar} aria-label="Bajar">
 <ChevronDown className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </button>
 </div>
 )}
 <div style={editCards ? { opacity: 0.85, pointerEvents: 'none' } : undefined}>
 {chartCards[key]}
 </div>
 </motion.div>
 ))}

 {/* ── Objetivos y marcas ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 {(() => {
 const header = (
 <div className="flex items-center gap-0.5 rounded-full p-1" style={glassBar}>
 {[['objectives', 'Objetivos'], ['marks', 'Marcas']].map(([k, l]) => (
 <button key={k} onClick={() => setGoalsTab(k)}
 className="px-3 py-1 rounded-full text-[11px] transition-ui"
 style={goalsTab === k ? { background: 'rgba(var(--ink),0.1)', color: TEXT_PRIMARY } : { color: TEXT_MUTED }}>
 {l}
 </button>
 ))}
 </div>
 );
 return goalsTab === 'objectives' ? (
 <ObjectivesPanel
 header={header}
 objectives={myObjectives}
 activities={myAllActivities}
 available={objectivesAvailable}
 onCreate={createObjective}
 onDelete={deleteObjective}
 />
 ) : (
 <GoalsSection
 header={header}
 goals={goals}
 prs={prAchievements}
 onCreate={createGoal}
 onUpdateMark={(goalId, value) => handlePrBeaten([{ goalId, newValue: value }], new Date().toISOString().slice(0, 10))}
 onDelete={deleteGoal}
 />
 );
 })()}
 </div>

 {/* Disciplina alimentaria — opcional, se activa aquí */}
 {diet.available && (
 <div className="pt-5" style={{ borderTop: '1px solid rgba(var(--ink),0.12)' }}>
 <DietSettingsRow onEdit={dietSheet.show} />
 </div>
 )}

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

 <AnimatePresence>
 {detailDate && (
 <DayDetailSheet
 date={detailDate}
 activities={activitiesByDateStr[tcDateStr(detailDate)] || []}
 plans={(activitiesByDateStr[tcDateStr(detailDate)] || []).length ? [] : (plansByDateStr[tcDateStr(detailDate)] || [])}
 prs={prAchievementsByDate[tcDateStr(detailDate)] || []}
 onClose={() => setDetailDate(null)}
 onEdit={(act) => { setDetailDate(null); setEditActivity(act); }}
 onDelete={(id) => deleteActivity(id)}
 onCompletePlan={(plan) => { setDetailDate(null); setConvertPlan(plan); }}
 onRemovePlan={(id) => removePlan(id)}
 onDeletePr={(id) => deletePrAchievement(id)}
 onAdd={(d) => { setDetailDate(null); setSelectedDate(d); setShowLogDialog(true); }}
 dietRow={detailDate <= new Date() ? <DietDayRow date={tcDateStr(detailDate)} /> : null}
 />
 )}
 </AnimatePresence>
 <DietSheetHost sheet={dietSheet} />

 <AnimatePresence>
 {(showLogDialog || !!editActivity || !!convertPlan) && (
 <LogActivityDialog
 isOpen
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
 )}
 </AnimatePresence>
 </div>
 );
}
