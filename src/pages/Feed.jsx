import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TrendingUp, ChevronRight, Trophy } from 'lucide-react';

// Colors for each team member in the race chart
const MEMBER_COLORS = ['#ef4444', '#f97316', '#22c55e', '#8b5cf6', '#3b82f6', '#ec4899'];

export default function Feed() {
  const [currentMonth] = useState(new Date());
  const { allActivities, loading } = useActivities(currentMonth);
  const { members } = useTeamMembers();

  // Calculate monthly hours per member
  const memberStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get unique emails from activities if no team_members yet
    const emails = members.length > 0
      ? members.map(m => m.email)
      : [...new Set(allActivities.map(a => a.user_email))];

    return emails.map((email, idx) => {
      const member = members.find(m => m.email === email);
      const monthActivities = allActivities.filter(a => {
        const d = new Date(a.date);
        return a.user_email === email && d.getFullYear() === year && d.getMonth() === month;
      });
      const totalMinutes = monthActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
      const totalHours = (totalMinutes / 60).toFixed(1);

      // Activities by day for calendar
      const actByDay = {};
      monthActivities.forEach(a => {
        const day = new Date(a.date).getDate();
        if (!actByDay[day]) actByDay[day] = [];
        actByDay[day].push(a);
      });

      return {
        email,
        name: member?.full_name || email.split('@')[0],
        totalHours: parseFloat(totalHours),
        totalMinutes,
        activitiesByDay: actByDay,
        sessionsCount: monthActivities.length,
        color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [allActivities, members, currentMonth]);

  const topPerformer = memberStats[0];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Carrera mensual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-2 border border-white/5 rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Carrera mensual</h2>
        </div>

        {/* Simple bar race */}
        <div className="space-y-3">
          {memberStats.map((member, idx) => {
            const maxHours = memberStats[0]?.totalHours || 1;
            const widthPercent = Math.max((member.totalHours / maxHours) * 100, 4);

            return (
              <div key={member.email} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 font-medium">{member.name}</span>
                  <span className="text-zinc-500">{member.totalHours}h</span>
                </div>
                <div className="h-3 bg-surface-4 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-600 text-center mt-4">
          Horas acumuladas · {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Miembros del equipo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Miembros del Equipo</h2>
        <div className="space-y-4">
          {memberStats.map((member, idx) => (
            <MemberCard
              key={member.email}
              member={member}
              isTopPerformer={idx === 0 && member.totalHours > 0}
              currentMonth={currentMonth}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function MemberCard({ member, isTopPerformer, currentMonth }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDayOfWeek = new Date(year, month, 1).getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const trailingDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    trailingDays.push(prevMonthLastDay - i);
  }

  return (
    <div className="bg-surface-2 border border-white/5 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-surface-4 flex items-center justify-center">
            <span className="text-sm font-semibold text-zinc-400">
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-zinc-100">{member.name}</p>
            <p className="text-sm text-zinc-500">{member.totalHours}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTopPerformer && (
            <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              🏆 Performer
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>

      {/* Mini calendar */}
      <div className="grid grid-cols-7 gap-1">
        {trailingDays.map((day) => (
          <div key={`prev-${day}`} className="aspect-square rounded flex items-center justify-center">
            <span className="text-[9px] text-zinc-700">{day}</span>
          </div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayActs = member.activitiesByDay[day] || [];
          const hasActivity = dayActs.length > 0;
          const mainEmoji = hasActivity ? (ACTIVITY_TYPES[dayActs[0].type]?.emoji || '🏅') : null;

          return (
            <div
              key={day}
              className={`aspect-square rounded flex flex-col items-center justify-center ${
                hasActivity ? 'bg-brand-500/80' : 'bg-surface-3/60'
              }`}
            >
              <span className={`text-[9px] ${hasActivity ? 'text-white font-medium' : 'text-zinc-600'}`}>
                {day}
              </span>
              {mainEmoji && <span className="text-[8px] leading-none">{mainEmoji}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
