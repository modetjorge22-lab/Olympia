import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, ChevronRight, Clock, Flame } from 'lucide-react';

const MEMBER_COLORS = ['#ef4444', '#f97316', '#22c55e', '#8b5cf6', '#3b82f6', '#ec4899'];

export default function Feed() {
  const { currentMonth } = useMonth();
  const { user } = useAuth();
  const { allActivities } = useActivities(currentMonth);
  const { members } = useTeamMembers();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build cumulative daily data for line chart
  const { memberStats, chartData, daysInMonth } = useMemo(() => {
    const emails = members.length > 0
      ? members.map(m => m.email)
      : [...new Set(allActivities.map(a => a.user_email))];

    const lastDay = new Date(year, month + 1, 0).getDate();

    const stats = emails.map((email, idx) => {
      const member = members.find(m => m.email === email);
      const monthActs = allActivities.filter(a => {
        const d = new Date(a.date);
        return a.user_email === email && d.getFullYear() === year && d.getMonth() === month;
      });
      const totalMins = monthActs.reduce((s, a) => s + (a.duration_minutes || 0), 0);

      // Cumulative hours per day
      const dailyMins = {};
      monthActs.forEach(a => {
        const day = new Date(a.date).getDate();
        dailyMins[day] = (dailyMins[day] || 0) + (a.duration_minutes || 0);
      });

      let cumulative = 0;
      const cumulativeByDay = [];
      for (let d = 1; d <= lastDay; d++) {
        cumulative += (dailyMins[d] || 0);
        cumulativeByDay.push(+(cumulative / 60).toFixed(1));
      }

      return {
        email,
        name: member?.full_name || email.split('@')[0],
        totalHours: +(totalMins / 60).toFixed(1),
        totalMins,
        sessions: monthActs.length,
        color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        cumulativeByDay,
      };
    }).sort((a, b) => b.totalMins - a.totalMins);

    return { memberStats: stats, daysInMonth: new Date(year, month + 1, 0).getDate() };
  }, [allActivities, members, year, month]);

  // Recent activity feed
  const recentActivities = useMemo(() => {
    return allActivities
      .filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);
  }, [allActivities, year, month]);

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      {/* Monthly race - bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Carrera mensual</h2>
        </div>

        <div className="space-y-3">
          {memberStats.map((member, idx) => {
            const maxHours = memberStats[0]?.totalHours || 1;
            const pct = Math.max((member.totalHours / maxHours) * 100, 2);

            return (
              <div key={member.email}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="text-[13px] text-zinc-300 font-medium">{member.name}</span>
                    {idx === 0 && member.totalHours > 0 && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 font-semibold px-1.5 py-0.5 rounded">
                        LÍDER
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] text-zinc-500 font-mono">{member.totalHours}h</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.15 + idx * 0.08, duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Ranking</h2>
        </div>
        {memberStats.map((member, idx) => (
          <div
            key={member.email}
            className={`flex items-center justify-between px-5 py-3.5 ${
              idx < memberStats.length - 1 ? 'border-b border-white/[0.03]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold font-mono w-6 text-center ${
                idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-orange-700' : 'text-zinc-600'
              }`}>
                {idx + 1}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${member.color}15`, border: `1px solid ${member.color}30` }}>
                <span className="text-xs font-semibold" style={{ color: member.color }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-200">{member.name}</p>
                <p className="text-[11px] text-zinc-600">{member.sessions} sesiones</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-bold text-zinc-200 font-mono">{member.totalHours}h</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Activity feed */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-1 border border-white/[0.04] rounded-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Actividad reciente</h2>
        </div>
        {recentActivities.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-zinc-600">Sin actividades este mes</div>
        ) : (
          recentActivities.map((activity, idx) => {
            const memberName = members.find(m => m.email === activity.user_email)?.full_name
              || activity.user_email.split('@')[0];
            const typeInfo = ACTIVITY_TYPES[activity.type] || { emoji: '🏅', label: activity.type };
            const isMe = activity.user_email === user?.email;

            return (
              <div
                key={activity.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  idx < recentActivities.length - 1 ? 'border-b border-white/[0.03]' : ''
                }`}
              >
                <span className="text-lg">{typeInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-300">
                    <span className={`font-medium ${isMe ? 'text-brand-400' : 'text-zinc-200'}`}>
                      {isMe ? 'Tú' : memberName}
                    </span>
                    {' · '}
                    {typeInfo.label}
                    {activity.description ? ` · ${activity.description}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-600">
                    {new Date(activity.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-[12px] font-mono">{activity.duration_minutes}m</span>
                </div>
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
