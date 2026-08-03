// Ritmo estacional — horas acumuladas día a día en un periodo, comparadas
// con el periodo anterior equivalente (tu pasado como referencia).
// Se usa igual en "Tú" (datos propios) y en "Grupos" (media del equipo).

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayCount = (a, b) => Math.round((b - a) / 86400000) + 1;

// activities: [{ date, duration_minutes }]  ·  months: 1 | 3  ·  divisor: nº de personas
export function buildSeasonalSeries(activities, { year, month, months = 1, divisor = 1 }) {
  const start = new Date(year, month - (months - 1), 1);
  const end = new Date(year, month + 1, 0);
  const prevStart = new Date(year, month - (2 * months - 1), 1);
  const prevEnd = new Date(year, month - (months - 1), 0);

  const len = dayCount(start, end);
  const prevLen = dayCount(prevStart, prevEnd);

  // Minutos por fecha
  const byDate = {};
  activities.forEach(a => {
    const ds = a.date?.slice(0, 10);
    if (!ds) return;
    byDate[ds] = (byDate[ds] || 0) + (a.duration_minutes || 0);
  });

  const cumulative = (from, n) => {
    const out = [];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      acc += byDate[fmt(d)] || 0;
      out.push({ hours: +(acc / 60 / divisor).toFixed(1), date: d });
    }
    return out;
  };

  const cur = cumulative(start, len);
  const prev = cumulative(prevStart, prevLen);

  // La línea actual se corta en el día de hoy (si el periodo es el vigente)
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const data = cur.map((c, i) => {
    const p = prev[Math.min(i, prevLen - 1)];
    return {
      label: `${c.date.getDate()} ${MONTHS_SHORT[c.date.getMonth()]}`,
      cur: c.date > today ? null : c.hours,
      prev: p ? p.hours : null,
    };
  });

  const lastCur = [...data].reverse().find(d => d.cur != null);
  return {
    data,
    totalH: lastCur ? lastCur.cur : 0,
    prevTotalH: prev.length ? prev[prev.length - 1].hours : 0,
  };
}

// "12h 30min" a partir de horas decimales
export function formatHours(h) {
  const total = Math.round((h || 0) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}
