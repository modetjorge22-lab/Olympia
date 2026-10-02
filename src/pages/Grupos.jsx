import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, ChevronDown, Flame, CalendarCheck, Zap, Timer, Layers, Shuffle, Repeat, Sun, AudioWaveform, Target, Sunrise, Medal } from 'lucide-react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useAuth } from '@/lib/AuthContext';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { DAY_PALETTE } from '@/utils/dayDisplay';
import { useTeamGoals } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { DashedFrame } from '@/components/sketch';
import { buildSeasonalSeries, formatHours } from '@/utils/seasonal';
import ActivityFilterButton from '@/components/ActivityFilterButton';
import MemberSheet from '@/components/MemberSheet';
import { categoryOf } from '@/utils/activityIcons';
import { computeTeamRecords } from '@/utils/teamRecords';
import { useObjectives } from '@/hooks/useObjectives';
import { objectiveProgress } from '@/utils/objectives';

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Gradiente según ranking — líder en el acento del tema, descendiendo a tono apagado
function rankingWine(rank, total, chart) {
 if (total <= 1) return chart.accent;
 const t = rank / (total - 1);
 const from = chart.raceFrom; // líder
 const to = chart.raceTo;     // colista
 const r = Math.round(from.r + (to.r - from.r) * t);
 const g = Math.round(from.g + (to.g - from.g) * t);
 const b = Math.round(from.b + (to.b - from.b) * t);
 return `rgb(${r},${g},${b})`;
}

function makeMemberDot(member, lastDay, onAccent) {
 return function MemberDot(props) {
 const { cx, cy, payload } = props;
 if (cx == null || cy == null) return null;
 if (payload.day !== lastDay) return null;
 const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
 const radius = 11;
 return (
 <g>
 {member.avatar_url ? (
 <>
 <defs>
 <clipPath id={`clip-g-${member.email}`}>
 <circle cx={cx} cy={cy} r={radius} />
 </clipPath>
 </defs>
 <image href={member.avatar_url} x={cx - radius} y={cy - radius} width={radius * 2} height={radius * 2}
 clipPath={`url(#clip-g-${member.email})`} preserveAspectRatio="xMidYMid slice" />
 </>
 ) : (
 <>
 <circle cx={cx} cy={cy} r={radius} fill={member.color} />
 <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize="8" fontWeight="700"
 fill={onAccent} style={{ fontFamily: 'DM Sans, sans-serif' }}>
 {initials}
 </text>
 </>
 )}
 </g>
 );
 };
}

const glassCard = {
 background: 'transparent',
 borderTop: '1px solid rgba(var(--ink),0.12)',
 borderRadius: 0,
 paddingLeft: 0,
 paddingRight: 0,
};

const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';

// Títulos de sección — misma voz que en "Tú": DM Sans regular, sin negrita ni iconos
const SECTION_TITLE = {
 fontFamily: '"DM Sans", system-ui, sans-serif',
 fontWeight: 400,
 fontSize: 13,
 letterSpacing: '0.14em',
 color: 'rgba(var(--ink),0.95)',
};

const glassBar = {
 background: 'var(--glass-bg)',
 backdropFilter: 'blur(24px) saturate(160%)',
 WebkitBackdropFilter: 'blur(24px) saturate(160%)',
 border: '1px solid var(--glass-border)',
};

function CustomTooltip({ active, payload, label, memberStats, isTeam, unit = 'h' }) {
 if (!active || !payload?.length) return null;
 return (
 <div style={{
 background: 'var(--surface)',
 border: '1px solid rgba(var(--ink),0.15)',
 borderRadius: 10, padding: '8px 12px', fontSize: 11,
 boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 110,
 }}>
 <p style={{ color: 'rgba(var(--ink),0.5)', fontSize: 10, marginBottom: 4 }}>
 {isTeam ? label : `Día ${label}`}
 </p>
 {payload.map((entry, i) => {
 const m = memberStats?.find(s => s.email === entry.dataKey);
 return (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: i === 0 ? 0 : 3 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
 <div style={{ width: 7, height: 7, borderRadius: 2, background: entry.color || entry.fill }} />
 <span style={{ color: 'rgba(var(--ink),0.85)' }}>{m?.name || entry.name}</span>
 </div>
 <span style={{ color: 'rgba(var(--ink),0.95)', fontWeight: 600 }}>{entry.value}{unit}</span>
 </div>
 );
 })}
 </div>
 );
}

// Ventanas de la carrera: semana (7 días), mes en curso y 3 meses móviles
// (90 días que avanzan cada día: entra hoy, sale el día más antiguo).
const SNAPSHOTS = [
 { key: 'week', label: 'Semana' },
 { key: 'month', label: 'Mes' },
 { key: '90d', label: '3M' },
];

function windowFor(key) {
 const end = new Date(); end.setHours(0, 0, 0, 0);
 const start = new Date(end);
 if (key === 'week') start.setDate(end.getDate() - 6);
 else if (key === 'month') start.setDate(1);
 else start.setDate(end.getDate() - 89);
 return { start, end };
}

const dstr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Anillo pequeño para las filas de miembros (con segunda vuelta si supera 100%)
function MiniRing({ pct, chart, size = 30 }) {
 const r = size / 2 - 3.5, c = 2 * Math.PI * r;
 const p = pct == null ? 0 : pct;
 const first = Math.min(p, 100) / 100 * c;
 const over = p > 100 ? Math.min(p - 100, 100) / 100 * c : 0;
 return (
 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
 <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={chart.grid} strokeWidth="3" />
 {first > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={chart.accent} strokeWidth="3" strokeLinecap="round"
 strokeDasharray={`${first} ${c - first}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
 {over > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={chart.accentOver} strokeWidth="3" strokeLinecap="round"
 strokeDasharray={`${over} ${c - over}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
 </svg>
 );
}

function Avatar({ m, size = 32, ring }) {
 const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
 const style = { width: size, height: size, ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}) };
 return m.avatar_url
 ? <img src={m.avatar_url} alt={m.name} className="rounded-full object-cover flex-shrink-0" style={style} />
 : <div className="rounded-full flex items-center justify-center flex-shrink-0"
 style={{ ...style, background: 'rgba(var(--ink),0.08)', color: TEXT_PRIMARY, fontSize: size * 0.32 }}>{initials}</div>;
}

// ── Tarjeta de récords del equipo ──
const RECORD_ICONS = {
 flame: Flame, calendarCheck: CalendarCheck, zap: Zap, timer: Timer, layers: Layers,
 shuffle: Shuffle, repeat: Repeat, sun: Sun, metronome: AudioWaveform, target: Target,
 sunrise: Sunrise, trophy: Trophy, medal: Medal,
};

function RecordsCard({ records, onOpenMember }) {
 const [all, setAll] = useState(false);
 if (!records.length) return null;
 const list = all ? records : records.slice(0, 6);
 return (
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-baseline justify-between mb-1">
 <h2 style={SECTION_TITLE}>Récords</h2>
 <span className="text-[9.5px]" style={{ color: TEXT_MUTED }}>todo el histórico</span>
 </div>
 {list.map((r, i) => {
 const Icon = RECORD_ICONS[r.icon] || Trophy;
 return (
 <motion.button key={r.key} layout onClick={() => onOpenMember(r.holder.email)}
 className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-60"
 style={{ borderTop: i ? '1px solid rgba(var(--ink),0.06)' : 'none' }}>
 <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
 style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
 <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[12px]" style={{ color: TEXT_PRIMARY }}>{r.title}</p>
 <p className="text-[10px] truncate" style={{ color: TEXT_MUTED }}>{r.desc}</p>
 </div>
 <div className="flex flex-col items-end flex-shrink-0">
 <span className="text-[11px]" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--accent)' }}>{r.value}</span>
 <span className="flex items-center gap-1 mt-0.5">
 <Avatar m={r.holder} size={14} />
 <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{r.holder.name.split(' ')[0]}</span>
 </span>
 </div>
 </motion.button>
 );
 })}
 {records.length > 6 && (
 <button onClick={() => setAll(v => !v)} className="w-full mt-1 pt-2 text-[10.5px]"
 style={{ borderTop: '1px solid rgba(var(--ink),0.06)', color: TEXT_MUTED }}>
 {all ? 'Ver menos' : `Ver los ${records.length} récords`}
 </button>
 )}
 </div>
 );
}

export default function Grupos() {
 const { chart: CH } = useTheme();
 const { user } = useAuth();
 const { allActivities } = useActivities(new Date());
 const { members } = useTeamMembers();
 const { plans: weeklyPlans } = useWeeklyPlans();
 const teamGoals = useTeamGoals();
 const { objectives } = useObjectives();
 const [raceMetric, setRaceMetric] = useState('hours'); // 'hours' | 'count'
 const [snapshot, setSnapshot] = useState('month'); // 'week' | 'month' | '90d'
 const [seasonTF, setSeasonTF] = useState('1m');
 const [typeFilter, setTypeFilter] = useState(null);
 const [openMember, setOpenMember] = useState(null);

 const now = new Date();
 const year = now.getFullYear();
 const month = now.getMonth();

 // PR achievements del equipo
 const [teamPrAchievements, setTeamPrAchievements] = useState([]);
 useEffect(() => {
 supabase.from('pr_achievements').select('user_email, date')
 .then(({ data }) => { if (data) setTeamPrAchievements(data); });
 }, []);
 const memberPrDates = useMemo(() => {
 const map = {};
 teamPrAchievements.forEach(pr => { (map[pr.user_email] = map[pr.user_email] || new Set()).add(pr.date); });
 return map;
 }, [teamPrAchievements]);

 // Filtro global de la pestaña
 const acts = useMemo(() => typeFilter ? allActivities.filter(a => a.type === typeFilter) : allActivities,
 [allActivities, typeFilter]);
 const usedTypes = useMemo(() => Object.keys(ACTIVITY_TYPES).filter(t => allActivities.some(a => a.type === t)), [allActivities]);
 const typeLabels = Object.fromEntries(Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.label]));

 const emails = useMemo(() => members.length > 0
 ? members.map(m => m.email)
 : [...new Set(allActivities.map(a => a.user_email))], [members, allActivities]);

 // ── Carrera + podio para la ventana elegida ──
 const { chartData, memberStats } = useMemo(() => {
 const { start, end } = windowFor(snapshot);
 const days = [];
 for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
 const sStr = dstr(start), eStr = dstr(end);

 const stats = emails.map((email, idx) => {
 const member = members.find(m => m.email === email);
 const win = acts.filter(a => a.user_email === email && a.date?.slice(0, 10) >= sStr && a.date?.slice(0, 10) <= eStr);
 const byDay = {};
 win.forEach(a => {
 const k = a.date.slice(0, 10);
 byDay[k] = byDay[k] || { mins: 0, n: 0 };
 byDay[k].mins += a.duration_minutes || 0;
 byDay[k].n += 1;
 });
 let cm = 0, cn = 0;
 const cum = days.map(d => { const b = byDay[dstr(d)]; cm += b?.mins || 0; cn += b?.n || 0; return { h: +(cm / 60).toFixed(1), n: cn }; });
 const totalMins = win.reduce((s, a) => s + (a.duration_minutes || 0), 0);
 return {
 email,
 name: member?.full_name || email.split('@')[0],
 avatar_url: member?.avatar_url || null,
 totalMins, totalHours: +(totalMins / 60).toFixed(1), sessions: win.length,
 color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
 cum,
 };
 }).sort((a, b) => raceMetric === 'count' ? b.sessions - a.sessions : b.totalMins - a.totalMins);

 const data = [{ i: 0, label: '' }];
 stats.forEach(m => { data[0][m.email] = 0; });
 days.forEach((d, i) => {
 const p = { i: i + 1, label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` };
 stats.forEach(m => { p[m.email] = raceMetric === 'count' ? m.cum[i].n : m.cum[i].h; });
 data.push(p);
 });
 return { chartData: data, memberStats: stats };
 }, [acts, emails, members, snapshot, raceMetric]);

 const lastIdx = chartData.length - 1;
 const metricOf = m => raceMetric === 'count' ? m.sessions : m.totalHours;
 const teamAverage = memberStats.length ? +(memberStats.reduce((s, m) => s + metricOf(m), 0) / memberStats.length).toFixed(1) : null;
 const raceUnit = raceMetric === 'count' ? '' : 'h';
 const podium = memberStats.slice(0, 3).filter(m => metricOf(m) > 0);

 // ── Ritmo estacional del grupo ──
 const seasonal = useMemo(() => buildSeasonalSeries(acts, {
 year, month, months: seasonTF === '1m' ? 1 : 3, divisor: Math.max(emails.length, 1),
 }), [acts, year, month, seasonTF, emails.length]);

 // ── Filas de miembros: semana actual + ritmo (horas del mes vs media) ──
 // Últimos 7 días terminando hoy (hoy es el último cuadradito)
 const weekDays = useMemo(() => {
 const t = new Date(); t.setHours(0, 0, 0, 0);
 return Array.from({ length: 7 }, (_, i) => { const d = new Date(t); d.setDate(t.getDate() - 6 + i); return d; });
 }, []);
 const monthStats = useMemo(() => {
 const sStr = dstr(new Date(year, month, 1));
 const rows = emails.map(email => {
 const member = members.find(m => m.email === email);
 const mine = acts.filter(a => a.user_email === email);
 const monthMins = mine.filter(a => a.date?.slice(0, 10) >= sStr).reduce((s, a) => s + (a.duration_minutes || 0), 0);
 const week = weekDays.map(d => mine.filter(a => a.date?.slice(0, 10) === dstr(d)));
 return {
 email, name: member?.full_name || email.split('@')[0], avatar_url: member?.avatar_url || null,
 monthMins, week,
 };
 });
 const avg = rows.reduce((s, r) => s + r.monthMins, 0) / Math.max(rows.length, 1);
 return rows.map(r => ({ ...r, pace: avg > 0 ? Math.round(r.monthMins / avg * 100) : null }))
 .sort((a, b) => b.monthMins - a.monthMins);
 }, [acts, emails, members, weekDays, year, month]);

 // Récords — histórico completo, sin filtro de actividad
 const records = useMemo(() => computeTeamRecords({
 activities: allActivities,
 people: emails.map(email => {
 const m = members.find(x => x.email === email);
 return { email, name: m?.full_name || email.split('@')[0], avatar_url: m?.avatar_url || null };
 }),
 prs: teamPrAchievements,
 typeLabels,
 }), [allActivities, emails, members, teamPrAchievements]);

 if (emails.length === 0) {
 return (
 <div className="px-4 py-5 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh]">
 <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.12)' }}>
 <Users className="w-6 h-6" style={{ color: 'rgba(var(--ink),0.75)' }} />
 </div>
 <h2 className="text-[15px] font-normal mb-1" style={{ color: 'rgba(var(--ink),0.92)' }}>Sin actividad de equipo</h2>
 <p className="text-[13px] text-center" style={{ color: 'rgba(var(--ink),0.5)' }}>Los datos del grupo aparecerán aquí</p>
 </div>
 );
 }

 const pill = (opts, value, set) => (
 <div className="flex items-center gap-0.5 rounded-full p-1 flex-shrink-0" style={glassBar}>
 {opts.map(([key, lbl]) => (
 <button key={key} onClick={() => set(key)}
 className="px-2.5 py-1 rounded-full text-[10px] transition-all whitespace-nowrap"
 style={value === key ? { background: 'rgba(var(--ink),0.1)', color: TEXT_PRIMARY } : { color: TEXT_MUTED }}>
 {lbl}
 </button>
 ))}
 </div>
 );

 const snapLabel = snapshot === 'week' ? 'últimos 7 días' : snapshot === 'month' ? `${MONTHS_ES[month]} ${year}` : 'últimos 3 meses, ventana móvil';
 const openData = openMember && monthStats.find(m => m.email === openMember);

 return (
 <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
 {/* ── Carrera — semana / mes / 3 meses móviles ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="relative flex items-center justify-end mb-2" style={{ minHeight: 32 }}>
 <h2 className="absolute left-1/2 -translate-x-1/2" style={SECTION_TITLE}>Carrera</h2>
 <ActivityFilterButton value={typeFilter} onChange={setTypeFilter} types={usedTypes} labels={typeLabels} />
 </div>
 <div className="flex items-center justify-between gap-2 mb-1">
 {pill(SNAPSHOTS.map(s => [s.key, s.label]), snapshot, setSnapshot)}
 {pill([['hours', 'Horas'], ['count', 'Nº']], raceMetric, setRaceMetric)}
 </div>
 <p className="text-[10px] mb-2" style={{ color: TEXT_MUTED }}>
 {raceMetric === 'count' ? 'Actividades acumuladas' : 'Horas acumuladas'} · {snapLabel}
 {typeFilter ? ` · ${typeLabels[typeFilter]}` : ''}
 </p>
 <div className="h-[230px] -mx-1">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={chartData} margin={{ top: 14, right: 26, bottom: 0, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 <XAxis dataKey="label" tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }} tickLine={false}
 interval={Math.max(0, Math.floor(chartData.length / 4) - 1)} minTickGap={16} />
 <YAxis domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 9, fill: CH.tick }} axisLine={false} tickLine={false} width={24} />
 <Tooltip content={<CustomTooltip memberStats={memberStats} unit={raceUnit} isTeam />} />
 {teamAverage > 0 && (
 <ReferenceLine y={teamAverage} stroke={CH.ref} strokeDasharray="4 4" strokeWidth={1}
 label={{ value: `Media ${teamAverage}${raceMetric === 'count' ? ' act' : 'h'}`, position: 'insideTopLeft', fill: CH.refLabel, fontSize: 9, offset: 6 }} />
 )}
 {memberStats.map((m, idx) => {
 const lineColor = rankingWine(idx, memberStats.length, CH);
 return (
 <Line key={m.email} type="monotone" dataKey={m.email} stroke={lineColor}
 strokeWidth={idx === 0 ? 2.5 : 2}
 dot={(p) => p.index === lastIdx ? makeMemberDot({ ...m, color: lineColor }, lastIdx, CH.onAccent)({ ...p, payload: { day: lastIdx } }) : null}
 activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }} isAnimationActive={false} />
 );
 })}
 </LineChart>
 </ResponsiveContainer>
 </div>

 </div>

 {/* ── Miembros — filas compactas; al tocar, su snapshot ── */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-baseline justify-between mb-2">
 <h2 style={SECTION_TITLE}>Miembros</h2>
 <span className="text-[9.5px]" style={{ color: TEXT_MUTED }}>últimos 7 días · ritmo del mes</span>
 </div>
 {monthStats.map((m, i) => (
 <button key={m.email} onClick={() => setOpenMember(m.email)}
 className="w-full flex items-center gap-3 py-2.5 text-left transition-opacity active:opacity-60"
 style={{ borderTop: i ? '1px solid rgba(var(--ink),0.06)' : 'none' }}>
 <Avatar m={m} size={32} />
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline justify-between">
 <p className="text-[12px] truncate" style={{ color: TEXT_PRIMARY }}>{m.name}</p>
 {/* Lo que tiene fijado: objetivos (conseguidos/total) y marcas */}
 {(() => {
 const objs = objectives.filter(o => o.user_email === m.email);
 const marks = teamGoals.filter(g => g.user_email === m.email).length;
 if (!objs.length && !marks) return null;
 const mineActs = allActivities.filter(a => a.user_email === m.email);
 const done = objs.filter(o => objectiveProgress(o, mineActs).status === 'done').length;
 return (
 <span className="flex items-center gap-2 ml-2 flex-shrink-0" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TEXT_SECONDARY }}>
 {objs.length > 0 && (
 <span className="flex items-center gap-0.5" title="Objetivos conseguidos">
 <Target className="w-3 h-3" style={{ color: 'var(--accent)' }} />{done}/{objs.length}
 </span>
 )}
 {marks > 0 && (
 <span className="flex items-center gap-0.5" title="Marcas fijadas">
 <Trophy className="w-3 h-3" style={{ color: 'var(--accent)' }} />{marks}
 </span>
 )}
 </span>
 );
 })()}
 </div>
 {/* La semana en 7 cuadraditos con el color de cada actividad */}
 <div className="flex gap-[3px] mt-1.5">
 {m.week.map((day, k) => {
 const cats = day.slice(0, 2).map(a => `rgba(var(--cat-${categoryOf(a.type)}),0.75)`);
 const isToday = dstr(weekDays[k]) === dstr(new Date());
 return (
 <span key={k} style={{
 width: 12, height: 12, borderRadius: 3,
 background: cats.length === 0 ? 'transparent'
 : cats.length === 1 ? cats[0] : `linear-gradient(90deg, ${cats[0]} 0 calc(50% - 0.5px), transparent calc(50% - 0.5px) calc(50% + 0.5px), ${cats[1]} calc(50% + 0.5px) 100%)`,
 border: cats.length ? 'none' : '1px dashed rgba(var(--accent-rgb),0.35)',
 boxShadow: isToday ? '0 0 0 1px #e5484d' : 'none',
 }} />
 );
 })}
 </div>
 </div>
 <div className="flex items-center gap-1.5 flex-shrink-0">
 <MiniRing pct={m.pace} chart={CH} />
 <span className="text-[10px] w-9 text-right" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_SECONDARY }}>
 {m.pace != null ? `${m.pace}%` : '–'}
 </span>
 </div>
 </button>
 ))}
 </div>

 {/* ── Ritmo estacional del grupo ── */}
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
 <p className="text-[10px] mt-1" style={{ color: TEXT_MUTED }}>
 Media por participante · {emails.length} {emails.length === 1 ? 'miembro' : 'miembros'}
 </p>
 </div>
 {pill([['1m', 'Último mes'], ['3m', '3M']], seasonTF, setSeasonTF)}
 </div>
 <div className="h-[170px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={seasonal.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="seasonGradientTeam" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor={CH.accent} stopOpacity="0.45" />
 <stop offset="100%" stopColor={CH.accent} stopOpacity="0.05" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 <XAxis dataKey="label" tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }}
 tickLine={false} interval={Math.max(1, Math.floor(seasonal.data.length / 4)) - 1} minTickGap={20} />
 <YAxis tick={{ fontSize: 9, fill: CH.tick }} axisLine={false} tickLine={false} width={26} tickFormatter={(v) => `${v}h`} />
 <Tooltip content={<CustomTooltip isTeam unit="h" />} cursor={{ stroke: CH.cursor, strokeWidth: 1, strokeDasharray: '3 3' }} />
 <Area type="monotone" dataKey="prev" stroke={CH.tick} strokeWidth={1.5} fill="transparent" dot={false} isAnimationActive={false} connectNulls name="Periodo anterior" />
 <Area type="monotone" dataKey="cur" stroke={CH.accent} strokeWidth={2.5} fill="url(#seasonGradientTeam)"
 dot={{ r: 2, fill: CH.accent, strokeWidth: 0 }} activeDot={{ r: 4, fill: CH.accent, strokeWidth: 0 }} isAnimationActive={false} name="Ahora" />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 <RecordsCard records={records} onOpenMember={setOpenMember} />

 {openData && (
 <MemberSheet
 member={openData}
 activities={allActivities.filter(a => a.user_email === openData.email)}
 plans={openData.email === user?.email ? weeklyPlans : []}
 goals={teamGoals.filter(g => g.user_email === openData.email)}
 objectives={objectives.filter(o => o.user_email === openData.email)}
 prDates={memberPrDates[openData.email] || new Set()}
 pacePct={openData.pace}
 onClose={() => setOpenMember(null)}
 />
 )}
 </div>
 );
}

// Anillo de ritmo — % de horas del miembro respecto a la media del equipo.
// El arco usa colores JS (CHART[mode]) porque los atributos SVG no resuelven var().
function PaceRing({ pct, chart }) {
 // Anillo interior: primera vuelta (0-100% de la media).
 // Si se supera la media, el exceso crece como un anillo exterior propio
 // y la primera vuelta se marca como completada con una insignia ✓.
 const R_IN = 25;
 // Hueco fino entre anillos: bordes en 28 y 30 → separación de 2px
 const R_OUT = 32;
 const C_IN = 2 * Math.PI * R_IN;
 const C_OUT = 2 * Math.PI * R_OUT;
 const hasData = pct != null;
 const overLap = hasData && pct > 100;
 const firstDash = hasData ? (Math.max(0, Math.min(pct, 100)) / 100) * C_IN : 0;
 const overDash = overLap ? (Math.min(pct - 100, 100) / 100) * C_OUT : 0;
 return (
 <div className="flex-1 flex flex-col items-center">
 <div style={{ position: 'relative', width: 84, height: 84 }}>
 <svg width="84" height="84" viewBox="0 0 84 84">
 {/* pista interior */}
 <circle cx="42" cy="42" r={R_IN} fill="none" stroke={chart.grid} strokeWidth="6" />
 {/* primera vuelta */}
 {hasData && firstDash > 0 && (
 <circle
 cx="42" cy="42" r={R_IN} fill="none"
 stroke={chart.accent} strokeWidth="6" strokeLinecap="round"
 strokeDasharray={`${firstDash} ${C_IN - firstDash}`}
 transform="rotate(-90 42 42)"
 style={{ transition: 'stroke-dasharray 0.6s ease' }}
 />
 )}
 {/* segunda vuelta — anillo exterior */}
 {overLap && (
 <>
 <circle cx="42" cy="42" r={R_OUT} fill="none" stroke={chart.grid} strokeWidth="4" />
 {overDash > 0 && (
 <circle
 cx="42" cy="42" r={R_OUT} fill="none"
 stroke={chart.accentOver} strokeWidth="4" strokeLinecap="round"
 strokeDasharray={`${overDash} ${C_OUT - overDash}`}
 transform="rotate(-90 42 42)"
 style={{ transition: 'stroke-dasharray 0.6s ease' }}
 />
 )}
 </>
 )}
 {/* marca de vuelta completada — punto en la costura del anillo (estilo Apple) */}
 {overLap && (
 <circle cx="42" cy={42 - R_IN} r="2.4" fill={chart.onAccent} />
 )}
 </svg>
 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 {hasData ? (
 <span className="font-normal font-mono" style={{ fontSize: 15, color: 'rgba(var(--ink),0.95)' }}>
 {pct}<span style={{ fontSize: 9, color: 'rgba(var(--ink),0.5)' }}>%</span>
 </span>
 ) : (
 <span className="font-normal font-mono" style={{ fontSize: 14, color: 'rgba(var(--ink),0.3)' }}>–%</span>
 )}
 </div>
 </div>
 <span className="text-[9px] font-normal uppercase tracking-wider mt-1" style={{ color: 'rgba(var(--ink),0.45)' }}>
 Ritmo
 </span>
 </div>
 );
}

function SportFilterDropdown({ value, onChange, types }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);

 useEffect(() => {
 function handleClick(e) {
 if (ref.current && !ref.current.contains(e.target)) setOpen(false);
 }
 document.addEventListener('mousedown', handleClick);
 return () => document.removeEventListener('mousedown', handleClick);
 }, []);

 const label = value
 ? `${ACTIVITY_TYPES[value]?.emoji || ''} ${ACTIVITY_TYPES[value]?.label || value}`
 : 'Todos';

 return (
 <div ref={ref} style={{ position: 'relative' }}>
 <button
 onClick={() => setOpen(o => !o)}
 className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-normal transition-all"
 style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: value ? TEXT_PRIMARY : TEXT_MUTED }}
 >
 {label}
 <ChevronDown className="w-3 h-3 flex-shrink-0 transition-transform"
 style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: TEXT_MUTED }} />
 </button>
 {open && (
 <div style={{
 position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
 minWidth: 150,
 background: 'var(--surface)',
 border: '1px solid rgba(var(--ink),0.16)',
 borderRadius: 12, padding: 4,
 boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
 }}>
 <button
 onClick={() => { onChange(null); setOpen(false); }}
 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left"
 style={value === null ? { background: 'rgba(var(--ink),0.12)', color: TEXT_PRIMARY } : { color: TEXT_SECONDARY }}
 >
 Todos
 </button>
 {types.map(t => (
 <button key={t}
 onClick={() => { onChange(t); setOpen(false); }}
 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left"
 style={value === t ? { background: 'rgba(var(--ink),0.12)', color: TEXT_PRIMARY } : { color: TEXT_SECONDARY }}
 >
 <span>{ACTIVITY_TYPES[t]?.emoji}</span>{ACTIVITY_TYPES[t]?.label}
 </button>
 ))}
 </div>
 )}
 </div>
 );
}

function MiniMemberCard({ member, year, month, daysInMonth, plansByDay, memberGoals = [], prDates = new Set(), activityBreakdown = [], teamAvgHours = 0 }) {
 const { chart } = useTheme();
 const pacePct = teamAvgHours > 0 ? Math.round((member.totalHours / teamAvgHours) * 100) : null;
 const now = new Date();
 const [goalsOpen, setGoalsOpen] = useState(false);
 const [expandedDay, setExpandedDay] = useState(null);
 const [filterType, setFilterType] = useState(null);
 const availableTypes = activityBreakdown.map(b => b.type);
 let startDow = new Date(year, month, 1).getDay() - 1;
 if (startDow < 0) startDow = 6;
 const trailing = [];
 for (let i = 0; i < startDow; i++) trailing.push(i);

 return (
 <div className="rounded-2xl p-4" style={glassCard}>
 {/* Header */}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2.5">
 {member.avatar_url ? (
 <img src={member.avatar_url} alt={member.name}
 className="w-8 h-8 rounded-full object-cover"
 style={{ border: '1.5px solid rgba(var(--ink),0.22)' }} />
 ) : (
 <div className="w-8 h-8 rounded-full flex items-center justify-center font-normal text-[10px]"
 style={{ background: 'rgba(var(--ink),0.08)', border: '1.5px solid rgba(var(--ink),0.22)', color: TEXT_PRIMARY }}>
 {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <p className="text-[12px] font-normal leading-tight" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
 <p className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{member.totalHours}h · {member.sessions} sesiones</p>
 </div>
 </div>
 {availableTypes.length > 1 && (
 <SportFilterDropdown value={filterType} onChange={setFilterType} types={availableTypes} />
 )}
 </div>

 {/* Mini calendario (izquierda) + ritmo vs media (derecha) */}
 <div className="flex items-center gap-2">
 <div style={{ width: '75%', flexShrink: 0 }}>
 <p className="text-[9px] font-normal mb-1" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'rgba(var(--accent-rgb),0.7)' }}>
 {MONTHS_ES[month]} {year}
 </p>
 <div className="grid grid-cols-7 gap-x-1 gap-y-1">
 {['L','M','X','J','V','S','D'].map(d => (
 <span key={`dow-${d}`} className="text-center text-[7px] font-normal"
 style={{ fontFamily: '"JetBrains Mono", monospace', color: 'rgba(var(--accent-rgb),0.55)' }}>
 {d}
 </span>
 ))}
 {trailing.map(i => (
 <div key={`t-${i}`} className="w-7 h-7 mx-auto" aria-hidden="true" />
 ))}
 {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
 const acts = member.actByDay[day] || [];
 const has = acts.length > 0;
 const matchesFilter = !filterType || acts.some(a => a.type === filterType);
 const show = has && matchesFilter;
 const planned = (plansByDay && plansByDay[day]) || [];
 const hasPlan = !has && planned.length > 0;
 const showPlan = hasPlan && !filterType;
 const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
 const isFuture = new Date(year, month, day) > now;
 const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const isPR = prDates.has(dateStr) && matchesFilter;
 const emoji = isPR ? '🏆'
 : show ? (ACTIVITY_TYPES[filterType || acts[0].type]?.emoji || '🏅')
 : showPlan ? (ACTIVITY_TYPES[planned[0].activity_type]?.emoji || '🏅') : null;
 const isExpanded = expandedDay === day;
 return (
 <div key={day}
 onClick={() => has && setExpandedDay(d => d === day ? null : day)}
 className="w-7 h-7 mx-auto flex items-center justify-center relative"
 style={{
 cursor: has ? 'pointer' : 'default',
 borderRadius: 7,
 ...(isToday ? { border: '1.5px solid rgba(var(--accent-rgb),0.9)' } : {}),
 background: (show || isPR)
 ? `radial-gradient(circle at center, rgba(var(--accent-rgb),${isExpanded ? 0.55 : 0.45}) 0%, rgba(var(--accent-rgb),0.03) 78%)`
 : 'transparent',
 }}>
 {!isToday && (
 <DashedFrame
 color={showPlan ? 'rgba(var(--accent-rgb),0.9)' : undefined}
 opacity={isFuture ? 0.22 : 0.45}
 />
 )}
 <span className="text-[8px] font-normal leading-none"
 style={{ fontFamily: '"JetBrains Mono", monospace', color: isFuture ? 'rgba(var(--accent-rgb),0.45)' : 'var(--accent)' }}>
 {day}
 </span>
 {isPR && <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 7, lineHeight: 1 }}>🏆</span>}
 </div>
 );
 })}
 </div>
 </div>
 <PaceRing pct={pacePct} chart={chart} />
 </div>

 {/* Desglose de actividades del mes */}
 {activityBreakdown.length > 0 && (
 <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(var(--ink),0.08)' }}>
 <p className="text-[9px] uppercase tracking-widest font-normal mb-2" style={{ color: TEXT_MUTED }}>
 Desglose del mes
 </p>
 <div className="space-y-1.5">
 {activityBreakdown.map(({ type, label, emoji, hours }) => {
 const pct = member.totalHours > 0 ? (hours / member.totalHours) * 100 : 0;
 return (
 <div key={type} className="flex items-center gap-2">
 <span className="text-[11px] w-4 text-center flex-shrink-0">{emoji}</span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-0.5">
 <span className="text-[10px] font-medium truncate" style={{ color: TEXT_SECONDARY }}>{label}</span>
 <span className="text-[10px] font-normal font-mono flex-shrink-0 ml-2" style={{ color: TEXT_PRIMARY }}>{hours}h</span>
 </div>
 <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--ink),0.08)' }}>
 <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Entrenos del día expandido */}
 {expandedDay && member.actByDay[expandedDay]?.length > 0 && (
 <div className="mt-2 space-y-1.5">
 <p className="text-[9px] uppercase tracking-widest font-normal px-0.5" style={{ color: TEXT_MUTED }}>
 {expandedDay} {['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][month]}
 </p>
 {member.actByDay[expandedDay].map((act, idx) => (
 <div key={idx} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
 style={{ background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.08)' }}>
 <span className="text-[13px]">{ACTIVITY_TYPES[act.type]?.emoji || '🏅'}</span>
 <div className="flex-1 min-w-0">
 <p className="text-[12px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>
 {ACTIVITY_TYPES[act.type]?.label || act.type}
 </p>
 {act.duration_minutes > 0 && (
 <p className="text-[10px]" style={{ color: TEXT_MUTED }}>{act.duration_minutes} min</p>
 )}
 </div>
 {act.match_result?.result && (
 <span className="text-[10px] font-normal px-1.5 py-0.5 rounded"
 style={{
 background: act.match_result.result === 'win' ? 'rgba(16,185,129,0.15)' : act.match_result.result === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(var(--ink),0.08)',
 color: act.match_result.result === 'win' ? 'var(--success)' : act.match_result.result === 'loss' ? 'var(--danger)' : TEXT_MUTED,
 }}>
 {act.match_result.result === 'win' ? 'Victoria' : act.match_result.result === 'loss' ? 'Derrota' : 'Empate'}
 </span>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Sección desplegable de Metas */}
 <button
 onClick={() => setGoalsOpen(v => !v)}
 className="w-full flex items-center justify-between mt-3 pt-3"
 style={{ borderTop: '1px solid rgba(var(--ink),0.08)' }}
 >
 <div className="flex items-center gap-1.5">
 <Trophy className="w-3 h-3" style={{ color: TEXT_MUTED }} />
 <span className="text-[10px] font-normal uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
 Metas {memberGoals.length > 0 ? `(${memberGoals.length})` : ''}
 </span>
 </div>
 <ChevronDown
 className="w-3.5 h-3.5 transition-transform"
 style={{ color: TEXT_MUTED, transform: goalsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
 />
 </button>

 {goalsOpen && (
 <div className="mt-2 space-y-2">
 {memberGoals.length === 0 ? (
 <p className="text-[11px] text-center py-2" style={{ color: TEXT_MUTED }}>Sin metas registradas</p>
 ) : (
 memberGoals.map(goal => (
 <div key={goal.id} className="flex items-center justify-between rounded-lg px-3 py-2"
 style={{ background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.08)' }}>
 <div className="min-w-0">
 <p className="text-[12px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{goal.title}</p>
 {goal.activity_type && (
 <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
 {ACTIVITY_TYPES[goal.activity_type]?.emoji} {ACTIVITY_TYPES[goal.activity_type]?.label}
 </p>
 )}
 </div>
 {goal.current_value != null && (
 <div className="text-right flex-shrink-0 ml-2">
 <span className="text-[16px] font-normal font-mono" style={{ color: ACCENT }}>
 {goal.current_value}
 </span>
 <span className="text-[10px] ml-0.5" style={{ color: TEXT_MUTED }}>{goal.unit}</span>
 </div>
 )}
 </div>
 ))
 )}
 </div>
 )}
 </div>
 );
}
