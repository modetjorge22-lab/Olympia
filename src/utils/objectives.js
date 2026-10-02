// Progreso de un objetivo de volumen en su periodo actual.
// Semana = lunes a domingo · Mes = mes natural en curso.

const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function periodRange(period, now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const s = new Date(t); s.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { start: s, end: e };
  }
  return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: new Date(t.getFullYear(), t.getMonth() + 1, 0) };
}

// activities: actividades de la persona dueña del objetivo
export function objectiveProgress(obj, activities, now = new Date()) {
  const { start, end } = periodRange(obj.period, now);
  const s = key(start), e = key(end);
  const inPeriod = activities.filter(a => {
    const d = a.date?.slice(0, 10);
    return d && d >= s && d <= e && (!obj.activity_type || a.type === obj.activity_type);
  });
  const value = obj.metric === 'hours'
    ? inPeriod.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60
    : inPeriod.length;
  const target = Number(obj.target) || 1;
  const pct = Math.min(1, value / target);

  // Cuánto del periodo ha pasado → ¿vas a ritmo?
  const totalDays = Math.round((end - start) / 86400000) + 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsedDays = Math.min(totalDays, Math.round((today - start) / 86400000) + 1);
  const elapsed = elapsedDays / totalDays;
  const daysLeft = totalDays - elapsedDays;

  let status;
  if (value >= target) status = 'done';
  else if (pct >= elapsed - 0.05) status = 'on';
  else status = 'behind';

  return { value, target, pct, elapsed, daysLeft, status };
}

export function formatObjectiveValue(metric, v) {
  if (metric === 'sessions') return `${Math.round(v)}`;
  const mins = Math.round(v * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
