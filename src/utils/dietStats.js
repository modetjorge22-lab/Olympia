// Cálculos puros de la disciplina alimentaria (sin React ni Supabase).

export const dstr = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };

// El día se juzga cuando ha terminado: pasadas las 12 de la noche se pregunta
// siempre por ayer. Los días anteriores se corrigen desde el detalle del día.
export function pendingDate(byDate, now = new Date()) {
  const target = dstr(addDays(now, -1));
  return byDate[target] ? null : target;
}

export function computeDietStats(byDate, standards, now = new Date()) {
  const today = dstr(now);
  // Racha: días cumplidos seguidos; hoy sin responder no la rompe todavía.
  let streak = 0;
  let d = byDate[today] ? new Date(now) : addDays(now, -1);
  while (byDate[dstr(d)]?.met) { streak++; d = addDays(d, -1); }

  const dates = Object.keys(byDate).sort();
  let best = 0, run = 0, prev = null;
  for (const ds of dates) {
    if (!byDate[ds].met) { run = 0; prev = ds; continue; }
    const consecutive = prev && dstr(addDays(new Date(`${prev}T12:00:00`), 1)) === ds && byDate[prev]?.met;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ds;
  }

  let met30 = 0, failed30 = 0;
  const failsBy = {};
  for (let i = 0; i < 30; i++) {
    const e = byDate[dstr(addDays(now, -i))];
    if (!e) continue;
    if (e.met) met30++;
    else {
      failed30++;
      (e.failed_ids || []).forEach(id => { failsBy[id] = (failsBy[id] || 0) + 1; });
    }
  }
  const failsByStandard = standards
    .map(s => ({ ...s, fails: failsBy[s.id] || 0 }))
    .filter(s => s.fails > 0)
    .sort((a, b) => b.fails - a.fails);

  return { streak, best: Math.max(best, streak), met30, failed30, failsByStandard };
}
