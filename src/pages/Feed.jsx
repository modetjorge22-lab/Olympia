import React, { useMemo, useEffect, useState } from 'react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { Newspaper, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
        <Newspaper className="w-4 h-4" style={{ color: 'rgba(245,237,224,0.92)' }} />
        <h1 className="text-[17px] font-bold" style={{ color: 'rgba(245,237,224,0.92)' }}>Feed</h1>
      </div>
      <p className="text-[12px] -mt-2" style={{ color: 'rgba(245,237,224,0.55)' }}>
        Últimas sesiones del equipo
      </p>

      {feedItems.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={glassCard}>
          <p className="text-[13px]" style={{ color: TEXT_MUTED }}>Aún no hay actividades registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateStr, acts]) => (
            <div key={dateStr}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
                 style={{ color: 'rgba(245,237,224,0.55)' }}>
                {formatDate(dateStr)}
              </p>
              <div className="rounded-2xl overflow-hidden" style={glassCard}>
                {acts.map((item, idx) => {
                  const memberName = members.find(m => m.email === item.user_email)?.full_name
                                   || item.user_email?.split('@')[0]
                                   || 'Anónimo';
                  const memberAvatar = members.find(m => m.email === item.user_email)?.avatar_url || null;
                  const initials = memberName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const isMe = item.user_email === user?.email;
                  const nameLabel = isMe ? 'Tú' : memberName;

                  // ── Tarjeta de marca personal batida ──
                  if (item._kind === 'pr') {
                    return (
                      <div key={`pr-${item.id}`}
                           className={`px-4 py-3 ${idx < acts.length - 1 ? 'border-b' : ''}`}
                           style={{ borderColor: 'rgba(42,26,17,0.08)', background: 'rgba(122,26,42,0.05)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: '#7a1a2a' }}>
                            <Trophy className="w-4 h-4" style={{ color: 'rgba(245,237,224,0.9)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px]" style={{ color: TEXT_PRIMARY }}>
                              <span className="font-semibold" style={{ color: isMe ? '#4338ca' : TEXT_PRIMARY }}>
                                {nameLabel}
                              </span>
                              {' '}batió su marca en{' '}
                              <span className="font-semibold" style={{ color: '#7a1a2a' }}>{item.goal_title}</span>
                            </p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              {item.old_value != null && (
                                <>
                                  <span className="text-[12px] line-through" style={{ color: TEXT_MUTED }}>
                                    {item.old_value} {item.unit}
                                  </span>
                                  <span className="text-[10px]" style={{ color: TEXT_MUTED }}>→</span>
                                </>
                              )}
                              <span className="text-[16px] font-bold font-mono" style={{ color: '#7a1a2a' }}>
                                {item.new_value} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── Tarjeta de actividad normal ──
                  const info = ACTIVITY_TYPES[item.type] || { emoji: '🏅', label: item.type };
                  return (
                    <div key={item.id}
                         className={`px-4 py-3 ${idx < acts.length - 1 ? 'border-b' : ''}`}
                         style={{ borderColor: 'rgba(42,26,17,0.08)' }}>
                      <div className="flex items-start gap-3">
                        {memberAvatar ? (
                          <img src={memberAvatar} alt={memberName}
                            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                            style={{ border: '1.5px solid rgba(42,26,17,0.18)' }} />
                        ) : (
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                            style={{ background: 'rgba(42,26,17,0.08)', border: '1.5px solid rgba(42,26,17,0.18)', color: TEXT_PRIMARY }}>
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[13px] truncate" style={{ color: TEXT_PRIMARY }}>
                              <span className="font-semibold" style={{ color: isMe ? '#4338ca' : TEXT_PRIMARY }}>
                                {nameLabel}
                              </span>
                            </p>
                            {item.duration_minutes ? (
                              <span className="text-[11px] font-mono whitespace-nowrap flex-shrink-0" style={{ color: TEXT_SECONDARY }}>
                                {formatDuration(item.duration_minutes)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[13px]">{info.emoji}</span>
                            <span className="text-[12px] font-medium" style={{ color: TEXT_PRIMARY }}>{info.label}</span>
                          </div>
                          {item.description && (
                            <p className="text-[12px] mt-1.5 leading-snug" style={{ color: TEXT_SECONDARY }}>{item.description}</p>
                          )}
                          {item.progress_note && (
                            <p className="text-[11px] mt-1 italic leading-snug" style={{ color: '#5d4a85' }}>"{item.progress_note}"</p>
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
