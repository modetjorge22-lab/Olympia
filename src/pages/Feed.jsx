import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp } from 'lucide-react';

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Glass card style
const glassCard = {
  background: '#17171f',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

const CustomTooltip = ({ active, payload, label, memberStats }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(11,11,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 12, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="text-zinc-500 text-[11px] mb-2">Día {label}</p>
      {payload.map(entry => {
        const m = memberStats.find(s => s.email === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-zinc-300">{m?.name || entry.dataKey}</span>
            </div>
            <span className="font-bold" style={{ color: entry.color }}>{entry.value}h</span>
          </div>
        );
      })}
    </div>
  );
};

export default function Feed() {
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

    // Si el mes mostrado es el actual, cortar hasta hoy. Si es pasado, mes completo.
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

  const recentActivities = useMemo(() => {
    return allActivities
      .filter(a => { const d = new Date(a.date); return d.getFullYear() === year && d.getMonth() === month; })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12);
  }, [allActivities, year, month]);

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Monthly race chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 pb-3"
        style={glassCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-zinc-100">Carrera mensual</h2>
            <p className="text-[11px] text-zinc-600">Horas acumuladas · {MONTHS_ES[month]} {year}</p>
          </div>
        </div>

        <div className="h-[200px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#52525b' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                interval={Math.floor(daysInMonth / 4) - 1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip memberStats={memberStats} />} />
              {memberStats.map(m => (
                <Line
                  key={m.email}
                  type="monotone"
                  dataKey={m.email}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Team members */}
      <div>
        <h2 className="text-[16px] font-bold text-zinc-100 mb-3 px-0.5">Miembros del Equipo</h2>
        <div className="space-y-3">
          {memberStats.map((member, idx) => (
            <MemberCard
              key={member.email}
              member={member}
              isTop={idx === 0 && member.totalHours > 0}
              year={year}
              month={month}
              daysInMonth={daysInMonth}
            />
          ))}
        </div>
      </div>

      {/* Progress highlights */}
      {(() => {
        const progressActs = recentActivities.filter(a => a.training_type === 'progress' && a.progress_note);
        if (!progressActs.length) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ ...glassCard, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <h2 className="text-[12px] font-semibold text-violet-300 uppercase tracking-widest">Progresos del equipo</h2>
            </div>
            {progressActs.slice(0, 5).map((act, idx) => {
              const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
              const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
              const isMe = act.user_email === user?.email;
              return (
                <div key={act.id} className={`flex items-start gap-3 px-4 py-3 ${idx < Math.min(progressActs.length, 5) - 1 ? 'border-b border-violet-500/[0.06]' : ''}`}>
                  <span className="text-[15px] mt-0.5">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-zinc-300">
                      <span className={`font-semibold ${isMe ? 'text-indigo-400' : 'text-zinc-200'}`}>{isMe ? 'Tú' : memberName}</span>
                      {' ha progresado en '}{info.label?.toLowerCase()}
                    </p>
                    <p className="text-[12px] text-violet-300/80 mt-0.5 italic">"{act.progress_note}"</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        );
      })()}

      {/* Activity feed */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={glassCard}
      >
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Actividad reciente</h2>
        </div>
        {recentActivities.length === 0 ? (
          <div className="px-4 pb-5 text-[13px] text-zinc-600">Sin actividades este mes</div>
        ) : (
          recentActivities.map((act, idx) => {
            const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
            const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
            const isMe = act.user_email === user?.email;
            return (
              <div key={act.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < recentActivities.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[13px]">{info.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-300 truncate">
                    <span className={`font-semibold ${isMe ? 'text-indigo-400' : 'text-zinc-200'}`}>{isMe ? 'Tú' : memberName}</span>
                    {' · '}{info.label}{act.description ? ` · ${act.description}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-600">{new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono whitespace-nowrap">{act.duration_minutes}m</span>
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}

function MemberCard({ member, isTop, year, month, daysInMonth }) {
  const now = new Date();
  let startDow = new Date(year, month, 1).getDay() - 1;
  if (startDow < 0) startDow = 6;

  const prevLast = new Date(year, month, 0).getDate();
  const trailing = [];
  for (let i = startDow - 1; i >= 0; i--) trailing.push(prevLast - i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{
        background: '#17171f',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${member.color}28, ${member.color}10)`,
              border: `1.5px solid ${member.color}35`,
              color: member.color,
              boxShadow: `0 2px 8px ${member.color}15`,
            }}
          >
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-zinc-100">{member.name}</p>
            <p className="text-[12px]" style={{ color: member.color }}>{member.totalHours}h este mes</p>
          </div>
        </div>
      </div>

      {/* Mini calendar */}
      <div className="grid grid-cols-7 gap-[3px]">
        {trailing.map(d => (
          <div
            key={`t-${d}`}
            className="aspect-square rounded-md flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            <span className="text-[9px] text-zinc-700">{d}</span>
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
              }}
            >
              <span
                className={`text-[9px] font-semibold leading-none ${has ? 'text-white' : isToday ? 'text-zinc-200' : 'text-zinc-500'}`}
              >
                {day}
              </span>
              {emoji && <span className="text-[8px] leading-none mt-0.5">{emoji}</span>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
