import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Flame, CalendarCheck, Zap, Timer, Layers, Shuffle, Repeat, Sun, AudioWaveform, Target, Sunrise, Medal } from 'lucide-react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useAuth } from '@/lib/AuthContext';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useTeamGoals } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { buildSeasonalSeries, formatHours } from '@/utils/seasonal';
import ActivityFilterButton from '@/components/ActivityFilterButton';
import MemberSheet from '@/components/MemberSheet';
import { RaceReplaySheet } from '@/components/RaceReplay';
import { categoryOf } from '@/utils/activityIcons';
import { readPalette, blendCats } from '@/utils/blendColors';
import { computeTeamRecords } from '@/utils/teamRecords';
import { useObjectives } from '@/hooks/useObjectives';
import { objectiveProgress } from '@/utils/objectives';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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
 <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize="8" fontWeight="400"
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
 border: '1px solid var(--glass-border)',
};

function CustomTooltip({ active, payload, label, memberStats, isTeam, unit = 'h', colors = {} }) {
 if (!active || !payload?.length) return null;
 return (
 <div style={{
 background: 'var(--surface)',
 border: '1px solid rgba(var(--ink),0.15)',
 borderRadius: 16, padding: '8px 12px', fontSize: 11,
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
 <div style={{ width: 7, height: 7, borderRadius: 2, background: colors[entry.dataKey] || (String(entry.color).startsWith('url') ? 'rgba(var(--ink),0.5)' : entry.color) || entry.fill }} />
 <span style={{ color: 'rgba(var(--ink),0.85)' }}>{m?.name || entry.name}</span>
 </div>
 <span style={{ color: 'rgba(var(--ink),0.95)' }}>{entry.value}{unit}</span>
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
 ? <img src={m.avatar_url} alt={m.name} className="rounded-full object-cover flex-shrink-0 img-outline" style={style} />
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
 <motion.button key={r.key} onClick={() => onOpenMember(r.holder.email)}
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
 const { allActivities, loading: dataLoading } = useActivities(new Date());
 const { members } = useTeamMembers();
 const { plans: weeklyPlans } = useWeeklyPlans();
 const teamGoals = useTeamGoals();
 const { objectives } = useObjectives();
 const raceMetric = 'hours'; // la carrera se mide en horas
 const [snapshot, setSnapshot] = useState('month'); // 'week' | 'month' | '90d'
 const [seasonTF, setSeasonTF] = useState('1m');
 const [typeFilter, setTypeFilter] = useState(null);
 const [openMember, setOpenMember] = useState(null);
 const [replay, setReplay] = useState(false);

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
 const { chartData, memberStats, raceDays } = useMemo(() => {
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
 byDay[k] = byDay[k] || { mins: 0, n: 0, cats: {} };
 byDay[k].mins += a.duration_minutes || 0;
 byDay[k].n += 1;
 const cat = categoryOf(a.type);
 byDay[k].cats[cat] = (byDay[k].cats[cat] || 0) + (a.duration_minutes || 0);
 });
 let cm = 0, cn = 0;
 const catAcc = {};
 const cum = days.map(d => {
 const b = byDay[dstr(d)];
 cm += b?.mins || 0; cn += b?.n || 0;
 Object.entries(b?.cats || {}).forEach(([c, m]) => { catAcc[c] = (catAcc[c] || 0) + m; });
 return { h: +(cm / 60).toFixed(1), n: cn, c: { ...catAcc } };
 });
 const totalMins = win.reduce((s, a) => s + (a.duration_minutes || 0), 0);
 return {
 email,
 name: member?.full_name || email.split('@')[0],
 avatar_url: member?.avatar_url || null,
 totalMins, totalHours: +(totalMins / 60).toFixed(1), sessions: win.length,

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
 return { chartData: data, memberStats: stats, raceDays: days };
 }, [acts, emails, members, snapshot, raceMetric]);

 const lastIdx = chartData.length - 1;
 const catPalette = useMemo(() => readPalette(), [CH]); // CH cambia con el tema
 const memberColor = useMemo(() => Object.fromEntries(memberStats.map(m =>
 [m.email, blendCats(m.cum[m.cum.length - 1]?.c, catPalette)])), [memberStats, catPalette]);
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

 // Carga en frío: hueco neutro en vez del destello de «Sin actividad de equipo»
 if (emails.length === 0 && dataLoading) {
 return <div aria-busy="true" className="px-4 py-5 max-w-lg mx-auto"><div className="o-skeleton" style={{ height: 220, borderRadius: 24 }} /></div>;
 }
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
 className="px-2.5 py-1 rounded-full text-[10px] transition-ui whitespace-nowrap"
 style={value === key ? { background: 'rgba(var(--ink),0.1)', color: TEXT_PRIMARY } : { color: TEXT_MUTED }}>
 {lbl}
 </button>
 ))}
 </div>
 );

 const snapLabel = snapshot === 'week' ? 'últimos 7 días' : snapshot === 'month' ? `${MONTHS_ES[month]} ${year}` : 'últimos 3 meses, ventana móvil';
 const openData = openMember && monthStats.find(m => m.email === openMember);

 return (
 <div className="px-4 pt-2 pb-5 space-y-4 max-w-lg mx-auto">
 {/* ── Carrera — semana / mes / 3 meses móviles ── */}
 <div className="pt-1 pb-0">
 {/* Una sola fila: ventana · título · repetición + filtro */}
 <div className="grid items-center mb-1" style={{ gridTemplateColumns: '1fr auto 1fr', minHeight: 32 }}>
 <div className="justify-self-start">{pill(SNAPSHOTS.map(s => [s.key, s.label]), snapshot, setSnapshot)}</div>
 <h2 className="px-2" style={SECTION_TITLE}>Carrera</h2>
 <div className="justify-self-end flex items-center gap-1.5">
 <button onClick={() => setReplay(true)}
 className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-150 ease-out enabled:active:scale-[0.96]"
 style={glassBar} aria-label="Ver la repetición de la carrera">
 <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 1.5 L10 6 L3 10.5Z" fill="var(--accent)" /></svg>
 </button>
 <ActivityFilterButton value={typeFilter} onChange={setTypeFilter} types={usedTypes} labels={typeLabels} />
 </div>
 </div>
 <div className="h-[290px] -mx-1">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={chartData} margin={{ top: 14, right: 26, bottom: 0, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
 <XAxis dataKey="label" tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }} tickLine={false}
 interval={Math.max(0, Math.floor(chartData.length / 4) - 1)} minTickGap={16} />
 <YAxis domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 9, fill: CH.tick }} axisLine={false} tickLine={false} width={24} />
 <Tooltip content={<CustomTooltip memberStats={memberStats} unit={raceUnit} isTeam colors={memberColor} />} />
 {teamAverage > 0 && (
 <ReferenceLine y={teamAverage} stroke={CH.ref} strokeDasharray="4 4" strokeWidth={1}
 label={{ value: `Media ${teamAverage}${raceMetric === 'count' ? ' act' : 'h'}`, position: 'insideTopLeft', fill: CH.refLabel, fontSize: 9, offset: 6 }} />
 )}
 {/* Color de cada línea = mezcla de sus actividades; degradado a lo largo
 del tiempo con la mezcla acumulada de cada día de la ventana */}
 <defs>
 {memberStats.map((m, idx) => (
 <linearGradient key={m.email} id={`race-lg-${idx}`} x1="0" y1="0" x2="1" y2="0">
 {chartData.map((_, k) => (
 <stop key={k} offset={lastIdx ? k / lastIdx : 0}
 stopColor={blendCats(k === 0 ? m.cum[0]?.c : m.cum[k - 1]?.c, catPalette)} />
 ))}
 </linearGradient>
 ))}
 </defs>
 {memberStats.map((m, idx) => {
 const finalColor = memberColor[m.email];
 // Línea plana (sin actividad) → color sólido: un degradado en un trazo sin altura no se ve
 const stroke = m.totalMins > 0 ? `url(#race-lg-${idx})` : finalColor;
 return (
 <Line key={m.email} type="monotone" dataKey={m.email} stroke={stroke}
 strokeWidth={idx === 0 ? 2.5 : 2}
 dot={(p) => p.index === lastIdx ? makeMemberDot({ ...m, color: finalColor }, lastIdx, CH.onAccent)({ ...p, payload: { day: lastIdx } }) : null}
 activeDot={{ r: 3, fill: finalColor, strokeWidth: 0 }} isAnimationActive={false} />
 );
 })}
 </LineChart>
 </ResponsiveContainer>
 </div>

 </div>

 {/* ── Miembros — continúa la carrera, sin separador ── */}
 <div className="-mt-2 pb-4">
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
 boxShadow: isToday ? '0 0 0 1px var(--today)' : 'none',
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

 <AnimatePresence>
 {replay && (
 <RaceReplaySheet
 key={`${snapshot}-${raceMetric}-${typeFilter || 'all'}`}
 title={`Carrera · ${SNAPSHOTS.find(x => x.key === snapshot)?.label}${typeFilter ? ` · ${typeLabels[typeFilter]}` : ''}`}
 days={raceDays}
 unit={raceMetric === 'count' ? '' : 'h'}
 members={memberStats.map(m => ({
 email: m.email, name: m.name, avatar_url: m.avatar_url,
 values: [0, ...m.cum.map(c => (raceMetric === 'count' ? c.n : c.h))],
 cats: [{}, ...m.cum.map(c => c.c)],
 }))}
 onClose={() => setReplay(false)}
 />
 )}
 </AnimatePresence>

 <AnimatePresence>
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
 </AnimatePresence>
 </div>
 );
}
