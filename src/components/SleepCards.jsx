import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis } from 'recharts';

// Sueño × actividad (privado: solo tus datos de WHOOP).
// Reglas de dataviz: nunca doble eje. Por eso la semana va en DOS paneles
// alineados (sueño arriba, actividad abajo) con cursor compartido, y la
// noche después es un único gráfico de dispersión.

const INK = a => `rgba(var(--ink),${a})`;
const MONO = '"JetBrains Mono", monospace';

export const fmtH = h => {
  if (h == null || Number.isNaN(h)) return '—';
  const sign = h < 0 ? '−' : '';
  const abs = Math.abs(h);
  let H = Math.floor(abs), M = Math.round((abs - H) * 60);
  if (M === 60) { H += 1; M = 0; }
  return M ? `${sign}${H}h ${String(M).padStart(2, '0')}` : `${sign}${H}h`;
};
const fmtMinDiff = m => `${m > 0 ? '+' : m < 0 ? '−' : ''}${Math.abs(Math.round(m))} min`;
const avg = arr => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

function Tip({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  const content = render(payload[0].payload);
  if (!content) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${INK(0.15)}`, borderRadius: 8,
      padding: '6px 9px', fontSize: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>{content}</div>
  );
}
const TipHead = ({ children }) => <p style={{ color: INK(0.55), fontSize: 9, marginBottom: 2 }}>{children}</p>;
const TipVal = ({ children }) => <p style={{ color: INK(0.95), fontSize: 11, lineHeight: 1.3, fontFamily: MONO }}>{children}</p>;

function Header({ title, headline, meta }) {
  return (
    <div className="mb-3">
      <h2 style={{ fontSize: 13, letterSpacing: '0.14em', color: INK(0.95), fontWeight: 400 }}>{title}</h2>
      {headline && <p className="mt-2 text-[12px]" style={{ color: INK(0.9) }}>{headline}</p>}
      {meta && <p className="mt-0.5" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>{meta}</p>}
    </div>
  );
}

const PanelLabel = ({ children }) => <p className="text-[10px] mb-1" style={{ color: INK(0.45) }}>{children}</p>;

// ── Semana a semana: sueño medio por noche (arriba) y horas de actividad (abajo) ──
export function SleepWeeklyCard({ weeks, CH, glassCard }) {
  const data = weeks.slice(-16);
  const withSleep = data.filter(w => w.sleepHours != null);

  // Frase: semanas por encima vs por debajo de tu mediana de actividad.
  const insight = useMemo(() => {
    if (withSleep.length < 4) return null;
    const sorted = [...withSleep].map(w => w.hours).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const hi = withSleep.filter(w => w.hours > median).map(w => w.sleepHours);
    const lo = withSleep.filter(w => w.hours <= median).map(w => w.sleepHours);
    if (hi.length < 2 || lo.length < 2) return null;
    const diffMin = (avg(hi) - avg(lo)) * 60;
    return { diffMin, hi: avg(hi), lo: avg(lo) };
  }, [withSleep]);

  const headline = !insight ? 'Con unas semanas más de datos verás el patrón.'
    : Math.abs(insight.diffMin) < 10 ? 'Duermes lo mismo entrenes más o menos.'
    : <>En tus semanas más activas duermes <span style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMinDiff(insight.diffMin)}</span> por noche</>;
  const meta = insight ? `${fmtH(insight.hi)} vs ${fmtH(insight.lo)} · ${withSleep.length} semanas` : null;

  const axisProps = { tick: { fontSize: 9, fill: CH.tick }, axisLine: false, tickLine: false, width: 26 };

  return (
    <div className="rounded-2xl p-4" style={glassCard}>
      <Header title="Sueño y actividad" headline={headline} meta={meta} />
      <PanelLabel>Sueño medio por noche</PanelLabel>
      <div className="h-[92px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId="sleep-week" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis {...axisProps} domain={[0, dataMax => Math.max(8, Math.ceil(dataMax))]} tickFormatter={v => `${v}h`} ticks={[0, 4, 8]} />
            <Tooltip cursor={{ fill: INK(0.05) }} content={p => (
              <Tip {...p} render={d => (<><TipHead>{d.intervalLabel}</TipHead>
                <TipVal>{d.sleepHours != null ? `${fmtH(d.sleepHours)} / noche` : 'sin datos de sueño'}</TipVal>
                <TipVal>{fmtH(d.hours)} entrenadas</TipVal></>)} />
            )} />
            <Bar dataKey="sleepHours" fill={CH.tick} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <PanelLabel>Horas de actividad por semana</PanelLabel>
      <div className="h-[104px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId="sleep-week" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} vertical={false} />
            <XAxis dataKey="label" tickFormatter={v => data.find(d => d.label === v)?.monthLabel || ''}
              tick={{ fontSize: 9, fill: CH.tick }} axisLine={{ stroke: CH.axis }} tickLine={false} interval={0} />
            <YAxis {...axisProps} tickFormatter={v => `${v}h`} allowDecimals={false} />
            <Tooltip cursor={{ fill: INK(0.05) }} content={p => (
              <Tip {...p} render={d => (<><TipHead>{d.intervalLabel}</TipHead>
                <TipVal>{fmtH(d.hours)} entrenadas</TipVal>
                <TipVal>{d.sleepHours != null ? `${fmtH(d.sleepHours)} / noche` : 'sin datos de sueño'}</TipVal></>)} />
            )} />
            <Bar dataKey="hours" fill={CH.accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── La noche después: minutos entrenados un día × sueño de esa noche ──
// El sueño de WHOOP se fecha el día en que te despiertas: el día D se cruza
// con el registro D+1.
export function buildNightPoints(activities, sleeps, days = 60) {
  const sleepByDate = new Map(sleeps.filter(s => s.duration_minutes).map(s => [s.date, s.duration_minutes]));
  const minsByDate = new Map();
  activities.forEach(a => { const d = a.date?.slice(0, 10); if (d) minsByDate.set(d, (minsByDate.get(d) || 0) + (a.duration_minutes || 0)); });
  const ds = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const out = [];
  const today = new Date();
  for (let i = days; i >= 1; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    const sleepMin = sleepByDate.get(ds(next));
    if (!sleepMin) continue;
    out.push({
      date: ds(day),
      label: day.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
      mins: minsByDate.get(ds(day)) || 0,
      sleepH: +(sleepMin / 60).toFixed(2),
    });
  }
  return out;
}

// Días: cada punto es un día (ruidoso). Semanas: cada punto es una semana
// (horas entrenadas × sueño medio por noche); con medias se ve mejor la tendencia.
export function SleepNightCard({ points, weeks = [], CH, glassCard }) {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('olympia_noche_mode') || 'days'; } catch { return 'days'; } });
  const pick = m => { setMode(m); try { localStorage.setItem('olympia_noche_mode', m); } catch { /* sin almacenamiento */ } };
  const byWeek = mode === 'weeks';

  let headline, meta, data;
  if (byWeek) {
    data = weeks.filter(w => w.sleepHours != null).map(w => ({ label: w.intervalLabel, x: +(w.hours || 0).toFixed(1), sleepH: w.sleepHours, weekly: true }));
    const sorted = data.map(d => d.x).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const hi = data.filter(d => d.x > median).map(d => d.sleepH);
    const lo = data.filter(d => d.x <= median).map(d => d.sleepH);
    const enough = hi.length >= 2 && lo.length >= 2;
    const diffMin = enough ? (avg(hi) - avg(lo)) * 60 : null;
    headline = !enough ? 'Con unas semanas más de datos verás el patrón.'
      : Math.abs(diffMin) < 10 ? 'Tus semanas más activas no cambian tu sueño.'
      : <>En tus semanas más activas duermes <span style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMinDiff(diffMin)}</span> por noche</>;
    meta = enough ? `${fmtH(avg(hi))} vs ${fmtH(avg(lo))} · ${data.length} semanas` : `${data.length} semanas`;
  } else {
    data = points.map(p => ({ ...p, x: p.mins }));
    // Días de más entreno vs más suaves (corte en tu mediana): funciona aunque
    // casi nunca descanses del todo.
    const sorted = points.map(p => p.mins).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const heavy = points.filter(p => p.mins > median).map(p => p.sleepH);
    const light = points.filter(p => p.mins <= median).map(p => p.sleepH);
    const enough = heavy.length >= 4 && light.length >= 4;
    const diffMin = enough ? (avg(heavy) - avg(light)) * 60 : null;
    headline = !enough ? 'Con más noches verás si hay relación.'
      : Math.abs(diffMin) < 10 ? 'Duermes lo mismo entrenes más o menos.'
      : <>Los días que más entrenas duermes <span style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMinDiff(diffMin)}</span></>;
    meta = enough ? `${fmtH(avg(heavy))} vs ${fmtH(avg(light))} en días más suaves · ${points.length} noches` : `${points.length} noches`;
  }

  // Eje X con marcas limpias: cada 60 min (días) o cada 2-5 h (semanas).
  const rawMax = Math.max(0, ...data.map(d => d.x));
  const step = byWeek ? (rawMax > 12 ? 5 : 2) : (rawMax > 240 ? 120 : 60);
  const xMax = Math.max(step, Math.ceil(rawMax / step) * step);
  const xTicks = Array.from({ length: xMax / step + 1 }, (_, i) => i * step);

  return (
    <div className="rounded-2xl p-4" style={glassCard}>
      <div className="flex items-start justify-between gap-3">
        <Header title={byWeek ? 'Semana a semana' : 'La noche después'} headline={headline} meta={meta} />
        <div className="flex items-center gap-0.5 rounded-full p-1 flex-shrink-0" role="radiogroup"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          {[['days', 'Días'], ['weeks', 'Semanas']].map(([k, l]) => (
            <button key={k} role="radio" aria-checked={mode === k} onClick={() => pick(k)}
              className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap"
              style={mode === k ? { background: INK(0.1), color: INK(0.95) } : { color: INK(0.45) }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="h-[170px] -ml-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CH.grid} />
            <XAxis type="number" dataKey="x" name="Entreno" tick={{ fontSize: 9, fill: CH.tick }}
              axisLine={{ stroke: CH.axis }} tickLine={false} tickFormatter={v => (byWeek ? `${v}h` : `${v}′`)}
              domain={[0, xMax]} ticks={xTicks} allowDecimals={false} />
            <YAxis type="number" dataKey="sleepH" name="Sueño" tick={{ fontSize: 9, fill: CH.tick }}
              axisLine={false} tickLine={false} width={26} tickFormatter={v => `${v}h`}
              domain={[dataMin => Math.max(0, Math.floor(dataMin) - 1), dataMax => Math.ceil(dataMax) + 1]} allowDecimals={false} />
            <ZAxis range={[64, 64]} />
            <Tooltip cursor={{ stroke: CH.cursor, strokeDasharray: '3 3' }} content={p => (
              <Tip {...p} render={d => (d.weekly
                ? <><TipHead>{d.label}</TipHead><TipVal>{fmtH(d.x)} entrenadas</TipVal><TipVal>{fmtH(d.sleepH)} / noche de media</TipVal></>
                : <><TipHead>{d.label}</TipHead><TipVal>{d.mins ? `${d.mins} min entrenados` : 'descanso'}</TipVal><TipVal>{fmtH(d.sleepH)} de sueño esa noche</TipVal></>)} />
            )} />
            <Scatter data={data} fill={CH.accent} fillOpacity={0.75} stroke="var(--bg)" strokeWidth={2} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] mt-1 text-center" style={{ fontFamily: MONO, color: INK(0.45) }}>
        {byWeek ? 'horas entrenadas en la semana → sueño medio por noche' : 'minutos entrenados ese día → sueño de esa noche'}
      </p>
    </div>
  );
}
