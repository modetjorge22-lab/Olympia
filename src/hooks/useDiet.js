import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { hasFeature } from '@/lib/features';
import { dstr, addDays, pendingDate, computeDietStats } from '@/utils/dietStats';

// Disciplina alimentaria. Opcional: cada uno la activa (team_members.diet_enabled)
// abajo del todo en Tú. Estándares en tags y un sí/no por día, siempre sobre
// el día anterior. Privado (RLS); el grupo solo ve la racha vía diet_streaks().

export { pendingDate, computeDietStats };
export const MAX_STANDARDS = 6;

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

const DietContext = createContext(null);

export function DietProvider({ children }) {
  const { user } = useAuth();
  const available = hasFeature('diet', user?.email);
  const [enabled, setEnabledState] = useState(false);
  const [standards, setStandards] = useState([]);
  const [byDate, setByDate] = useState({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.email || !available) return;
    const since = dstr(addDays(new Date(), -400));
    const [p, s, d] = await Promise.all([
      supabase.from('team_members').select('diet_enabled').eq('email', user.email).maybeSingle(),
      supabase.from('diet_standards').select('id, text, position')
        .eq('user_email', user.email).eq('archived', false).order('position'),
      supabase.from('diet_days').select('date, met, failed_ids')
        .eq('user_email', user.email).gte('date', since),
    ]);
    if (!p.error) setEnabledState(Boolean(p.data?.diet_enabled));
    if (!s.error) setStandards(s.data || []);
    if (!d.error) setByDate(Object.fromEntries((d.data || []).map(r => [r.date, { met: r.met, failed_ids: r.failed_ids || [] }])));
    setLoaded(true);
  }, [user?.email, available]);

  useEffect(() => { load(); }, [load]);

  const setEnabled = useCallback(async (on) => {
    setEnabledState(on);
    const { error } = await supabase.from('team_members').update({ diet_enabled: on }).eq('email', user.email);
    if (error) { console.error('diet setEnabled', error); load(); }
  }, [user, load]);

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
  const active = available && enabled;

  const value = useMemo(() => ({
    available, loaded, enabled, active, standards, byDate: active ? byDate : {}, stats,
    setEnabled, setDay, clearDay, saveStandards, reload: load,
  }), [available, loaded, enabled, active, standards, byDate, stats, setEnabled, setDay, clearDay, saveStandards, load]);

  return React.createElement(DietContext.Provider, { value }, children);
}

const EMPTY = { available: false, loaded: false, enabled: false, active: false, standards: [], byDate: {}, stats: computeDietStats({}, []) };

export function useDiet() {
  return useContext(DietContext) || EMPTY;
}
