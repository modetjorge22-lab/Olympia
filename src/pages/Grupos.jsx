import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Zap } from 'lucide-react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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

function CustomTooltip({ active, payload, label, memberStats, isTeam }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#281811',
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
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{entry.value}h</span>
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

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
      monthActs.forEach(a => {
        const day = new Date(a.date).getDate();
        dailyMins[day] = (dailyMins[day] || 0) + (a.duration_minutes || 0);
      });

      let cum = 0;
      const cumByDay = {};
      for (let d = 1; d <= daysInMonth; d++) {
        cum += (dailyMins[d] || 0);
        cumByDay[d] = +(cum / 60).toFixed(1);
      }

      const actByDay = {};
      monthActs.forEach(a => {
        const day = new Date(a.date).getDate();
        if (!actByDay[day]) actByDay[day] = [];
        actByDay[day].push(a);
      });

      return {
        email,
        name: member?.full_name || email.split('@')[0],
        avatar_url: member?.avatar_url || null,
        totalHours: +(totalMins / 60).toFixed(1),
        totalMins, sessions: monthActs.length,
        color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        cumByDay, actByDay,
      };
    }).sort((a, b) => b.totalMins - a.totalMins);

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const data = [];
    for (let d = 1; d <= lastDay; d++) {
      const point = { day: d };
      stats.forEach(m => { point[m.email] = m.cumByDay[d]; });
      data.push(point);
    }
    return { chartData: data, memberStats: stats };
  }, [allActivities, members, year, month, daysInMonth]);

  const weeklyBreakdown = useMemo(() => {
    const weeks = [];
    const refDate = new Date(year, month + 1, 0);
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(refDate);
      weekEnd.setDate(refDate.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      const weekActs = allActivities.filter(a => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      });
      const horas = +(weekActs.reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1);
      weeks.push({ label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`, horas });
    }
    return weeks;
  }, [allActivities, year, month]);

  const totalTeamHours = memberStats.reduce((s, m) => s + m.totalHours, 0).toFixed(0);
  const totalSessions = memberStats.reduce((s, m) => s + m.sessions, 0);

  if (memberStats.length === 0) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Users className="w-6 h-6" style={{ color: '#4338ca' }} />
        </div>
        <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'rgba(245,237,224,0.92)' }}>Sin actividad de equipo</h2>
        <p className="text-[13px] text-center" style={{ color: 'rgba(245,237,224,0.5)' }}>Los datos del grupo aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <h1 className="text-[17px] font-bold" style={{ color: 'rgba(245,237,224,0.92)' }}>Grupos</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Horas equipo', value: `${totalTeamHours}h`, icon: '⏱️' },
          { label: 'Sesiones', value: totalSessions, icon: '🏃' },
          { label: 'Miembros', value: memberStats.length, icon: '👥' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl p-3.5 flex flex-col items-center" style={glassCard}>
            <span className="text-base mb-1">{s.icon}</span>
            <span className="text-[20px] font-bold font-mono" style={{ color: TEXT_PRIMARY }}>{s.value}</span>
            <span className="text-[9px] mt-0.5 text-center" style={{ color: TEXT_MUTED }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Monthly race chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Carrera mensual</h2>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Horas acumuladas · {MONTHS_ES[month]} {year}</p>
          </div>
        </div>
        <div className="h-[180px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,26,17,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={Math.floor(daysInMonth / 4) - 1} />
              <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<CustomTooltip memberStats={memberStats} />} />
              {memberStats.map(m => (
                <Line key={m.email} type="monotone" dataKey={m.email} stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: m.color, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Ranking */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glassCard}>
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: '#d97706' }} />
          <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Ranking · {MONTHS_ES[month]}</h2>
        </div>
        {memberStats.map((member, idx) => {
          const isMe = member.email === user?.email;
          const pct = memberStats[0].totalHours > 0 ? (member.totalHours / memberStats[0].totalHours) * 100 : 0;
          return (
            <div key={member.email} className={`px-4 py-3 ${idx < memberStats.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold w-5" style={{ color: TEXT_MUTED }}>#{idx + 1}</span>
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="w-8 h-8 rounded-xl object-cover"
                    style={{ border: `1.5px solid ${member.color}50` }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px]"
                    style={{ background: `${member.color}35`, border: `1.5px solid ${member.color}50`, color: '#2a1a11' }}>
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-semibold" style={{ color: isMe ? '#4338ca' : TEXT_PRIMARY }}>{isMe ? 'Tú' : member.name}</p>
                    <span className="text-[12px] font-bold font-mono" style={{ color: member.color }}>{member.totalHours}h</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(42,26,17,0.08)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${member.color}90, ${member.color})` }}
                    />
                  </div>
                </div>
                {idx === 0 && member.totalHours > 0 && <span className="text-sm">🏆</span>}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Weekly team load */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
            <span className="text-sm">📊</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Carga semanal del equipo</h2>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Últimas 12 semanas</p>
          </div>
        </div>
        <div className="h-[130px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyBreakdown} barCategoryGap="24%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={22} />
              <Tooltip cursor={{ fill: 'rgba(42,26,17,0.04)' }}
                content={(props) => <CustomTooltip {...props} isTeam />} />
              <Bar dataKey="horas" name="Horas" fill="rgba(99,102,241,0.75)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Member cards */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 px-0.5" style={{ color: 'rgba(245,237,224,0.5)' }}>Miembros</p>
        <div className="space-y-3">
          {memberStats.map((member, idx) => (
            <MiniMemberCard key={member.email} member={member} year={year} month={month} daysInMonth={daysInMonth} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMemberCard({ member, year, month, daysInMonth }) {
  const now = new Date();
  let startDow = new Date(year, month, 1).getDay() - 1;
  if (startDow < 0) startDow = 6;
  const prevLast = new Date(year, month, 0).getDate();
  const trailing = [];
  for (let i = startDow - 1; i >= 0; i--) trailing.push(prevLast - i);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4" style={glassCard}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-9 h-9 rounded-xl object-cover"
              style={{ border: `1.5px solid ${member.color}50` }}
            />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px]"
              style={{ background: `${member.color}35`, border: `1.5px solid ${member.color}50`, color: '#2a1a11' }}>
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
            <p className="text-[11px]" style={{ color: '#2a1a11' }}>{member.totalHours}h · {member.sessions} sesiones</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {trailing.map(d => (
          <div key={`t-${d}`} className="aspect-square rounded-md flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.04)' }}>
            <span className="text-[8px]" style={{ color: 'rgba(42,26,17,0.3)' }}>{d}</span>
          </div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const acts = member.actByDay[day] || [];
          const has = acts.length > 0;
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;
          return (
            <div key={day} className="aspect-square rounded-md flex flex-col items-center justify-center"
              style={has ? {
                background: '#8fa898',
                boxShadow: '0 1px 4px rgba(143,168,152,0.25)',
              } : isToday ? {
                background: 'rgba(42,26,17,0.14)', border: '1px solid rgba(42,26,17,0.22)',
              } : {
                background: 'rgba(42,26,17,0.07)',
              }}>
              <span className="text-[8px] font-semibold leading-none"
                style={{ color: has ? '#1c2620' : isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}>{day}</span>
              {emoji && <span className="text-[7px] leading-none mt-0.5">{emoji}</span>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
