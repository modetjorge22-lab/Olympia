// Récords del equipo — "inteligencia de datos" sobre todo el histórico.
// Mezcla récords clásicos (racha, mejor semana) con patrones curiosos
// (fiel a un día, fénix, metrónomo, navaja suiza…). Cada récord devuelve el
// titular y un valor legible; los que no tienen datos suficientes se omiten.

const DAY = 86400000;
const DOW_FULL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const toKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = s => new Date(`${s}T12:00:00`);
const fmtMin = m => {
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? (r ? `${h}h ${r}min` : `${h}h`) : `${r}min`;
};
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const mondayOf = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return toKey(x); };

// Métricas por persona
function profile(acts, prCount) {
  const days = {};
  acts.forEach(a => {
    const k = a.date?.slice(0, 10);
    if (!k) return;
    (days[k] = days[k] || []).push(a);
  });
  const keys = Object.keys(days).sort();
  const totalMin = acts.reduce((s, a) => s + (a.duration_minutes || 0), 0);

  // Racha de días seguidos
  let streak = 0, cur = 0, prev = null;
  keys.forEach(k => {
    const d = parse(k);
    cur = prev && Math.round((d - prev) / DAY) === 1 ? cur + 1 : 1;
    streak = Math.max(streak, cur);
    prev = d;
  });

  // Mayor parón seguido de vuelta (fénix)
  let comeback = 0;
  for (let i = 1; i < keys.length; i++) comeback = Math.max(comeback, Math.round((parse(keys[i]) - parse(keys[i - 1])) / DAY) - 1);

  // Semanas (lunes) y meses
  const weeks = {}, months = {}, weekSessions = {};
  acts.forEach(a => {
    const k = a.date?.slice(0, 10); if (!k) return;
    const d = parse(k);
    const w = mondayOf(d), m = k.slice(0, 7);
    weeks[w] = (weeks[w] || 0) + (a.duration_minutes || 0);
    months[m] = (months[m] || 0) + (a.duration_minutes || 0);
    weekSessions[w] = (weekSessions[w] || 0) + 1;
  });
  const bestWeek = Math.max(0, ...Object.values(weeks));
  const bestMonth = Math.max(0, ...Object.values(months));

  // Semanas consecutivas con 3+ sesiones
  const wk = Object.keys(weekSessions).sort();
  let consist = 0, run = 0, pw = null;
  wk.forEach(w => {
    const ok = weekSessions[w] >= 3;
    const contiguous = pw && Math.round((parse(w) - parse(pw)) / DAY) === 7;
    run = ok ? (contiguous && run > 0 ? run + 1 : 1) : 0;
    consist = Math.max(consist, run);
    pw = w;
  });

  // Día de la semana más fiel
  const dowCount = Array(7).fill(0);
  keys.forEach(k => { dowCount[parse(k).getDay()]++; });
  const favDow = dowCount.indexOf(Math.max(...dowCount));

  // Fin de semana
  const weekendMin = acts.filter(a => { const g = parse(a.date.slice(0, 10)).getDay(); return g === 0 || g === 6; })
    .reduce((s, a) => s + (a.duration_minutes || 0), 0);

  // Dobletes, variedad, sesión más larga, constancia de duración
  const doubles = keys.filter(k => days[k].length >= 2).length;
  const types = new Set(acts.map(a => a.type));
  const longest = acts.reduce((b, a) => (a.duration_minutes || 0) > (b?.duration_minutes || 0) ? a : b, null);
  const durs = acts.map(a => a.duration_minutes || 0).filter(x => x > 0);
  const mean = durs.reduce((s, x) => s + x, 0) / (durs.length || 1);
  const sd = Math.sqrt(durs.reduce((s, x) => s + (x - mean) ** 2, 0) / (durs.length || 1));

  // Especialista: % en su deporte principal
  const byType = {};
  acts.forEach(a => { byType[a.type] = (byType[a.type] || 0) + (a.duration_minutes || 0); });
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  return {
    sessions: acts.length, activeDays: keys.length, totalMin,
    streak, comeback, bestWeek, bestMonth, consist,
    favDow, favDowN: dowCount[favDow] || 0,
    weekendPct: totalMin ? weekendMin / totalMin : 0,
    doubles, variety: types.size,
    longest, mean, sd,
    topType: top?.[0], topPct: top && totalMin ? top[1] / totalMin : 0,
    prCount,
  };
}

// Devuelve [{ key, title, desc, icon, holder, value }]
export function computeTeamRecords({ activities, people, prs = [], typeLabels = {} }) {
  const P = people.map(p => {
    const acts = activities.filter(a => a.user_email === p.email && a.date);
    return { ...p, s: profile(acts, prs.filter(r => r.user_email === p.email).length) };
  }).filter(p => p.s.sessions > 0);
  if (!P.length) return [];

  const best = (fn, { min = 0, lower = false } = {}) => {
    const c = P.filter(p => fn(p.s) != null && (lower ? fn(p.s) >= min : fn(p.s) > min));
    if (!c.length) return null;
    return c.sort((a, b) => lower ? fn(a.s) - fn(b.s) : fn(b.s) - fn(a.s))[0];
  };

  const out = [];
  const add = (key, title, desc, icon, p, value) => { if (p) out.push({ key, title, desc, icon, holder: p, value }); };

  let p;
  p = best(s => s.streak, { min: 1 });
  add('streak', 'Racha imparable', 'Más días seguidos entrenando', 'flame', p, p && pl(p.s.streak, 'día', 'días'));

  p = best(s => s.consist, { min: 1 });
  add('consist', 'Sin excusas', 'Semanas seguidas con 3+ sesiones', 'calendarCheck', p, p && pl(p.s.consist, 'semana', 'semanas'));

  p = best(s => s.bestWeek);
  add('week', 'Semana de hierro', 'Más horas en una sola semana', 'zap', p, p && fmtMin(p.s.bestWeek));

  p = best(s => s.longest?.duration_minutes || 0);
  add('longest', 'Fondista', 'La sesión más larga del grupo', 'timer', p,
    p && `${fmtMin(p.s.longest.duration_minutes)} · ${typeLabels[p.s.longest.type] || p.s.longest.type}`);

  p = best(s => s.doubles);
  add('doubles', 'Doblete', 'Más días con dos sesiones', 'layers', p, p && pl(p.s.doubles, 'día', 'días'));

  p = best(s => s.variety, { min: 2 });
  add('variety', 'Navaja suiza', 'Más deportes distintos practicados', 'shuffle', p, p && `${p.s.variety} deportes`);

  p = best(s => s.favDowN, { min: 3 });
  add('dow', 'Fiel a su día', 'El día de la semana que más repite', 'repeat', p,
    p && `${p.s.favDowN} ${DOW_FULL[p.s.favDow]}`);

  p = best(s => s.sessions >= 6 ? s.weekendPct : null, { min: 0.3 });
  add('weekend', 'Guerrero de finde', 'Mayor parte de sus horas en sábado y domingo', 'sun', p,
    p && `${Math.round(p.s.weekendPct * 100)}% en finde`);

  p = best(s => s.sessions >= 8 && s.mean > 0 ? s.sd / s.mean : null, { lower: true });
  add('metronome', 'Metrónomo', 'Sus sesiones duran siempre lo mismo', 'metronome', p,
    p && `±${Math.round(p.s.sd)} min sobre ${Math.round(p.s.mean)}`);

  p = best(s => s.sessions >= 6 ? s.topPct : null, { min: 0.6 });
  add('specialist', 'Especialista', 'Más fiel a un único deporte', 'target', p,
    p && `${Math.round(p.s.topPct * 100)}% ${typeLabels[p.s.topType] || p.s.topType}`);

  p = best(s => s.comeback, { min: 13 });
  add('phoenix', 'Ave fénix', 'La vuelta tras el parón más largo', 'sunrise', p, p && `${pl(p.s.comeback, 'día', 'días')} fuera`);

  p = best(s => s.prCount);
  add('prs', 'Cazamarcas', 'Más marcas personales batidas', 'trophy', p, p && pl(p.s.prCount, 'marca', 'marcas'));

  p = best(s => s.bestMonth);
  add('month', 'Mes de oro', 'El mejor mes de alguien del grupo', 'medal', p, p && fmtMin(p.s.bestMonth));

  return out;
}
