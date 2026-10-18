import React, { useMemo, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useActivities, ACTIVITY_TYPES } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMonth } from '@/lib/MonthContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { iconFor, catColor, categoryOf, CATEGORIES } from '@/utils/activityIcons';

// Feed — lo que se mueve en el equipo. Tres capas, de lo general a lo concreto:
// 1) "Hoy": avatares con un anillo teñido por lo que cada uno ha entrenado hoy
//    (tocar uno filtra el feed por esa persona).
// 2) Pulso de los últimos 7 días: horas, sesiones, quién está activo y en qué.
// 3) Cronología por día, con el total del día y filas limpias por actividad.

const MONO = '"JetBrains Mono", monospace';
const INK = a => `rgba(var(--ink),${a})`;
const SECTION_TITLE = { fontSize: 13, letterSpacing: '0.14em', color: INK(0.95), fontWeight: 400 };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const PAGE = 30;

const dstr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = m => {
  if (!m || m <= 0) return '';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h ${r}min` : `${h}h`) : `${r}min`;
};
function dayLabel(ds) {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (ds === dstr(today)) return 'Hoy';
  if (ds === dstr(y)) return 'Ayer';
  const d = new Date(`${ds}T12:00:00`);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const initialsOf = n => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

// Anillo con los colores de las familias entrenadas, en proporción a los minutos
function ringBackground(byCat) {
  const entries = Object.entries(byCat).filter(([, m]) => m > 0);
  const total = entries.reduce((s, [, m]) => s + m, 0);
  if (!total) return INK(0.12);
  if (entries.length === 1) return `rgb(var(--cat-${entries[0][0]}))`;
  let acc = 0;
  const stops = entries.map(([k, m]) => {
    const from = (acc / total) * 360; acc += m;
    return `rgb(var(--cat-${k})) ${from}deg ${(acc / total) * 360}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function Avatar({ name, url, size = 36 }) {
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover img-outline flex-shrink-0"
      style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: INK(0.08), color: INK(0.9), fontSize: size * 0.32 }}>
      {initialsOf(name)}
    </div>
  );
}

export default function Feed() {
  const { currentMonth } = useMonth();
  const { user } = useAuth();
  const { allActivities } = useActivities(currentMonth);
  const { members } = useTeamMembers();
  const [who, setWho] = useState(null);       // filtro por persona (email)
  const [limit, setLimit] = useState(PAGE);

  const [prEvents, setPrEvents] = useState([]);
  useEffect(() => {
    supabase.from('pr_achievements').select('*')
      .order('date', { ascending: false }).limit(40)
      .then(({ data }) => { if (data) setPrEvents(data); });
  }, []);

  const people = useMemo(() => {
    const m = {};
    members.forEach(p => { m[p.email] = { name: p.full_name || p.email?.split('@')[0] || 'Anónimo', url: p.avatar_url || null }; });
    return m;
  }, [members]);
  const person = email => people[email] || { name: email?.split('@')[0] || 'Anónimo', url: null };
  const nameFor = email => (email === user?.email ? 'Tú' : person(email).name.split(' ')[0]);

  const todayStr = dstr(new Date());

  // ── Hoy: por persona, minutos por familia ──
  const today = useMemo(() => {
    const m = {};
    allActivities.forEach(a => {
      if (a.date?.slice(0, 10) !== todayStr) return;
      const c = categoryOf(a.type);
      (m[a.user_email] = m[a.user_email] || {})[c] = (m[a.user_email]?.[c] || 0) + (a.duration_minutes || 0);
    });
    return m;
  }, [allActivities, todayStr]);

  const roster = useMemo(() => {
    const list = members.map(p => p.email).filter(Boolean);
    // Primero quien ha entrenado hoy, luego el resto; tú siempre delante
    return list.sort((a, b) =>
      (b === user?.email) - (a === user?.email) || (!!today[b]) - (!!today[a]) || person(a).name.localeCompare(person(b).name));
  }, [members, today, user?.email, people]);

  // ── Pulso de 7 días ──
  const pulse = useMemo(() => {
    const from = new Date(); from.setDate(from.getDate() - 6);
    const fromStr = dstr(from);
    let mins = 0, sessions = 0;
    const active = new Set(), byCat = {};
    allActivities.forEach(a => {
      const ds = a.date?.slice(0, 10);
      if (!ds || ds < fromStr || ds > todayStr) return;
      if (who && a.user_email !== who) return;
      const m = a.duration_minutes || 0;
      mins += m; sessions++; active.add(a.user_email);
      const c = categoryOf(a.type); byCat[c] = (byCat[c] || 0) + m;
    });
    const cats = CATEGORIES.map(c => ({ ...c, mins: byCat[c.key] || 0 })).filter(c => c.mins > 0);
    return { mins, sessions, active: active.size, cats };
  }, [allActivities, todayStr, who]);

  // ── Cronología ──
  const items = useMemo(() => {
    const acts = allActivities
      .filter(a => !who || a.user_email === who)
      .map(a => ({ ...a, _kind: 'activity' }));
    const prs = prEvents
      .filter(p => !who || p.user_email === who)
      .map(p => ({ ...p, _kind: 'pr' }));
    return [...acts, ...prs].sort((a, b) =>
      (b.date || '').slice(0, 10).localeCompare((a.date || '').slice(0, 10)) ||
      new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [allActivities, prEvents, who]);

  const grouped = useMemo(() => {
    const map = new Map();
    items.slice(0, limit).forEach(it => {
      const k = it.date?.slice(0, 10) || '—';
      if (!map.has(k)) map.set(k, { items: [], mins: 0 });
      const g = map.get(k);
      g.items.push(it);
      if (it._kind === 'activity') g.mins += it.duration_minutes || 0;
    });
    return [...map.entries()];
  }, [items, limit]);

  return (
    <div className="px-4 pt-2 pb-5 max-w-lg mx-auto">
      {/* ── Hoy ── */}
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {roster.map(email => {
          const p = person(email);
          const trained = !!today[email];
          const sel = who === email;
          return (
            <button key={email} onClick={() => { setWho(sel ? null : email); setLimit(PAGE); }}
              className="flex flex-col items-center gap-1 flex-shrink-0 transition-transform duration-150 ease-out active:scale-[0.96]"
              style={{ width: 54, opacity: who && !sel ? 0.45 : 1, transition: 'opacity .2s, transform .15s' }}
              aria-pressed={sel} aria-label={`Ver solo a ${p.name}`}>
              <div className="rounded-full flex items-center justify-center"
                style={{ width: 50, height: 50, padding: trained ? 2 : 1.5, background: ringBackground(today[email] || {}) }}>
                <div className="rounded-full flex items-center justify-center w-full h-full" style={{ background: 'var(--bg)', padding: 2 }}>
                  <Avatar name={p.name} url={p.url} size={trained ? 42 : 43} />
                </div>
              </div>
              <span className="text-[10px] truncate w-full text-center" style={{ color: sel ? 'var(--accent)' : INK(trained ? 0.85 : 0.45) }}>
                {nameFor(email)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Pulso de 7 días ── */}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${INK(0.12)}` }}>
        <div className="flex items-baseline justify-between">
          <h2 style={SECTION_TITLE}>{who ? nameFor(who) : 'Equipo'} · 7 días</h2>
          {who && (
            <button onClick={() => setWho(null)} className="text-[10.5px]" style={{ color: 'var(--accent)' }}>Ver todos</button>
          )}
        </div>
        <div className="flex items-end gap-6 mt-2">
          <div>
            <p className="text-[22px] leading-none" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmt(pulse.mins) || '0h'}</p>
            <p className="text-[10px] mt-1" style={{ color: INK(0.45) }}>entrenadas</p>
          </div>
          <div>
            <p className="text-[17px] leading-none" style={{ fontFamily: MONO, color: INK(0.9) }}>{pulse.sessions}</p>
            <p className="text-[10px] mt-1" style={{ color: INK(0.45) }}>{pulse.sessions === 1 ? 'sesión' : 'sesiones'}</p>
          </div>
          {!who && (
            <div>
              <p className="text-[17px] leading-none" style={{ fontFamily: MONO, color: INK(0.9) }}>
                {pulse.active}<span style={{ color: INK(0.35) }}>/{roster.length}</span>
              </p>
              <p className="text-[10px] mt-1" style={{ color: INK(0.45) }}>activos</p>
            </div>
          )}
        </div>
        {pulse.mins > 0 && (
          <>
            <div className="h-1.5 rounded-full flex overflow-hidden mt-3 gap-px">
              {pulse.cats.map(c => (
                <span key={c.key} style={{ flex: c.mins, background: `rgba(var(--cat-${c.key}),0.85)` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {pulse.cats.map(c => (
                <span key={c.key} className="flex items-center gap-1 text-[10px]" style={{ color: INK(0.55) }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: `rgba(var(--cat-${c.key}),0.85)` }} />
                  {c.label} <span style={{ fontFamily: MONO, color: INK(0.4) }}>{Math.round((c.mins / pulse.mins) * 100)}%</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Cronología ── */}
      {grouped.length === 0 ? (
        <p className="text-center text-[12px] py-12" style={{ color: INK(0.45) }}>
          {who ? 'Sin actividad registrada todavía.' : 'Aún no hay actividades en el equipo.'}
        </p>
      ) : grouped.map(([ds, g]) => (
        <section key={ds} className="mt-5 pt-3" style={{ borderTop: `1px solid ${INK(0.12)}` }}>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[12px] capitalize" style={{ letterSpacing: '0.12em', color: ds === todayStr ? 'var(--accent)' : INK(0.9) }}>
              {dayLabel(ds)}
            </h3>
            {g.mins > 0 && <span className="text-[10.5px]" style={{ fontFamily: MONO, color: INK(0.45) }}>{fmt(g.mins)}</span>}
          </div>

          {g.items.map((it, i) => {
            const p = person(it.user_email);
            const isMe = it.user_email === user?.email;
            const sep = i ? { borderTop: `1px solid ${INK(0.06)}` } : {};

            if (it._kind === 'pr') {
              const gain = it.old_value != null && it.new_value != null ? +(it.new_value - it.old_value).toFixed(2) : null;
              return (
                <div key={`pr-${it.id}`} className="flex items-center gap-3 py-2.5" style={sep}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(var(--accent-rgb),0.12)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),0.45)' }}>
                    <Trophy className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] truncate" style={{ color: INK(0.6) }}>
                      <span style={{ color: isMe ? 'var(--accent)' : INK(0.95) }}>{nameFor(it.user_email)}</span>
                      {isMe ? ' batiste tu marca' : ' batió su marca'} · <span style={{ color: INK(0.9) }}>{it.goal_title}</span>
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: MONO, color: INK(0.45) }}>
                      {it.old_value != null && <>{it.old_value} → </>}
                      <span style={{ color: 'var(--accent)' }}>{it.new_value} {it.unit}</span>
                      {gain ? <span style={{ color: INK(0.4) }}> · {gain > 0 ? '+' : ''}{gain}</span> : null}
                    </p>
                  </div>
                </div>
              );
            }

            const Icon = iconFor(it.type);
            const label = ACTIVITY_TYPES[it.type]?.label || it.type;
            return (
              <div key={it.id} className="flex items-start gap-3 py-2.5" style={sep}>
                {/* Avatar con la familia de la actividad como insignia */}
                <div className="relative flex-shrink-0">
                  <Avatar name={p.name} url={p.url} size={36} />
                  <div className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg)' }}>
                    <div className="w-[15px] h-[15px] rounded-full flex items-center justify-center"
                      style={{ background: catColor(it.type, 0.18), boxShadow: `inset 0 0 0 1px ${catColor(it.type, 0.6)}` }}>
                      <Icon style={{ width: 8.5, height: 8.5, color: catColor(it.type, 1) }} strokeWidth={2.4} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] truncate" style={{ color: INK(0.5) }}>
                      <span style={{ color: isMe ? 'var(--accent)' : INK(0.95) }}>{nameFor(it.user_email)}</span>
                      {' · '}{label}{it.source === 'strava' ? ' · Strava' : ''}
                    </p>
                    {it.duration_minutes > 0 && (
                      <span className="text-[12px] flex-shrink-0" style={{ fontFamily: MONO, color: INK(0.85) }}>{fmt(it.duration_minutes)}</span>
                    )}
                  </div>
                  {it.description && (
                    <p className="text-[12px] mt-0.5 leading-snug" style={{ color: INK(0.75) }}>{it.description}</p>
                  )}
                  {it.progress_note && (
                    <p className="text-[11px] mt-1 italic leading-snug" style={{ color: INK(0.5) }}>“{it.progress_note}”</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {items.length > limit && (
        <button onClick={() => setLimit(l => l + PAGE)}
          className="w-full mt-4 py-2.5 rounded-full text-[12px] transition-transform duration-150 ease-out active:scale-[0.96]"
          style={{ background: INK(0.06), color: INK(0.6) }}>
          Ver más
        </button>
      )}
    </div>
  );
}
