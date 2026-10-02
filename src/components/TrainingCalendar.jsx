import React, { useMemo, useRef, useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { DashedFrame } from '@/components/sketch';
import { iconFor, categoryOf, CATEGORIES } from '@/utils/activityIcons';

// Calendario de entrenamiento de Olympia (inspirado en Bevel Fall 2026):
//  · WeekStrip  → semana deslizable izq/der (pasado ← → planificado)
//  · MonthScroller → meses apilados con scroll vertical
// Entrenado = halo de acento + símbolo sólido · Planificado = rayas de acento
// + símbolo atenuado · Hoy = marco continuo.

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW = ['L','M','X','J','V','S','D'];
const MONO = '"JetBrains Mono", monospace';

export const toDateStr = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfWeek = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - dow);
  return x;
};

const fmtMins = m => {
  if (!m) return '0h';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
};

// ── Celda de día compartida ──
// Completado → marco continuo + tinte del color de su familia (fuerza, cardio…).
//   Dos familias el mismo día → la celda se parte en vertical, un color y un
//   símbolo en cada mitad.
// Planificado → marco discontinuo abierto en el color de su familia + halo leve.
// Hoy → pequeña línea roja que cae desde arriba.
const TODAY_RED = '#e5484d';

function cellBackground(types) {
  const cats = [...new Set(types.map(categoryOf))];
  if (cats.length === 0) return 'transparent';
  if (cats.length === 1) {
    return `radial-gradient(circle at center, rgba(var(--cat-${cats[0]}),0.42) 0%, rgba(var(--cat-${cats[0]}),0.06) 82%)`;
  }
  return `linear-gradient(90deg, rgba(var(--cat-${cats[0]}),0.38) 0 50%, rgba(var(--cat-${cats[1]}),0.38) 50% 100%)`;
}

export function DayCell({ date, acts = [], plans = [], isPR, size = 34, onClick, showNumber = true, todayMark = true }) {
  const today = new Date();
  const isToday = toDateStr(date) === toDateStr(today);
  const isFuture = date > today && !isToday;
  const trained = acts.length > 0;
  const planned = !trained && plans.length > 0;
  const types = trained ? acts.map(a => a.type) : plans.map(p => p.activity_type);
  const uniq = [...new Set(types)].slice(0, 2);
  const mainCat = trained ? categoryOf(acts[0].type) : null;

  return (
    <button
      onClick={() => onClick?.(date)}
      className="relative flex flex-col items-center justify-center transition-transform active:scale-90"
      style={{
        width: size, height: size, borderRadius: 9,
        background: trained ? cellBackground(types)
          : planned ? `radial-gradient(circle at center, rgba(var(--cat-${categoryOf(plans[0].activity_type)}),0.14) 0%, transparent 75%)`
          : 'transparent',
        boxShadow: trained ? `inset 0 0 0 1px rgba(var(--cat-${mainCat}),0.55)` : 'none',
      }}
    >
      {!trained && (
        <DashedFrame
          color={planned ? `rgba(var(--cat-${categoryOf(plans[0].activity_type)}),0.95)` : undefined}
          opacity={isFuture ? 0.2 : 0.4}
        />
      )}
      {isToday && todayMark && (
        <span style={{
          position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
          width: 1.5, height: 7, borderRadius: 1, background: TODAY_RED,
        }} />
      )}
      {showNumber && (
        <span style={{
          position: 'absolute', top: 5, left: 0, right: 0, textAlign: 'center',
          fontFamily: MONO, fontSize: 7, lineHeight: 1,
          color: isToday ? TODAY_RED : isFuture && !planned ? 'rgba(var(--accent-rgb),0.45)' : 'var(--accent)',
          opacity: trained ? 0.75 : 1,
        }}>
          {date.getDate()}
        </span>
      )}
      {uniq.length > 0 && (
        <span className="flex items-center w-full" style={{ marginTop: 8, justifyContent: uniq.length > 1 ? 'space-around' : 'center' }}>
          {uniq.map(t => {
            const Icon = iconFor(t);
            return (
              <Icon key={t}
                style={{
                  width: 10, height: 10,
                  color: `rgb(var(--cat-${categoryOf(t)}))`,
                  opacity: planned ? 0.75 : 1,
                  filter: trained ? 'brightness(0.75)' : 'none',
                }}
                strokeWidth={trained ? 2.3 : 1.8} />
            );
          })}
        </span>
      )}
      {isPR && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 7, lineHeight: 1 }}>🏆</span>}
    </button>
  );
}

// Leyenda de familias
export function CategoryLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {CATEGORIES.map(c => (
        <span key={c.key} className="flex items-center gap-1 text-[9.5px]" style={{ color: 'rgba(var(--ink),0.5)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: `rgba(var(--cat-${c.key}),0.75)` }} />
          {c.label}
        </span>
      ))}
      <span className="flex items-center gap-1 text-[9.5px]" style={{ color: 'rgba(var(--ink),0.5)' }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, border: '1px dashed rgba(var(--accent-rgb),0.8)' }} />
        Planificado
      </span>
    </div>
  );
}

// ── Semana deslizable de forma continua ──
// Tira horizontal con scroll libre (sin saltos por semana): se desliza día a
// día hacia el pasado o hacia lo planificado. Siempre caben 7 días en pantalla
// y una pequeña línea roja desde arriba marca el día de hoy.
const DOW_BY_JS = ['D','L','M','X','J','V','S'];

export function WeekStrip({ activitiesByDate, plansByDate, prDates = new Set(), onDayClick, onVisibleChange, weeksBack = 26, weeksForward = 12 }) {
  const scrollRef = useRef(null);
  const [colW, setColW] = useState(0);
  const [firstIdx, setFirstIdx] = useState(weeksBack * 7);

  const days = useMemo(() => {
    const s = startOfWeek(new Date());
    s.setDate(s.getDate() - weeksBack * 7);
    return Array.from({ length: (weeksBack + weeksForward + 1) * 7 }, (_, i) => {
      const d = new Date(s); d.setDate(s.getDate() + i); return d;
    });
  }, [weeksBack, weeksForward]);

  const todayStr = toDateStr(new Date());
  const todayIdx = days.findIndex(d => toDateStr(d) === todayStr);
  const homeIdx = weeksBack * 7; // lunes de la semana actual

  // Minutos por día y escala común de las barras
  const dayMins = useMemo(() => days.map(d =>
    (activitiesByDate[toDateStr(d)] || []).reduce((s, a) => s + (a.duration_minutes || 0), 0)), [days, activitiesByDate]);
  const maxMins = Math.max(60, ...dayMins);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth / 7;
    setColW(w);
    el.scrollLeft = homeIdx * w;
    const ro = new ResizeObserver(() => setColW(el.clientWidth / 7));
    ro.observe(el);
    return () => ro.disconnect();
  }, [homeIdx]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !colW) return;
    setFirstIdx(Math.max(0, Math.min(days.length - 7, Math.round(el.scrollLeft / colW))));
  };

  // Avisa al padre del rango visible (para marcarlo en la tendencia)
  useEffect(() => {
    if (onVisibleChange && days[firstIdx]) onVisibleChange(days[firstIdx], days[firstIdx + 6]);
  }, [firstIdx]);

  // Resumen de los 7 días visibles vs media semanal de las 12 semanas previas
  const summary = useMemo(() => {
    const visMins = dayMins.slice(firstIdx, firstIdx + 7).reduce((s, m) => s + m, 0);
    const sessions = days.slice(firstIdx, firstIdx + 7)
      .reduce((s, d) => s + (activitiesByDate[toDateStr(d)] || []).length, 0);
    const from = Math.max(0, firstIdx - 84);
    const prevSpan = firstIdx - from;
    const prevMins = dayMins.slice(from, firstIdx).reduce((s, m) => s + m, 0);
    const avgWeek = prevSpan >= 7 ? prevMins / (prevSpan / 7) : 0;
    return { visMins, sessions, avgWeek, delta: avgWeek > 0 ? visMins - avgWeek : null };
  }, [firstIdx, dayMins, days, activitiesByDate]);

  const first = days[firstIdx], last = days[firstIdx + 6];
  const short = d => `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3).toLowerCase()}`;
  const BAR_H = 30;

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
      >
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isToday = i === todayIdx;
          const acts = activitiesByDate[ds] || [];
          return (
            <div key={ds} className="relative flex flex-col items-center gap-1 flex-shrink-0 pt-3.5"
              style={{ width: colW || '14.2857%' }}>
              {/* Marca del día de hoy — pequeña línea roja desde arriba */}
              {isToday && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 1.25, height: 13, borderRadius: 1, background: '#e5484d',
                }} />
              )}
              <span className="text-[9px]" style={{
                fontFamily: MONO,
                color: isToday ? '#e5484d' : 'rgba(var(--accent-rgb),0.55)',
              }}>
                {DOW_BY_JS[d.getDay()]}
              </span>
              <DayCell
                date={d}
                acts={acts}
                plans={plansByDate[ds]}
                isPR={prDates.has(ds)}
                size={40}
                onClick={onDayClick}
                todayMark={false}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── Meses apilados con scroll vertical ──
// Cada mes ocupa exactamente el alto del marco (6 filas máx.), con snap
// obligatorio: en reposo solo se ve un mes, nunca el anterior o el siguiente.
const MONTH_H = 294; // título + días de la semana + 6 filas de 36px
export function MonthScroller({ activitiesByDate, plansByDate, prDates = new Set(), onDayClick, monthsBack = 12, monthsForward = 3 }) {
  const scrollRef = useRef(null);
  const currentRef = useRef(null);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: monthsBack + monthsForward + 1 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - monthsBack + i, 1));
  }, [monthsBack, monthsForward]);

  // Arranca posicionado en el mes actual
  useEffect(() => {
    if (scrollRef.current && currentRef.current) {
      scrollRef.current.scrollTop = currentRef.current.offsetTop - scrollRef.current.offsetTop;
    }
  }, []);

  const nowKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto"
      style={{ height: MONTH_H, scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', scrollbarWidth: 'none' }}
    >
      {months.map(m => {
        const y = m.getFullYear(), mo = m.getMonth();
        const dim = new Date(y, mo + 1, 0).getDate();
        const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
        let mins = 0;
        for (let d = 1; d <= dim; d++) {
          (activitiesByDate[toDateStr(new Date(y, mo, d))] || []).forEach(a => { mins += a.duration_minutes || 0; });
        }
        const isCurrent = `${y}-${mo}` === nowKey;
        return (
          <div key={`${y}-${mo}`} ref={isCurrent ? currentRef : null}
            style={{ height: MONTH_H, scrollSnapAlign: 'start', scrollSnapStop: 'always', overflow: 'hidden' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span style={{ fontSize: 13, letterSpacing: '0.14em', color: 'rgba(var(--ink),0.95)' }}>
                {MONTHS_FULL[mo]} {y}
              </span>
              <span className="text-[11px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMins(mins)}</span>
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 max-w-[340px] mx-auto">
              {DOW.map(d => (
                <span key={d} className="text-center text-[8px]" style={{ fontFamily: MONO, color: 'rgba(var(--accent-rgb),0.55)' }}>{d}</span>
              ))}
              {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
              {Array.from({ length: dim }, (_, i) => {
                const d = new Date(y, mo, i + 1);
                const ds = toDateStr(d);
                return (
                  <div key={ds} className="flex justify-center">
                    <DayCell
                      date={d}
                      acts={activitiesByDate[ds]}
                      plans={plansByDate[ds]}
                      isPR={prDates.has(ds)}
                      size={36}
                      onClick={onDayClick}
                      todayMark={false}
                    />
                  </div>
                );
              })}
              {Array.from({ length: 42 - lead - dim }, (_, i) => <span key={`t${i}`} style={{ height: 36 }} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sección de Entrenamiento (semana) ──
// Título centrado; a la derecha el filtro por actividad, que gobierna toda la
// pestaña (semana, calendario, Mi Actividad, Ritmo estacional).
export function TrainingSection({ activitiesByDate, plansByDate, prDates, onDayClick, usedTypes = [], typeLabels = {}, filter = null, onFilterChange, onVisibleChange, children }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const btn = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid var(--glass-border)',
  };
  const FilterIcon = filter ? iconFor(filter) : SlidersHorizontal;

  return (
    <div>
      <div className="relative flex items-center justify-end mb-3" style={{ minHeight: 32 }}>
        <h2 className="absolute left-1/2 -translate-x-1/2"
          style={{ fontSize: 13, letterSpacing: '0.14em', color: 'rgba(var(--ink),0.95)', fontWeight: 400 }}>
          Entrenamiento
        </h2>

        <div ref={menuRef} className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ ...btn, ...(filter ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : {}) }}
            aria-label="Filtrar por actividad">
            <FilterIcon className="w-3.5 h-3.5" style={{ color: filter ? 'var(--accent)' : 'rgba(var(--ink),0.75)' }} />
          </button>
          {open && (
            <div className="absolute right-0 z-50 mt-1.5 p-1 min-w-[180px]"
              style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink),0.12)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
              {[null, ...usedTypes].map(t => {
                const Icon = t ? iconFor(t) : SlidersHorizontal;
                const on = filter === t;
                return (
                  <button key={t || 'all'} onClick={() => { onFilterChange?.(t); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12px]"
                    style={on ? { background: 'rgba(var(--ink),0.07)', color: 'rgba(var(--ink),0.95)' } : { color: 'rgba(var(--ink),0.65)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: t ? `rgb(var(--cat-${categoryOf(t)}))` : 'rgba(var(--ink),0.5)' }} />
                    {t ? (typeLabels[t] || t) : 'Todas las actividades'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <WeekStrip activitiesByDate={activitiesByDate} plansByDate={plansByDate} prDates={prDates} onDayClick={onDayClick} onVisibleChange={onVisibleChange} />
      {children}
    </div>
  );
}
