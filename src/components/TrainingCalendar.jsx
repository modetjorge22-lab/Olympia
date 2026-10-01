import React, { useMemo, useRef, useEffect, useState } from 'react';
import { DashedFrame } from '@/components/sketch';
import { iconFor } from '@/utils/activityIcons';

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
function DayCell({ date, acts = [], plans = [], isPR, size = 34, onClick, showNumber = true }) {
  const today = new Date();
  const isToday = toDateStr(date) === toDateStr(today);
  const isFuture = date > today && !isToday;
  const trained = acts.length > 0;
  const planned = !trained && plans.length > 0;
  const types = trained ? acts.map(a => a.type) : plans.map(p => p.activity_type);
  const uniq = [...new Set(types)].slice(0, 2);

  return (
    <button
      onClick={() => onClick?.(date)}
      className="relative flex flex-col items-center justify-center transition-transform active:scale-90"
      style={{
        width: size, height: size, borderRadius: 9,
        ...(isToday ? { border: '1.5px solid rgba(var(--accent-rgb),0.9)' } : {}),
        background: trained
          ? 'radial-gradient(circle at center, rgba(var(--accent-rgb),0.42) 0%, rgba(var(--accent-rgb),0.03) 80%)'
          : 'transparent',
      }}
    >
      {!isToday && (
        <DashedFrame
          color={planned ? 'rgba(var(--accent-rgb),0.85)' : undefined}
          opacity={isFuture ? 0.2 : 0.4}
        />
      )}
      {showNumber && (
        <span style={{
          fontFamily: MONO, fontSize: 8.5, lineHeight: 1,
          color: isFuture && !planned ? 'rgba(var(--accent-rgb),0.45)' : 'var(--accent)',
          marginBottom: uniq.length ? 2 : 0,
        }}>
          {date.getDate()}
        </span>
      )}
      {uniq.length > 0 && (
        <span className="flex items-center gap-[1px]">
          {uniq.map(t => {
            const Icon = iconFor(t);
            return (
              <Icon key={t}
                style={{ width: 9, height: 9, color: 'var(--accent)', opacity: planned ? 0.6 : 1 }}
                strokeWidth={trained ? 2.4 : 1.8} />
            );
          })}
        </span>
      )}
      {isPR && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 7, lineHeight: 1 }}>🏆</span>}
    </button>
  );
}

// ── Semana deslizable de forma continua ──
// Tira horizontal con scroll libre (sin saltos por semana): se desliza día a
// día hacia el pasado o hacia lo planificado. Siempre caben 7 días en pantalla
// y una pequeña línea roja desde arriba marca el día de hoy.
const DOW_BY_JS = ['D','L','M','X','J','V','S'];

export function WeekStrip({ activitiesByDate, plansByDate, prDates = new Set(), onDayClick, weeksBack = 26, weeksForward = 12 }) {
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

  // Ancho de columna = 1/7 del contenedor; posición inicial en la semana actual
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth / 7;
      setColW(w);
      el.scrollLeft = homeIdx * w;
    };
    measure();
    const ro = new ResizeObserver(() => setColW(el.clientWidth / 7));
    ro.observe(el);
    return () => ro.disconnect();
  }, [homeIdx]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !colW) return;
    setFirstIdx(Math.round(el.scrollLeft / colW));
  };

  const visible = days.slice(firstIdx, firstIdx + 7);
  const summary = useMemo(() => {
    let mins = 0, sessions = 0, plannedN = 0;
    visible.forEach(d => {
      const ds = toDateStr(d);
      const acts = activitiesByDate[ds] || [];
      sessions += acts.length;
      mins += acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);
      if (!acts.length) plannedN += (plansByDate[ds] || []).length;
    });
    return { mins, sessions, plannedN };
  }, [firstIdx, activitiesByDate, plansByDate]);

  const first = visible[0], last = visible[visible.length - 1];
  const short = d => `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3).toLowerCase()}`;
  const awayFromToday = todayIdx >= 0 && (todayIdx < firstIdx || todayIdx > firstIdx + 6);

  const goHome = () => scrollRef.current?.scrollTo({ left: homeIdx * colW, behavior: 'smooth' });

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-[12px]" style={{ color: 'rgba(var(--ink),0.9)' }}>
            {first && last ? `${short(first)} – ${short(last)}` : ''}
          </p>
          <p className="text-[10px]" style={{ fontFamily: MONO, color: 'rgba(var(--ink),0.45)' }}>
            {summary.sessions} {summary.sessions === 1 ? 'sesión' : 'sesiones'} · {fmtMins(summary.mins)}
            {summary.plannedN > 0 && ` · ${summary.plannedN} plan.`}
          </p>
        </div>
        {awayFromToday && (
          <button onClick={goHome} className="text-[10px] px-3 py-1 rounded-full"
            style={{ border: '1px solid var(--glass-border)', color: 'rgba(var(--ink),0.6)' }}>
            Hoy
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
      >
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isToday = i === todayIdx;
          return (
            <div key={ds} className="relative flex flex-col items-center gap-1 flex-shrink-0 pt-2.5"
              style={{ width: colW || '14.2857%' }}>
              {/* Marca del día de hoy — pequeña línea roja desde arriba */}
              {isToday && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 2, height: 8, borderRadius: 1, background: '#e5484d',
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
                acts={activitiesByDate[ds]}
                plans={plansByDate[ds]}
                isPR={prDates.has(ds)}
                size={40}
                onClick={onDayClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Meses apilados con scroll vertical ──
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
      style={{ maxHeight: 330, scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', scrollbarWidth: 'none' }}
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
            className="pb-5" style={{ scrollSnapAlign: 'start' }}>
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
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
