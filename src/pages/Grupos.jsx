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
  background: '#17171f',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

const tooltipStyle = {
  backgroundColor: 'rgba(11,11,15,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 11,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

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
        totalHours: +(totalMins / 60).toFixed(1),
        totalMins,
        sessions: monthActs.length,
        color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        cumByDay,
        actByDay,
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
      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        horas: +(weekActs.reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60).toFixed(1),
      });
    }
    return weeks;
  }, [allActivities, year, month]);

  const totalTeamHours = memberStats.reduce((s, m) => s + m.totalHours, 0).toFixed(1);
  const totalSessions = memberStats.reduce((s, m) => s + m.sessions, 0);

  if (memberStats.length === 0) {
    return (
      <div className="px-4 max-w-lg mx-auto flex flex-col items-center justify-center py-24">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Users className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="text-[15px] font-semibold text-zinc-300 mb-1">Sin actividad de equipo</h2>
        <p className="text-[13px] text-zinc-600 text-center">Los datos del grupo aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <h1 className="text-[17px] font-bold text-zinc-100">Grupos</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Horas equipo', value: `${totalTeamHours}h`, icon: '⏱️', accent: '#6366f1' },
          { label: 'Sesiones', value: totalSessions, icon: '🏃', accent: '#10b981' },
          { label: 'Miembros', value: memberStats.length, icon: '👥', accent: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl p-3.5 flex flex-col items-center"
            style={{ ...glassCard, boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 20px ${s.accent}08` }}>
            <span className="text-base mb-1">{s.icon}</span>
            <span className="text-[20px] font-bold text-zinc-100 font-mono">{s.value}</span>
            <span className="text-[9px] text-zinc-600 mt-0.5 text-center">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Monthly race chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-zinc-100">Carrera mensual</h2>
            <p className="text-[11px] text-zinc-600">Horas acumuladas · {MONTHS_ES[month]} {year}</p>
          </div>
        </div>
        <div className="h-[180px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={Math.floor(daysInMonth / 4) - 1} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={d => `Día ${d}`} formatter={(v, name) => {
                const m = memberStats.find(s => s.email === name);
                return [`${v}h`, m?.name || name];
              }} />
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
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-[13px] font-bold text-zinc-100">Ranking · {MONTHS_ES[month]}</h2>
        </div>
        {memberStats.map((member, idx) => {
          const isMe = member.email === user?.email;
          const pct = memberStats[0].totalHours > 0 ? (member.totalHours / memberStats[0].totalHours) * 100 : 0;
          return (
            <div key={member.email} className={`px-4 py-3 ${idx < memberStats.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-zinc-700 w-5">#{idx + 1}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px]"
                  style={{ background: `${member.color}20`, border: `1.5px solid ${member.color}30`, color: member.color }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={`text-[12px] font-semibold ${isMe ? 'text-indigo-300' : 'text-zinc-200'}`}>{isMe ? 'Tú' : member.name}</p>
                    <span className="text-[12px] font-bold font-mono" style={{ color: member.color }}>{member.totalHours}h</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${member.color}80, ${member.color})` }}
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
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="text-sm">📊</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-zinc-100">Carga semanal del equipo</h2>
            <p className="text-[11px] text-zinc-600">Últimas 12 semanas</p>
          </div>
        </div>
        <div className="h-[130px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyBreakdown} barCategoryGap="24%">
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}h`, 'Horas']} />
              <Bar dataKey="horas" fill="rgba(99,102,241,0.45)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Member cards */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3 px-0.5">Miembros</p>
        <div className="space-y-3">
          {memberStats.map((member, idx) => (
            <MiniMemberCard key={member.email} member={member} year={year} month={month} daysInMonth={daysInMonth} isTop={idx === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMemberCard({ member, year, month, daysInMonth, isTop }) {
  const now = new Date();
  let startDow = new Date(year, month, 1).getDay() - 1;
  if (startDow < 0) startDow = 6;
  const prevLast = new Date(year, month, 0).getDate();
  const trailing = [];
  for (let i = startDow - 1; i >= 0; i--) trailing.push(prevLast - i);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{
        background: '#17171f',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px]"
            style={{ background: `${member.color}20`, border: `1.5px solid ${member.color}30`, color: member.color }}>
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-100">{member.name}</p>
            <p className="text-[11px]" style={{ color: member.color }}>{member.totalHours}h · {member.sessions} sesiones</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {trailing.map(d => (
          <div
            key={`t-${d}`}
            className="aspect-square rounded-md flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            <span className="text-[8px] text-zinc-700">{d}</span>
          </div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const acts = member.actByDay[day] || [];
          const has = acts.length > 0;
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;
          return (
            <div
              key={day}
              className="aspect-square rounded-md flex flex-col items-center justify-center"
              style={has ? {
                background: '#10b981',
                boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              } : isToday ? {
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.15)',
              } : {
                background: 'rgba(255,255,255,0.05)',
              }}>
              <span className={`text-[8px] font-semibold leading-none ${has ? 'text-white' : isToday ? 'text-zinc-200' : 'text-zinc-500'}`}>{day}</span>
              {emoji && <span className="text-[7px] leading-none mt-0.5">{emoji}</span>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
