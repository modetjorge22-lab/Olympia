import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { DayCell, toDateStr } from '@/components/TrainingCalendar';
import MuscleLoad from '@/components/MuscleLoad';
import { iconFor, categoryOf, catColor, CATEGORIES } from '@/utils/activityIcons';

// Snapshot de un miembro — versión resumida de su pestaña "Tú":
// cifras clave, su semana, su mes en calendario Olympia, desglose por familia,
// carga muscular, metas y últimas actividades. Se abre sobre un fondo con blur.

const MONO = '"JetBrains Mono", monospace';
const INK = a => `rgba(var(--ink),${a})`;
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW = ['L','M','X','J','V','S','D'];

const fmt = m => {
  if (!m) return '0h';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}min` : `${h}h`) : `${r}min`;
};

function Title({ children }) {
  return <p className="text-[12px] mb-2" style={{ letterSpacing: '0.12em', color: INK(0.9) }}>{children}</p>;
}

export default function MemberSheet({ member, activities = [], plans = [], goals = [], prDates = new Set(), pacePct = null, onClose }) {
  const byDate = useMemo(() => {
    const m = {};
    activities.forEach(a => { const ds = a.date?.slice(0, 10); if (ds) (m[ds] = m[ds] || []).push(a); });
    return m;
  }, [activities]);
  const plansByDate = useMemo(() => {
    const m = {};
    plans.forEach(p => { const ds = p.date?.slice(0, 10); if (ds) (m[ds] = m[ds] || []).push(p); });
    return m;
  }, [plans]);

  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const dim = new Date(y, mo + 1, 0).getDate();
  const lead = (new Date(y, mo, 1).getDay() + 6) % 7;

  const monthActs = activities.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === y && d.getMonth() === mo;
  });
  const monthMins = monthActs.reduce((s, a) => s + (a.duration_minutes || 0), 0);

  // Semana actual (lunes → domingo)
  const week = useMemo(() => {
    const s = new Date(y, mo, now.getDate()); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, []);

  // Desglose por familia en el mes
  const byCat = useMemo(() => {
    const m = {};
    monthActs.forEach(a => { const c = categoryOf(a.type); m[c] = (m[c] || 0) + (a.duration_minutes || 0); });
    return CATEGORIES.map(c => ({ ...c, mins: m[c.key] || 0 })).filter(c => c.mins > 0);
  }, [monthActs]);
  const catTotal = byCat.reduce((s, c) => s + c.mins, 0);

  const recent = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return createPortal(
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div
        className="w-full max-w-lg flex flex-col"
        style={{
          maxHeight: '90dvh', background: 'var(--surface)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex-shrink-0 pt-2.5 px-5">
          <div className="mx-auto mb-3 rounded-full" style={{ width: 36, height: 4, background: INK(0.18) }} />
          <div className="flex items-center gap-3 mb-4">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px]"
                style={{ background: INK(0.08), color: INK(0.9) }}>{initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] truncate" style={{ color: INK(0.95) }}>{member.name}</p>
              <p className="text-[10.5px]" style={{ fontFamily: MONO, color: INK(0.5) }}>
                {fmt(monthMins)} · {monthActs.length} {monthActs.length === 1 ? 'sesión' : 'sesiones'}
                {pacePct != null && ` · ritmo ${pacePct}%`}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: INK(0.07) }} aria-label="Cerrar">
              <X className="w-4 h-4" style={{ color: INK(0.6) }} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">
          {/* Esta semana */}
          <div>
            <Title>Esta semana</Title>
            <div className="grid grid-cols-7 gap-1">
              {week.map((d, i) => {
                const ds = toDateStr(d);
                return (
                  <div key={ds} className="flex flex-col items-center gap-1">
                    <span className="text-[8.5px]" style={{ fontFamily: MONO, color: ds === toDateStr(now) ? '#e5484d' : 'rgba(var(--accent-rgb),0.55)' }}>{DOW[i]}</span>
                    <DayCell date={d} acts={byDate[ds]} plans={plansByDate[ds]} isPR={prDates.has(ds)} size={36} todayMark={false} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Su mes */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[12px]" style={{ letterSpacing: '0.12em', color: INK(0.9) }}>{MONTHS_FULL[mo]} {y}</p>
              <span className="text-[11px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmt(monthMins)}</span>
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 max-w-[320px] mx-auto">
              {DOW.map(d => (
                <span key={d} className="text-center text-[8px]" style={{ fontFamily: MONO, color: 'rgba(var(--accent-rgb),0.55)' }}>{d}</span>
              ))}
              {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
              {Array.from({ length: dim }, (_, i) => {
                const d = new Date(y, mo, i + 1);
                const ds = toDateStr(d);
                return (
                  <div key={ds} className="flex justify-center">
                    <DayCell date={d} acts={byDate[ds]} plans={plansByDate[ds]} isPR={prDates.has(ds)} size={32} todayMark={false} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose por familia */}
          {catTotal > 0 && (
            <div>
              <Title>En qué entrena</Title>
              <div className="h-2 rounded-full flex overflow-hidden mb-2">
                {byCat.map(c => (
                  <span key={c.key} style={{ flex: c.mins, background: `rgba(var(--cat-${c.key}),0.85)` }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {byCat.map(c => (
                  <span key={c.key} className="flex items-center gap-1 text-[10px]" style={{ color: INK(0.6) }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: `rgba(var(--cat-${c.key}),0.85)` }} />
                    {c.label} <span style={{ fontFamily: MONO }}>{fmt(c.mins)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Carga muscular */}
          <div>
            <Title>Carga muscular</Title>
            <div className="-mt-9"><MuscleLoad activities={activities} /></div>
          </div>

          {/* Metas */}
          {goals.length > 0 && (
            <div>
              <Title>Marcas</Title>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {goals.map(g => (
                  <div key={g.id} className="flex-shrink-0 rounded-2xl px-3 py-2" style={{ background: INK(0.05), minWidth: 110 }}>
                    <p className="text-[10px] truncate" style={{ color: INK(0.5) }}>{g.title}</p>
                    <p className="text-[15px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>
                      {g.current_value != null ? `${g.current_value} ${g.unit || ''}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas actividades */}
          {recent.length > 0 && (
            <div>
              <Title>Últimas actividades</Title>
              {recent.map(a => {
                const Icon = iconFor(a.type);
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2" style={{ borderTop: `1px solid ${INK(0.06)}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: catColor(a.type, 0.16) }}>
                      <Icon style={{ width: 13, height: 13, color: catColor(a.type, 1), filter: 'brightness(0.85)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate" style={{ color: INK(0.9) }}>{a.description || ACTIVITY_TYPES[a.type]?.label || a.type}</p>
                      <p className="text-[10px] capitalize" style={{ color: INK(0.45) }}>
                        {new Date(a.date + (a.date?.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-[11px]" style={{ fontFamily: MONO, color: INK(0.6) }}>{fmt(a.duration_minutes)}</span>
                    {prDates.has(a.date?.slice(0, 10)) && <Trophy className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
