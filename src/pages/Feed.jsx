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

const CustomTooltip = ({ active, payload, label, memberStats }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#281811', border: '1px solid rgba(245,237,224,0.15)', borderRadius: 12, padding: '10px 14px', fontSize: 12, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <p style={{ color: 'rgba(245,237,224,0.5)', fontSize: 11, marginBottom: 6 }}>Día {label}</p>
      {payload.map(entry => {
        const m = memberStats.find(s => s.email === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              <span style={{ color: 'rgba(245,237,224,0.85)' }}>{m?.name || entry.dataKey}</span>
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 pb-3" style={glassCard}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold" style={{ color: TEXT_PRIMARY }}>Carrera mensual</h2>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Horas acumuladas · {MONTHS_ES[month]} {year}</p>
          </div>
        </div>

        <div className="h-[200px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,26,17,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: TEXT_MUTED }} axisLine={{ stroke: 'rgba(42,26,17,0.15)' }} tickLine={false} interval={Math.floor(daysInMonth / 4) - 1} />
              <YAxis tick={{ fontSize: 10, fill: TEXT_MUTED }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip memberStats={memberStats} />} />
              {memberStats.map(m => (
                <Line key={m.email} type="monotone" dataKey={m.email} stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: m.color, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Team members */}
      <div>
        <h2 className="text-[16px] font-bold mb-3 px-0.5" style={{ color: 'rgba(245,237,224,0.92)' }}>Miembros del Equipo</h2>
        <div className="space-y-3">
          {memberStats.map((member, idx) => (
            <MemberCard
              key={member.email}
              member={member}
              isTop={idx === 0 && member.totalHours > 0}
              year={year} month={month} daysInMonth={daysInMonth}
            />
          ))}
        </div>
      </div>

      {/* Progress highlights */}
      {(() => {
        const progressActs = recentActivities.filter(a => a.training_type === 'progress' && a.progress_note);
        if (!progressActs.length) return null;
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden" style={glassCard}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <h2 className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#6b3a8a' }}>Progresos del equipo</h2>
            </div>
            {progressActs.slice(0, 5).map((act, idx) => {
              const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
              const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
              const isMe = act.user_email === user?.email;
              return (
                <div key={act.id} className={`flex items-start gap-3 px-4 py-3 ${idx < Math.min(progressActs.length, 5) - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
                  <span className="text-[15px] mt-0.5">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]" style={{ color: TEXT_PRIMARY }}>
                      <span className="font-semibold" style={{ color: isMe ? '#4338ca' : TEXT_PRIMARY }}>{isMe ? 'Tú' : memberName}</span>
                      {' ha progresado en '}{info.label?.toLowerCase()}
                    </p>
                    <p className="text-[12px] mt-0.5 italic" style={{ color: '#6b3a8a' }}>"{act.progress_note}"</p>
                    <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>{new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        );
      })()}

      {/* Activity feed */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden" style={glassCard}>
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>Actividad reciente</h2>
        </div>
        {recentActivities.length === 0 ? (
          <div className="px-4 pb-5 text-[13px]" style={{ color: TEXT_MUTED }}>Sin actividades este mes</div>
        ) : (
          recentActivities.map((act, idx) => {
            const memberName = members.find(m => m.email === act.user_email)?.full_name || act.user_email.split('@')[0];
            const info = ACTIVITY_TYPES[act.type] || { emoji: '🏅', label: act.type };
            const isMe = act.user_email === user?.email;
            return (
              <div key={act.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < recentActivities.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(42,26,17,0.07)', border: '1px solid rgba(42,26,17,0.1)' }}>
                  <span className="text-[13px]">{info.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: TEXT_PRIMARY }}>
                    <span className="font-semibold" style={{ color: isMe ? '#4338ca' : TEXT_PRIMARY }}>{isMe ? 'Tú' : memberName}</span>
                    {' · '}{info.label}{act.description ? ` · ${act.description}` : ''}
                  </p>
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{new Date(act.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: TEXT_SECONDARY }}>{act.duration_minutes}m</span>
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={glassCard}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${member.color}35, ${member.color}18)`,
              border: `1.5px solid ${member.color}50`,
              color: member.color,
              boxShadow: `0 2px 8px ${member.color}20`,
            }}
          >
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
            <p className="text-[12px]" style={{ color: member.color }}>{member.totalHours}h este mes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {trailing.map(d => (
          <div
            key={`t-${d}`}
            className="aspect-square rounded-md flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.04)' }}
          >
            <span className="text-[9px]" style={{ color: 'rgba(42,26,17,0.3)' }}>{d}</span>
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
                background: '#8fa898',
                boxShadow: '0 1px 4px rgba(143,168,152,0.25)',
              } : isToday ? {
                background: 'rgba(42,26,17,0.14)',
                border: '1px solid rgba(42,26,17,0.22)',
              } : {
                background: 'rgba(42,26,17,0.07)',
              }}
            >
              <span
                className="text-[9px] font-semibold leading-none"
                style={{ color: has ? '#1c2620' : isToday ? TEXT_PRIMARY : 'rgba(42,26,17,0.45)' }}
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
