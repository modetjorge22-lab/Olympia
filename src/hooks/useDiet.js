import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Disciplina alimentaria: hasta 3 estándares y un sí/no por día. Privado
// (RLS); el grupo solo ve la racha vía diet_streaks().

export const MAX_STANDARDS = 3;

import { dstr, addDays, pendingDate, computeDietStats } from '@/utils/dietStats';
export { pendingDate, computeDietStats };

// Rachas del grupo (solo la cifra; estándares y fallos siguen privados).
let streaksCache = null;
export function useDietStreaks() {
  const [map, setMap] = useState(streaksCache || {});
  useEffect(() => {
    let alive = true;
    supabase.rpc('diet_streaks').then(({ data, error }) => {
      if (error || !alive) return;
      streaksCache = Object.fromEntries((data || []).map(r => [r.user_email, r]));
      setMap(streaksCache);
    });
    return () => { alive = false; };
  }, []);
  return map;
}

export function useDiet() {
  const { user } = useAuth();
  const [standards, setStandards] = useState([]);
  const [byDate, setByDate] = useState({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.email) return;
    const since = dstr(addDays(new Date(), -400));
    const [s, d] = await Promise.all([
      supabase.from('diet_standards').select('id, text, position')
        .eq('user_email', user.email).eq('archived', false).order('position'),
      supabase.from('diet_days').select('date, met, failed_ids')
        .eq('user_email', user.email).gte('date', since),
    ]);
    if (!s.error) setStandards(s.data || []);
    if (!d.error) setByDate(Object.fromEntries((d.data || []).map(r => [r.date, { met: r.met, failed_ids: r.failed_ids || [] }])));
    setLoaded(true);
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const setDay = useCallback(async (date, met, failedIds = []) => {
    const entry = { met, failed_ids: met ? [] : failedIds };
    setByDate(m => ({ ...m, [date]: entry }));
    const { error } = await supabase.from('diet_days').upsert({
      user_email: user.email, user_id: user.id, date, ...entry, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_email,date' });
    if (error) { console.error('diet setDay', error); load(); }
  }, [user, load]);

  const clearDay = useCallback(async (date) => {
    setByDate(m => { const n = { ...m }; delete n[date]; return n; });
    const { error } = await supabase.from('diet_days').delete().eq('user_email', user.email).eq('date', date);
    if (error) { console.error('diet clearDay', error); load(); }
  }, [user, load]);

  // items: [{ id?, text }] en orden. Los que desaparecen se archivan (sus
  // fallos pasados siguen contando en el historial).
  const saveStandards = useCallback(async (items) => {
    const clean = items.map(i => ({ ...i, text: i.text.trim() })).filter(i => i.text).slice(0, MAX_STANDARDS);
    const keep = new Set(clean.filter(i => i.id).map(i => i.id));
    const removed = standards.filter(s => !keep.has(s.id)).map(s => s.id);
    if (removed.length) await supabase.from('diet_standards').update({ archived: true }).in('id', removed);
    for (const [position, i] of clean.entries()) {
      if (i.id) await supabase.from('diet_standards').update({ text: i.text, position }).eq('id', i.id);
      else await supabase.from('diet_standards').insert({ user_email: user.email, user_id: user.id, text: i.text, position });
    }
    await load();
  }, [standards, user, load]);

  const stats = useMemo(() => computeDietStats(byDate, standards), [byDate, standards]);

  return { loaded, standards, byDate, stats, setDay, clearDay, saveStandards, active: standards.length > 0 };
}
