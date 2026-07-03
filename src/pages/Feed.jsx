import React, { useMemo, useEffect, useState } from 'react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { Newspaper, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme';

const MONTHS_ES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Hoy';
  if (sameDay(d, yesterday)) return 'Ayer';
  return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]}`;
}

function formatDuration(min) {
  if (!min || min <= 0) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function Feed() {
  const { currentMonth } = useMonth();
  const { user } = useAuth();
  const { allActivities } = useActivities(currentMonth);
  const { members } = useTeamMembers();

  // Marcas personales recientes (últimas 30)
  const [prEvents, setPrEvents] = useState([]);
  useEffect(() => {
    supabase
      .from('pr_achievements')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setPrEvents(data); });
  }, []);

  // Mezclar actividades + PR events, ordenar por fecha descendente
  const feedItems = useMemo(() => {
    const acts = [...allActivities].map(a => ({ ...a, _kind: 'activity' }));
    const prs = prEvents.map(p => ({ ...p, _kind: 'pr', date: p.date, created_at: p.created_at }));
    return [...acts, ...prs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 40);
  }, [allActivities, prEvents]);

  // Agrupar por día
  const grouped = useMemo(() => {
    const map = new Map();
    feedItems.forEach(item => {
      const key = item.date?.slice(0, 10) || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [feedItems]);

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2.5">
        <Newspaper className="w-4 h-4" style={{ color: COLORS.textPrimary }} />
        <h1 className="text-[17px] font-bold" style={{ color: COLORS.textPrimary }}>Feed</h1>
      </div>
      <p className="text-[12px] -mt-2" style={{ color: COLORS.textMuted }}>
        Últimas sesiones del equipo
      </p>

      {feedItems.length === 0 ? (
        <div className="py-10 text-center" style={{ borderTop: `1px solid ${COLORS.divider}` }}>
          <p className="text-[13px]" style={{ color: COLORS.textMuted }}>Aún no hay actividades registradas</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateStr, acts]) => (
            <div key={dateStr}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 px-1"
                 style={{ color: COLORS.textMuted }}>
                {formatDate(dateStr)}
              </p>
              <div>
                {acts.map((item, idx) => {
                  const memberName = members.find(m => m.email === item.user_email)?.full_name
                                   || item.user_email?.split('@')[0]
                                   || 'Anónimo';
                  const memberAvatar = members.find(m => m.email === item.user_email)?.avatar_url || null;
                  const initials = memberName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const isMe = item.user_email === user?.email;
                  const nameLabel = isMe ? 'Tú' : memberName;
                  const rowBorder = idx < acts.length - 1 ? { borderBottom: `1px solid ${COLORS.dividerSoft}` } : {};

                  // ── Marca personal batida ──
                  if (item._kind === 'pr') {
                    return (
                      <div key={`pr-${item.id}`} className="px-1 py-3" style={rowBorder}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: COLORS.accent }}>
                            <Trophy className="w-3.5 h-3.5" style={{ color: COLORS.onAccent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px]" style={{ color: COLORS.textSecondary }}>
                              <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
                                {nameLabel}
                              </span>
                              {' '}batió su marca en{' '}
                              <span className="font-semibold" style={{ color: COLORS.accent }}>{item.goal_title}</span>
                            </p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              {item.old_value != null && (
                                <>
                                  <span className="text-[12px] line-through" style={{ color: COLORS.textMuted }}>
                                    {item.old_value} {item.unit}
                                  </span>
                                  <span className="text-[10px]" style={{ color: COLORS.textMuted }}>→</span>
                                </>
                              )}
                              <span className="text-[16px] font-bold font-mono" style={{ color: COLORS.accent }}>
                                {item.new_value} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── Actividad normal ──
                  const info = ACTIVITY_TYPES[item.type] || { emoji: '🏅', label: item.type };
                  return (
                    <div key={item.id} className="px-1 py-3" style={rowBorder}>
                      <div className="flex items-start gap-3">
                        {memberAvatar ? (
                          <img src={memberAvatar} alt={memberName}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            style={{ border: `1.5px solid ${COLORS.innerCellBorder}` }} />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                            style={{ background: COLORS.innerCellBg, border: `1.5px solid ${COLORS.innerCellBorder}`, color: COLORS.textPrimary }}>
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[13px] truncate" style={{ color: COLORS.textPrimary }}>
                              <span className="font-semibold" style={{ color: isMe ? COLORS.accent : COLORS.textPrimary }}>
                                {nameLabel}
                              </span>
                            </p>
                            {item.duration_minutes ? (
                              <span className="text-[11px] font-mono whitespace-nowrap flex-shrink-0" style={{ color: COLORS.textMuted }}>
                                {formatDuration(item.duration_minutes)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[13px]">{info.emoji}</span>
                            <span className="text-[12px] font-medium" style={{ color: COLORS.textSecondary }}>{info.label}</span>
                          </div>
                          {item.description && (
                            <p className="text-[12px] mt-1.5 leading-snug" style={{ color: COLORS.textSecondary }}>{item.description}</p>
                          )}
                          {item.progress_note && (
                            <p className="text-[11px] mt-1 italic leading-snug" style={{ color: COLORS.textMuted }}>"{item.progress_note}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
