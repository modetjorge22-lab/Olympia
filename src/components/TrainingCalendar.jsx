import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Trophy, Check, X } from 'lucide-react';
import { DashedFrame } from '@/components/sketch';
import { iconFor, categoryOf } from '@/utils/activityIcons';
import ActivityFilterButton from '@/components/ActivityFilterButton';

const EMPTY = [];

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
const TODAY_RED = 'var(--today)';

// Una actividad → halo de su color. Dos (iguales o distintas) → celda partida
// en vertical, una mitad por sesión, con una fina separación central.
function cellBackground(types) {
  const cats = types.slice(0, 2).map(categoryOf);
  if (cats.length === 0) return 'transparent';
  if (cats.length === 1) {
    return `radial-gradient(circle at center, rgba(var(--cat-${cats[0]}),0.42) 0%, rgba(var(--cat-${cats[0]}),0.06) 82%)`;
  }
  // Cada mitad lleva el MISMO halo que una celda de una sola actividad, así la
  // tonalidad es idéntica haya una o dos sesiones. Fina línea central encima.
  const halo = c => `radial-gradient(circle at center, rgba(var(--cat-${c}),0.42) 0%, rgba(var(--cat-${c}),0.06) 82%)`;
  return `linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(var(--ink),0.16) calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px)) center / 100% 100% no-repeat, ${halo(cats[0])} left / 50% 100% no-repeat, ${halo(cats[1])} right / 50% 100% no-repeat`;
}

// ── Alimentación (en tinta: no es una familia de actividad) ──
// Vista «Alimentación»: cumplido = halo de tinta + check; fallado = marco
// vacío + aspa tenue; sin responder = marco vacío.
// Vista «Ambos»: la celda de entreno lleva abajo un punto (cumplido) o un
// guion (fallado).
function DietMark({ diet }) {
  if (!diet) return null;
  return (
    <span aria-label={diet.met ? 'Alimentación cumplida' : 'Alimentación no cumplida'} style={{
      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
      ...(diet.met
        ? { width: 3, height: 3, borderRadius: '50%', background: 'rgba(var(--ink),0.85)' }
        : { width: 5, height: 1.25, borderRadius: 1, background: 'rgba(var(--ink),0.45)' }),
    }} />
  );
}

function FoodCell({ date, diet, size, onClick, showNumber, todayMark, redToday }) {
  const today = new Date();
  const isToday = toDateStr(date) === toDateStr(today);
  const isFuture = date > today && !isToday;
  const met = diet?.met === true;
  const failed = diet?.met === false;
  return (
    <button
      onClick={() => onClick?.(date)}
      aria-label={met ? 'Cumplido' : failed ? 'No cumplido' : 'Sin responder'}
      className="relative flex flex-col items-center justify-center transition-transform duration-150 ease-out enabled:active:scale-[0.96]"
      style={{
        width: size, height: size, borderRadius: 9,
        background: met ? 'radial-gradient(circle at center, rgba(var(--ink),0.24) 0%, rgba(var(--ink),0.04) 82%)' : 'transparent',
        boxShadow: met ? 'inset 0 0 0 1px rgba(var(--ink),0.4)' : 'none',
      }}
    >
      {!met && <DashedFrame opacity={isFuture ? 0.2 : 0.4} />}
      {isToday && todayMark && (
        <span style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', width: 1.5, height: 7, borderRadius: 1, background: TODAY_RED }} />
      )}
      {showNumber && (
        <span style={{
          position: 'absolute', top: 5, left: 0, right: 0, textAlign: 'center',
          fontFamily: MONO, fontSize: 7, lineHeight: 1,
          color: isToday && redToday ? TODAY_RED : isFuture ? 'rgba(var(--accent-rgb),0.45)' : 'var(--accent)',
        }}>
          {date.getDate()}
        </span>
      )}
      {met && <Check style={{ width: 10, height: 10, marginTop: 8, color: 'rgba(var(--ink),0.85)' }} strokeWidth={2.3} />}
      {failed && <X style={{ width: 10, height: 10, marginTop: 8, color: 'rgba(var(--ink),0.4)' }} strokeWidth={1.8} />}
    </button>
  );
}

export const DayCell = React.memo(function DayCell({ date, acts = [], plans = [], isPR, size = 34, onClick, showNumber = true, todayMark = true, redToday = true, diet = null, view = 'train' }) {
  if (view === 'food') return <FoodCell date={date} diet={diet} size={size} onClick={onClick} showNumber={showNumber} todayMark={todayMark} redToday={redToday} />;
  const today = new Date();
  const isToday = toDateStr(date) === toDateStr(today);
  const isFuture = date > today && !isToday;
  const trained = acts.length > 0;
  const planned = !trained && plans.length > 0;
  const types = trained ? acts.map(a => a.type) : plans.map(p => p.activity_type);
  const uniq = types.slice(0, 2); // por sesión: dos carreras → dos símbolos
  const mainCat = trained ? categoryOf(acts[0].type) : null;

  return (
    <button
      onClick={() => onClick?.(date)}
      className="relative flex flex-col items-center justify-center transition-transform duration-150 ease-out enabled:active:scale-[0.96]"
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
          color: isToday && redToday ? TODAY_RED : isFuture && !planned ? 'rgba(var(--accent-rgb),0.45)' : 'var(--accent)',
          opacity: trained ? 0.75 : 1,
        }}>
          {date.getDate()}
        </span>
      )}
      {uniq.length > 0 && (
        <span className="flex items-center w-full" style={{ marginTop: 8, justifyContent: uniq.length > 1 ? 'space-around' : 'center' }}>
          {uniq.map((t, k) => {
            const Icon = iconFor(t);
            return (
              <Icon key={`${t}${k}`}
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
      {isPR && <Trophy aria-label="Marca personal" style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, color: 'var(--accent)' }} strokeWidth={2.4} />}
      {view === 'both' && <DietMark diet={diet} />}
    </button>
  );
});

// ── Semana deslizable de forma continua ──
// Tira horizontal con scroll libre (sin saltos por semana): se desliza día a
// día hacia el pasado o hacia lo planificado. Siempre caben 7 días en pantalla
// y una pequeña línea roja desde arriba marca el día de hoy.
const DOW_BY_JS = ['D','L','M','X','J','V','S'];

export function WeekStrip({ activitiesByDate, plansByDate, prDates = new Set(), onDayClick, onVisibleChange, weeksBack = 26, weeksForward = 12, dietByDate = {}, view = 'train' }) {
  const scrollRef = useRef(null);
  const [colW, setColW] = useState(0);

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

  // Sin estado ligado al scroll: deslizar la semana no provoca renders
  const BAR_H = 30;

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
      >
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isToday = i === todayIdx;
          const acts = activitiesByDate[ds] || EMPTY;
          return (
            <div key={ds} className="relative flex flex-col items-center gap-1 flex-shrink-0 pt-3.5"
              style={{ width: colW || '14.2857%' }}>
              {/* Marca del día de hoy — pequeña línea roja desde arriba */}
              {isToday && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 1.25, height: 13, borderRadius: 1, background: 'var(--today)',
                }} />
              )}
              <span className="text-[9px]" style={{
                fontFamily: MONO,
                color: isToday ? 'var(--today)' : 'rgba(var(--accent-rgb),0.55)',
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
                redToday={false}
                diet={dietByDate[ds]}
                view={view}
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
export function MonthScroller({ activitiesByDate, plansByDate, prDates = new Set(), onDayClick, monthsBack = 12, monthsForward = 3, dietByDate = {}, view = 'train' }) {
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
        let mins = 0, metDays = 0;
        for (let d = 1; d <= dim; d++) {
          const k = toDateStr(new Date(y, mo, d));
          (activitiesByDate[k] || []).forEach(a => { mins += a.duration_minutes || 0; });
          if (dietByDate[k]?.met) metDays++;
        }
        const isCurrent = `${y}-${mo}` === nowKey;
        return (
          <div key={`${y}-${mo}`} ref={isCurrent ? currentRef : null}
            style={{ height: MONTH_H, scrollSnapAlign: 'start', scrollSnapStop: 'always', overflow: 'hidden' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span style={{ fontSize: 13, letterSpacing: '0.14em', color: 'rgba(var(--ink),0.95)' }}>
                {MONTHS_FULL[mo]} {y}
              </span>
              <span className="text-[11px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>
                {view === 'food' ? `${metDays} ${metDays === 1 ? 'día cumplido' : 'días cumplidos'}` : fmtMins(mins)}
              </span>
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
                      diet={dietByDate[ds]}
                      view={view}
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
const VIEW_TITLES = { train: 'Entrenamiento', food: 'Alimentación', both: 'Tu semana' };

export function TrainingSection({ activitiesByDate, plansByDate, prDates, onDayClick, usedTypes = [], typeLabels = {}, filter = null, onFilterChange, onVisibleChange, dietByDate = {}, view = 'train', onViewChange, children }) {

  return (
    <div>
      <div className="relative flex items-center justify-end mb-3" style={{ minHeight: 32 }}>
        <h2 className="absolute left-1/2 -translate-x-1/2"
          style={{ fontSize: 13, letterSpacing: '0.14em', color: 'rgba(var(--ink),0.95)', fontWeight: 400 }}>
          {VIEW_TITLES[view] || VIEW_TITLES.train}
        </h2>

        <ActivityFilterButton value={filter} onChange={onFilterChange} types={usedTypes} labels={typeLabels}
          view={onViewChange ? view : undefined} onViewChange={onViewChange} />
      </div>

      <WeekStrip activitiesByDate={activitiesByDate} plansByDate={plansByDate} prDates={prDates} onDayClick={onDayClick} onVisibleChange={onVisibleChange} dietByDate={dietByDate} view={view} />
      {children}
    </div>
  );
}
