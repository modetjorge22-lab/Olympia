import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { Clock } from 'lucide-react';

const MEMBER_COLORS = ['#ef4444', '#f97316', '#22c55e', '#a78bfa', '#60a5fa', '#f472b6'];

export default function Feed() {
  const { currentMonth } = useMonth();
  const { user } = useAuth();
  const { allActivities } = useActivities(currentMonth);
  const { members } = useTeamMembers();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  // Build cumulative chart data + stats
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

      // Activities by day for mini calendar
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

    // Build chart data array
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const point = { day: d };
      stats.forEach(m => { point[m.email] = m.cumByDay[d]; });
      data.push(point);
    }

    return { chartData: data, memberStats: stats };
  }, [allActivities, members, year, month, daysInMonth]);

  // Recent activities
  const recentActivities = useMemo(() => {
    return allActivities
      .filter(a => { const d = new Date(a.date); return d.getFullYear() === year && d.getMonth() === month; })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12);
  }, [allActivities, year, month]);

  const maxHours = memberStats.length > 0 ? Math.max(...memberStats.map(m => m.totalHours)) : 0;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Carrera mensual - Line chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4 pb-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📈</span>
          <h2 className="text-[15px] font-bold text-zinc-100">Carrera mensual</h2>
        </div>

        <div className="h-[200px] mt-2 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#52525b' }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
                tickFormatter={(d) => `${d} ${MONTHS_ES[month]?.slice(0,3)}`}
                interval={Math.floor(daysInMonth / 4) - 1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }}
                labelFormatter={(d) => `Día ${d}`}
                formatter={(value, name) => {
                  const m = memberStats.find(s => s.email === name);
                  return [`${value}h`, m?.name || name];
                }}
              />
              {memberStats.map(m => (
                <Line
                  key={m.email}
                  type="monotone"
                  dataKey={m.email}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3, fill: m.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-zinc-600 text-center mt-1">
          Horas acumuladas · {MONTHS_ES[month]} {year}
        </p>
      </motion.div>

      {/* Miembros del equipo */}
      <div>
        <h2 className="text-[17px] font-bold text-zinc-100 mb-3">Miembros del Equipo</h2>
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
        const progressActivities = recentActivities.filter(a => a.training_type === 'progress' && a.progress_note);
        if (progressActivities.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-violet-500/[0.06] border border-violet-500/[0.12] rounded-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <h2 className="text-[13px] font-semibold text-violet-300 uppercase tracking-wider">Progresos del equipo</h2>
            </div>
            {progressActivities.slice(0, 5).map((act, idx) => {
              const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
              const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
              const isMe = act.user_email === user?.email;
              return (
                <div key={act.id} className={`flex items-start gap-3 px-4 py-3 ${idx < Math.min(progressActivities.length, 5) - 1 ? 'border-b border-violet-500/[0.06]' : ''}`}>
                  <span className="text-[15px] mt-0.5">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-zinc-300">
                      <span className={`font-semibold ${isMe ? 'text-brand-400' : 'text-zinc-200'}`}>{isMe ? 'Tú' : memberName}</span>
                      {' ha progresado en '}{info.label.toLowerCase()}
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
        transition={{ delay: 0.15 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl overflow-hidden"
      >
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider">Actividad reciente</h2>
        </div>
        {recentActivities.length === 0 ? (
          <div className="px-4 pb-4 text-[13px] text-zinc-600">Sin actividades este mes</div>
        ) : (
          recentActivities.map((act, idx) => {
            const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
            const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
            const isMe = act.user_email === user?.email;
            return (
              <div key={act.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < recentActivities.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                <span className="text-[15px]">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-300 truncate">
                    <span className={`font-semibold ${isMe ? 'text-brand-400' : 'text-zinc-200'}`}>{isMe ? 'Tú' : memberName}</span>
                    {' · '}{info.label}{act.description ? ` · ${act.description}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-600">{new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className="text-[12px] text-zinc-500 font-mono whitespace-nowrap">{act.duration_minutes}m</span>
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
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const prevLast = new Date(year, month, 0).getDate();
  const trailing = [];
  for (let i = startDow - 1; i >= 0; i--) trailing.push(prevLast - i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-1 border border-white/[0.04] rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${member.color}18`, border: `1.5px solid ${member.color}35` }}
          >
            <span className="text-[11px] font-bold" style={{ color: member.color }}>
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-zinc-100">{member.name}</p>
            <p className="text-[12px] text-zinc-500">{member.totalHours}h</p>
          </div>
        </div>
        {isTop && (
          <span className="bg-brand-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            🏆 Performer
          </span>
        )}
      </div>

      {/* Mini calendar */}
      <div className="grid grid-cols-7 gap-[3px]">
        {trailing.map(d => (
          <div key={`t-${d}`} className="aspect-square rounded flex items-center justify-center">
            <span className="text-[8px] text-zinc-800">{d}</span>
          </div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const acts = member.actByDay[day] || [];
          const has = acts.length > 0;
          const emoji = has ? (ACTIVITY_TYPES[acts[0].type]?.emoji || '🏅') : null;

          return (
            <div
              key={day}
              className={`aspect-square rounded flex flex-col items-center justify-center ${
                has ? 'bg-brand-500/70' : 'bg-surface-2/60'
              }`}
            >
              <span className={`text-[8px] font-medium leading-none ${has ? 'text-white' : 'text-zinc-700'}`}>{day}</span>
              {emoji && <span className="text-[7px] leading-none">{emoji}</span>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
