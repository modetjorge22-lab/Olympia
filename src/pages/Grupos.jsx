import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Zap, Trophy, ChevronDown, Activity } from 'lucide-react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWeeklyPlans } from '@/hooks/useWeeklyPlans';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { DAY_PALETTE } from '@/utils/dayDisplay';
import { useTeamGoals } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Gradiente vino según ranking — líder en vino oscuro, descendiendo a vino claro
function rankingWine(rank, total) {
 if (total <= 1) return '#7a1a2a';
 const t = rank / (total - 1);
 const from = { r: 82, g: 16, b: 30 };    // vino oscuro (líder)
 const to = { r: 205, g: 150, b: 160 };   // vino claro / rosado
 const r = Math.round(from.r + (to.r - from.r) * t);
 const g = Math.round(from.g + (to.g - from.g) * t);
 const b = Math.round(from.b + (to.b - from.b) * t);
 return `rgb(${r},${g},${b})`;
}

function makeMemberDot(member, lastDay) {
 return function MemberDot(props) {
 const { cx, cy, payload } = props;
 if (cx == null || cy == null) return null;
 if (payload.day !== lastDay) return null;
 const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
 const radius = 8;
 return (
 <g>
 <circle cx={cx} cy={cy} r={radius + 1.5} fill="rgba(245,237,224,0.95)" stroke={member.color} strokeWidth="1.5" />
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
 <circle cx={cx} cy={cy} r={radius} fill={member.color} fillOpacity="0.25" />
 <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize="7" fontWeight="700"
 fill={member.color} style={{ fontFamily: 'DM Sans, sans-serif' }}>
 {initials}
 </text>
 </>
 )}
 </g>
 );
 };
}

const glassCard = {
 background: 'rgba(249,244,236,0.92)',
 border: '1px solid rgba(255,255,255,0.35)',
 boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
};

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';

function CustomTooltip({ active, payload, label, memberStats, isTeam, unit = 'h' }) {
 if (!active || !payload?.length) return null;
 return (
 <div style={{
 background: '#2a121a',
 border: '1px solid rgba(245,237,224,0.15)',
 borderRadius: 10, padding: '8px 12px', fontSize: 11,
 boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 110,
 }}>
 <p style={{ color: 'rgba(245,237,224,0.5)', fontSize: 10, marginBottom: 4 }}>
 {isTeam ? label : `Día ${label}`}
 </p>
 {payload.map((entry, i) => {
 const m = memberStats?.find(s => s.email === entry.dataKey);
 return (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: i === 0 ? 0 : 3 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
 <div style={{ width: 7, height: 7, borderRadius: 2, background: entry.color || entry.fill }} />
 <span style={{ color: 'rgba(245,237,224,0.85)' }}>{m?.name || entry.name}</span>
 </div>
 <span style={{ color: '#ffffff', fontWeight: 600 }}>{entry.value}{unit}</span>
 </div>
 );
 })}
 </div>
 );
}

export default function Grupos() {
 const { currentMonth } = useMonth();
 const { user } = useAuth();
 const { allActivities } = useActivities(currentMonth);
 const { members } = useTeamMembers();
 const { plans: weeklyPlans } = useWeeklyPlans();
 const teamGoals = useTeamGoals();
 const [showAllActs, setShowAllActs] = useState(false);
 const [expandedActType, setExpandedActType] = useState(null);
 const [raceMetric, setRaceMetric] = useState('hours'); // 'hours' | 'count'

 // PR achievements del equipo para colorear mini calendarios
 const [teamPrAchievements, setTeamPrAchievements] = useState([]);
 useEffect(() => {
 supabase.from('pr_achievements').select('user_email, date')
 .then(({ data }) => { if (data) setTeamPrAchievements(data); });
 }, []);

 // Map email → Set de fechas PR
 const memberPrDates = useMemo(() => {
 const map = {};
 teamPrAchievements.forEach(pr => {
 if (!map[pr.user_email]) map[pr.user_email] = new Set();
 map[pr.user_email].add(pr.date);
 });
 return map;
 }, [teamPrAchievements]);

 const year = currentMonth.getFullYear();
 const month = currentMonth.getMonth();
 const daysInMonth = new Date(year, month + 1, 0).getDate();

 // Día del mes navegado → planes propios (sólo del usuario actual; los planes de otros son privados)
 const myPlansByDayOfMonth = useMemo(() => {
 const map = {};
 if (!user?.email) return map;
 weeklyPlans.forEach(p => {
 const d = new Date(p.date + 'T00:00:00');
 if (d.getFullYear() === year && d.getMonth() === month) {
 const day = d.getDate();
 if (!map[day]) map[day] = [];
 map[day].push(p);
 }
 });
 return map;
 }, [weeklyPlans, year, month, user?.email]);

 const { chartData, memberStats } = useMemo(() => {
 const emails = members.length > 0
 ? members.map(m => m.email)
 : [...new Set(allActivities.map(a => a.user_email))];

 const stats = emails.map((email, idx) => {
 const member = members.find(m => m.email === email);
 const monthActs = allActivities.filter(a => {
 const d = new Date(a.date);
 return a.user_email === email && d.getFullYear() === year && d.getMonth() === month;
 });
 const totalMins = monthActs.reduce((s, a) => s + (a.duration_minutes || 0), 0);

 const dailyMins = {};
 const dailyCount = {};
 monthActs.forEach(a => {
 const day = new Date(a.date).getDate();
 dailyMins[day] = (dailyMins[day] || 0) + (a.duration_minutes || 0);
 dailyCount[day] = (dailyCount[day] || 0) + 1;
 });

 let cum = 0;
 let cumC = 0;
 const cumByDay = {};       // horas acumuladas
 const cumByDayCount = {};  // nº de actividades acumuladas
 for (let d = 1; d <= daysInMonth; d++) {
 cum += (dailyMins[d] || 0);
 cumC += (dailyCount[d] || 0);
 cumByDay[d] = +(cum / 60).toFixed(1);
 cumByDayCount[d] = cumC;
 }

 const actByDay = {};
 monthActs.forEach(a => {
 const day = new Date(a.date).getDate();
 if (!actByDay[day]) actByDay[day] = [];
 actByDay[day].push(a);
 });

 // Desglose por tipo de actividad
 const byType = {};
 monthActs.forEach(a => {
 if (!byType[a.type]) byType[a.type] = 0;
 byType[a.type] += a.duration_minutes || 0;
 });
 const activityBreakdown = Object.entries(byType)
 .map(([type, mins]) => ({
 type,
 label: ACTIVITY_TYPES[type]?.label || type,
 emoji: ACTIVITY_TYPES[type]?.emoji || '🏅',
 hours: +(mins / 60).toFixed(1),
 }))
 .sort((a, b) => b.hours - a.hours);

 return {
 email,
 name: member?.full_name || email.split('@')[0],
 avatar_url: member?.avatar_url || null,
 totalHours: +(totalMins / 60).toFixed(1),
 totalMins, sessions: monthActs.length,
 color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
 cumByDay, cumByDayCount, actByDay, activityBreakdown,
 };
 }).sort((a, b) => b.totalMins - a.totalMins);

 const today = new Date();
 const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
 const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

 const data = [];
 // Punto inicial en 0 (origen del mes) para que el progreso arranque desde 0
 // y la línea ya se vea el día 1 aunque sólo haya un día con actividad.
 const zeroPoint = { day: 0 };
 stats.forEach(m => { zeroPoint[m.email] = 0; });
 data.push(zeroPoint);
 for (let d = 1; d <= lastDay; d++) {
 const point = { day: d };
 stats.forEach(m => { point[m.email] = raceMetric === 'count' ? m.cumByDayCount[d] : m.cumByDay[d]; });
 data.push(point);
 }
 return { chartData: data, memberStats: stats };
 }, [allActivities, members, year, month, daysInMonth, raceMetric]);

 // Horas del equipo por actividad (mes navegado) — suma por deporte + desglose por miembro
 const teamActivityBreakdown = useMemo(() => {
 const byType = {};
 memberStats.forEach(m => {
 (m.activityBreakdown || []).forEach(({ type, label, emoji, hours }) => {
 if (hours <= 0) return;
 if (!byType[type]) byType[type] = { type, label, emoji, hours: 0, contributors: [] };
 byType[type].hours += hours;
 byType[type].contributors.push({ email: m.email, name: m.name, avatar_url: m.avatar_url, hours });
 });
 });
 return Object.values(byType)
 .map(t => ({
 ...t,
 hours: +t.hours.toFixed(1),
 contributors: [...t.contributors].sort((a, b) => b.hours - a.hours),
 }))
 .sort((a, b) => b.hours - a.hours);
 }, [memberStats]);

 // Burbuja al final de cada línea (todas en lastDay).
 // Las distintas alturas de cada miembro las separan visualmente en vertical.
 const lastDay = chartData.length > 0 ? chartData[chartData.length - 1].day : daysInMonth;

 // Media del equipo para la línea de referencia
 const teamAverage = useMemo(() => {
 if (memberStats.length === 0) return null;
 const total = memberStats.reduce((s, m) => s + (raceMetric === 'count' ? m.sessions : m.totalHours), 0);
 return +(total / memberStats.length).toFixed(1);
 }, [memberStats, raceMetric]);

 const raceUnit = raceMetric === 'count' ? '' : 'h';

 if (memberStats.length === 0) {
 return (
 <div className="px-4 py-5 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh]">
 <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
 style={{ background: 'rgba(245,237,224,0.08)', border: '1px solid rgba(245,237,224,0.12)' }}>
 <Users className="w-6 h-6" style={{ color: 'rgba(245,237,224,0.75)' }} />
 </div>
 <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'rgba(245,237,224,0.92)' }}>Sin actividad de equipo</h2>
 <p className="text-[13px] text-center" style={{ color: 'rgba(245,237,224,0.5)' }}>Los datos del grupo aparecerán aquí</p>
 </div>
 );
 }

 return (
 <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
 {/* Carrera mensual + horas por actividad (mismo marco) */}
 <div className="rounded-2xl p-4" style={glassCard}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
 <TrendingUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Carrera mensual</h2>
 <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{raceMetric === 'count' ? 'Actividades acumuladas' : 'Horas acumuladas'} · {MONTHS_ES[month]} {year}</p>
 </div>
 </div>
 <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(42,26,17,0.06)' }}>
 {[['hours', 'Horas'], ['count', 'Nº']].map(([key, lbl]) => (
 <button
 key={key}
 onClick={() => setRaceMetric(key)}
 className="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
 style={raceMetric === key
 ? { background: '#7a1a2a', color: 'rgba(245,237,224,0.95)' }
 : { background: 'transparent', color: TEXT_MUTED }}
 >
 {lbl}
 </button>
 ))}
 </div>
 </div>
 <div className="h-[340px] -mx-1">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={chartData} margin={{ top: 16, right: 28, bottom: 0, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,26,17,0.08)" />
 <XAxis dataKey="day" tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={Math.floor(daysInMonth / 4) - 1} />
 <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={24} />
 <Tooltip content={<CustomTooltip memberStats={memberStats} unit={raceUnit} />} />
 {teamAverage !== null && teamAverage > 0 && (
 <ReferenceLine
 y={teamAverage}
 stroke="rgba(42,26,17,0.35)"
 strokeDasharray="4 4"
 strokeWidth={1}
 label={{
 value: raceMetric === 'count' ? `Media ${teamAverage} act` : `Media ${teamAverage}h`,
 position: 'insideTopLeft',
 fill: 'rgba(42,26,17,0.5)',
 fontSize: 9,
 offset: 6,
 }}
 />
 )}
 {memberStats.map((m, idx) => {
 const lineColor = rankingWine(idx, memberStats.length);
 return (
 <Line
 key={m.email}
 type="monotone"
 dataKey={m.email}
 stroke={lineColor}
 strokeWidth={idx === 0 ? 2.5 : 2}
 dot={makeMemberDot({ ...m, color: lineColor }, lastDay)}
 activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
 isAnimationActive={false}
 />
 );
 })}
 </LineChart>
 </ResponsiveContainer>
 </div>

 {/* Horas por actividad — debajo de la carrera, dentro del mismo marco */}
 {teamActivityBreakdown.length > 0 && (() => {
 const maxHours = teamActivityBreakdown[0].hours || 1;
 const visible = showAllActs ? teamActivityBreakdown : teamActivityBreakdown.slice(0, 5);
 const hiddenCount = teamActivityBreakdown.length - 5;
 return (
 <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(42,26,17,0.1)' }}>
 <div className="flex items-center gap-2 mb-3">
 <Activity className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
 <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: TEXT_MUTED }}>Horas por actividad · equipo</p>
 </div>
 <div className="space-y-2.5">
 {visible.map(({ type, label, hours, contributors }) => {
 const pct = (hours / maxHours) * 100;
 const isOpen = expandedActType === type;
 return (
 <div key={type}>
 <button
 onClick={() => setExpandedActType(o => o === type ? null : type)}
 className="w-full flex items-center gap-2"
 >
 <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
 style={{ color: TEXT_MUTED, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[12px] font-medium truncate" style={{ color: TEXT_SECONDARY }}>{label}</span>
 <span className="text-[12px] font-bold font-mono flex-shrink-0 ml-2" style={{ color: TEXT_PRIMARY }}>{hours}h</span>
 </div>
 <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(42,26,17,0.08)' }}>
 <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#4d0f1a' }} />
 </div>
 </div>
 </button>
 {isOpen && contributors.length > 0 && (
 <div className="mt-2 ml-[22px] space-y-1.5">
 {contributors.map(c => {
 const cpct = hours > 0 ? (c.hours / hours) * 100 : 0;
 return (
 <div key={c.email} className="flex items-center gap-2">
 {c.avatar_url ? (
 <img src={c.avatar_url} alt={c.name} className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
 style={{ border: '1px solid rgba(42,26,17,0.18)' }} />
 ) : (
 <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[8px] flex-shrink-0"
 style={{ background: 'rgba(42,26,17,0.08)', border: '1px solid rgba(42,26,17,0.18)', color: TEXT_PRIMARY }}>
 {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-0.5">
 <span className="text-[11px] truncate" style={{ color: TEXT_SECONDARY }}>{c.name}</span>
 <span className="text-[11px] font-bold font-mono flex-shrink-0 ml-2" style={{ color: TEXT_PRIMARY }}>{c.hours}h</span>
 </div>
 <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(42,26,17,0.08)' }}>
 <div className="h-full rounded-full" style={{ width: `${cpct}%`, background: 'rgba(77,15,26,0.55)' }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 {hiddenCount > 0 && (
 <button
 onClick={() => setShowAllActs(v => !v)}
 className="w-full flex items-center justify-center gap-1.5 mt-3 pt-3"
 style={{ borderTop: '1px solid rgba(42,26,17,0.08)' }}
 >
 <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
 {showAllActs ? 'Ver menos' : `Ver ${hiddenCount} más`}
 </span>
 <ChevronDown className="w-3.5 h-3.5 transition-transform"
 style={{ color: TEXT_MUTED, transform: showAllActs ? 'rotate(180deg)' : 'rotate(0deg)' }} />
 </button>
 )}
 </div>
 );
 })()}
 </div>

 {/* Ranking */}
 <div className="rounded-2xl overflow-hidden" style={glassCard}>
 <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
 <Zap className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Ranking · {MONTHS_ES[month]}</h2>
 </div>
 {memberStats.map((member, idx) => {
 const pct = memberStats[0].totalHours > 0 ? (member.totalHours / memberStats[0].totalHours) * 100 : 0;
 const rankColor = rankingWine(idx, memberStats.length);
 return (
 <div key={member.email} className={`px-4 py-3 ${idx < memberStats.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
 <div className="flex items-center gap-3">
 <span className="text-[12px] font-bold w-5" style={{ color: TEXT_MUTED }}>#{idx + 1}</span>
 {member.avatar_url ? (
 <img
 src={member.avatar_url}
 alt={member.name}
 className="w-8 h-8 rounded-xl object-cover"
 style={{ border: '1.5px solid rgba(42,26,17,0.18)' }}
 />
 ) : (
 <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px]"
 style={{ background: 'rgba(42,26,17,0.08)', border: '1.5px solid rgba(42,26,17,0.18)', color: '#2a1a11' }}>
 {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
 </div>
 )}
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1.5">
 <p className="text-[12px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
 <span className="text-[12px] font-bold font-mono" style={{ color: TEXT_PRIMARY }}>{member.totalHours}h</span>
 </div>
 <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(42,26,17,0.08)' }}>
 <div
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.8, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
 className="h-full rounded-full"
 style={{ background: rankColor }}
 />
 </div>
 </div>
 {idx === 0 && member.totalHours > 0 && <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7a1a2a' }} />}
 </div>
 </div>
 );
 })}
 </div>

 {/* Member cards */}
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 px-0.5" style={{ color: 'rgba(245,237,224,0.5)' }}>Miembros</p>
 <div className="space-y-3">
 {memberStats.map((member, idx) => (
 <MiniMemberCard
 key={member.email}
 member={member}
 year={year} month={month} daysInMonth={daysInMonth}
 plansByDay={member.email === user?.email ? myPlansByDayOfMonth : null}
 memberGoals={teamGoals.filter(g => g.user_email === member.email)}
 prDates={memberPrDates[member.email] || new Set()}
 activityBreakdown={member.activityBreakdown}
 />
 ))}
 </div>
 </div>
 </div>
 );
}

function MiniMemberCard({ member, year, month, daysInMonth, plansByDay, memberGoals = [], prDates = new Set(), activityBreakdown = [] }) {
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
 <div className="flex items-center gap-3">
 {member.avatar_url ? (
 <img src={member.avatar_url} alt={member.name}
 className="w-9 h-9 rounded-xl object-cover"
 style={{ border: '1.5px solid rgba(42,26,17,0.18)' }} />
 ) : (
 <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px]"
 style={{ background: 'rgba(42,26,17,0.08)', border: '1.5px solid rgba(42,26,17,0.18)', color: '#2a1a11' }}>
 {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <p className="text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
 <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>{member.totalHours}h · {member.sessions} sesiones</p>
 </div>
 </div>
 </div>

 {/* Filtro por actividad */}
 {availableTypes.length > 1 && (
 <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
 <button onClick={() => setFilterType(null)}
 className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-semibold transition-all"
 style={filterType === null ? { background: '#3a1622', color: 'rgba(245,237,224,0.95)' } : { background: 'rgba(42,26,17,0.06)', color: TEXT_MUTED }}>
 Todo
 </button>
 {availableTypes.map(t => (
 <button key={t} onClick={() => setFilterType(f => f === t ? null : t)} title={ACTIVITY_TYPES[t]?.label}
 className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[11px] transition-all"
 style={filterType === t ? { background: '#3a1622' } : { background: 'rgba(42,26,17,0.06)' }}>
 <span>{ACTIVITY_TYPES[t]?.emoji}</span>
 </button>
 ))}
 </div>
 )}

 {/* Mini calendario */}
 <div className="grid grid-cols-7 gap-[3px]">
 {trailing.map(i => (
 <div key={`t-${i}`} className="aspect-square" aria-hidden="true" />
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
 const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const isPR = prDates.has(dateStr) && matchesFilter;
 const emoji = isPR ? '🏆'
 : show ? (ACTIVITY_TYPES[filterType || acts[0].type]?.emoji || '🏅')
 : showPlan ? (ACTIVITY_TYPES[planned[0].activity_type]?.emoji || '🏅') : null;
 const isExpanded = expandedDay === day;
 return (
 <div key={day}
 onClick={() => has && setExpandedDay(d => d === day ? null : day)}
 className="aspect-square rounded-md flex flex-col items-center justify-center"
 style={{
 cursor: has ? 'pointer' : 'default',
 ...(isPR ? { background: DAY_PALETTE.pr.bg, boxShadow: DAY_PALETTE.pr.glow }
 : show ? { background: isExpanded ? '#4a202e' : '#3a1622', boxShadow: '0 1px 4px rgba(42,18,26,0.4)' }
 : showPlan ? { background: DAY_PALETTE.planned.bg, boxShadow: DAY_PALETTE.planned.glow }
 : isToday ? { background: 'rgba(42,26,17,0.14)', border: '1px solid rgba(42,26,17,0.22)' }
 : { background: 'rgba(42,26,17,0.07)' }),
 }}>
 <span className="text-[8px] font-semibold leading-none"
 style={{ color: isPR ? DAY_PALETTE.pr.text : show ? 'rgba(245,237,224,0.95)' : showPlan ? DAY_PALETTE.planned.text : isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}>
 {day}
 </span>
 {emoji && <span className="text-[7px] leading-none mt-0.5">{emoji}</span>}
 </div>
 );
 })}
 </div>

 {/* Desglose de actividades del mes */}
 {activityBreakdown.length > 0 && (
 <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(42,26,17,0.08)' }}>
 <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: TEXT_MUTED }}>
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
 <span className="text-[10px] font-bold font-mono flex-shrink-0 ml-2" style={{ color: TEXT_PRIMARY }}>{hours}h</span>
 </div>
 <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(42,26,17,0.08)' }}>
 <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#4d0f1a' }} />
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
 <p className="text-[9px] uppercase tracking-widest font-semibold px-0.5" style={{ color: TEXT_MUTED }}>
 {expandedDay} {['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][month]}
 </p>
 {member.actByDay[expandedDay].map((act, idx) => (
 <div key={idx} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
 style={{ background: 'rgba(42,26,17,0.05)', border: '1px solid rgba(42,26,17,0.08)' }}>
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
 <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
 style={{
 background: act.match_result.result === 'win' ? 'rgba(16,185,129,0.15)' : act.match_result.result === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(42,26,17,0.08)',
 color: act.match_result.result === 'win' ? '#047857' : act.match_result.result === 'loss' ? '#b91c1c' : TEXT_MUTED,
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
 style={{ borderTop: '1px solid rgba(42,26,17,0.08)' }}
 >
 <div className="flex items-center gap-1.5">
 <Trophy className="w-3 h-3" style={{ color: TEXT_MUTED }} />
 <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
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
 style={{ background: 'rgba(42,26,17,0.05)', border: '1px solid rgba(42,26,17,0.08)' }}>
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
 <span className="text-[16px] font-bold font-mono" style={{ color: '#7a1a2a' }}>
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
