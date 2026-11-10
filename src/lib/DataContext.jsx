import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { useMonth } from './MonthContext';

const DataContext = createContext(null);

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { currentMonth } = useMonth();

  // Caché en memoria
  const monthCache = useRef({});
  const allActsCache = useRef(null);
  const teamMembersCache = useRef(null);
  const plansLoaded = useRef(false);

  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const mKey = monthKey(currentMonth);

  // ─── ACTIVITIES MENSUALES ───
  const fetchMonthActivities = useCallback(async (force = false) => {
    if (!force && monthCache.current[mKey]) {
      setActivities(monthCache.current[mKey]);
      return;
    }
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Construimos las fechas como string sin pasar por UTC para evitar desfases
    // por timezone (Madrid en DST estaba metiendo el 30/abril en el query de mayo).
    const monthStr = String(month + 1).padStart(2, '0');
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (!error && data) {
      monthCache.current[mKey] = data;
      setActivities(data);
    }
  }, [currentMonth, mKey]);

  // ─── ALL ACTIVITIES (histórico para gráficas) ───
  const fetchAllActivities = useCallback(async (force = false) => {
    if (!force && allActsCache.current) {
      setAllActivities(allActsCache.current);
      return;
    }
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) {
      allActsCache.current = data;
      setAllActivities(data);
    }
  }, []);

  // ─── TEAM MEMBERS ───
  const fetchTeamMembers = useCallback(async (force = false) => {
    if (!force && teamMembersCache.current) {
      setTeamMembers(teamMembersCache.current);
      return;
    }
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('full_name');
    if (!error && data) {
      teamMembersCache.current = data;
      setTeamMembers(data);
    }
  }, []);

  // ─── WEEKLY PLANS — todos del usuario, sin segmentar por mes ───
  const fetchWeeklyPlans = useCallback(async (force = false) => {
    if (!user?.email) return;
    if (!force && plansLoaded.current) return;
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_email', user.email)
      .order('date');
    if (!error && data) {
      plansLoaded.current = true;
      setWeeklyPlans(data);
    } else if (error) {
      console.error('fetchWeeklyPlans error:', error);
    }
  }, [user?.email]);

  // Carga inicial — una vez por usuario y al cambiar de mes (sólo activities mensuales se refrescan)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchMonthActivities(),
      fetchAllActivities(),
      fetchTeamMembers(),
      fetchWeeklyPlans(),
    ]).finally(() => setLoading(false));
  }, [user, mKey, fetchMonthActivities, fetchAllActivities, fetchTeamMembers, fetchWeeklyPlans]);

  // Auto-refresh silencioso cada 30 min — pensado para pantallas siempre encendidas
  // (totem de oficina). Recarga datos desde Supabase sin recargar la página.
  useEffect(() => {
    if (!user) return;
    const REFRESH_MS = 30 * 60 * 1000; // 30 minutos
    const id = setInterval(() => {
      fetchMonthActivities(true);
      fetchAllActivities(true);
      fetchTeamMembers(true);
      fetchWeeklyPlans(true);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, fetchMonthActivities, fetchAllActivities, fetchTeamMembers, fetchWeeklyPlans]);

  // Al volver a la app tras un rato en segundo plano (PWA reanudada), se
  // refrescan los datos: lo que han hecho los demás aparece sin recargar.
  useEffect(() => {
    if (!user) return;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 60 * 1000) {
        fetchMonthActivities(true);
        fetchAllActivities(true);
        fetchTeamMembers(true);
        fetchWeeklyPlans(true);
      }
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user, fetchMonthActivities, fetchAllActivities, fetchTeamMembers, fetchWeeklyPlans]);

  // ─── MUTATIONS ───
  const createActivity = useCallback(async (activityData) => {
    // Si WHOOP ya importó esta sesión (mismo día, duración ±15 min), lo que
    // apunta el usuario la corrige en vez de duplicarla. Se prefiere el mismo
    // tipo, pero vale otro: WHOOP a veces clasifica mal (tenis por pádel).
    if (activityData.date && activityData.duration_minutes) {
      const { data: fromWhoop } = await supabase
        .from('activities')
        .select('id, type, duration_minutes')
        .eq('user_email', user.email)
        .eq('date', activityData.date)
        .eq('source', 'whoop')
        .not('whoop_id', 'is', null);
      const near = (fromWhoop || []).filter(a =>
        Math.abs((a.duration_minutes || 0) - Number(activityData.duration_minutes)) <= 15);
      const twin = near.find(a => a.type === activityData.type) || near[0];
      if (twin) {
        const { data: merged, error: mergeError } = await supabase
          .from('activities')
          .update({ ...activityData, manually_edited: true })
          .eq('id', twin.id)
          .select()
          .single();
        if (!mergeError && merged) {
          const swap = list => (list || []).map(a => (a.id === merged.id ? merged : a));
          monthCache.current[mKey] = swap(monthCache.current[mKey]);
          allActsCache.current = swap(allActsCache.current);
          setActivities(monthCache.current[mKey]);
          setAllActivities(allActsCache.current);
          return merged;
        }
      }
    }

    let { data, error } = await supabase
      .from('activities')
      .insert({ ...activityData, user_id: user.id, user_email: user.email })
      .select()
      .single();
    // Fallback: si la columna muscle_groups no existe aún (migración SQL
    // pendiente), reintentamos sin ella para no bloquear el registro.
    if (error && /muscle_groups/i.test(error.message || '')) {
      console.warn('[Olympia] activities.muscle_groups no existe — ejecuta la migración SQL.');
      const { muscle_groups, ...rest } = activityData;
      const retry = await supabase
        .from('activities')
        .insert({ ...rest, user_id: user.id, user_email: user.email })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      console.error('createActivity error:', error);
      throw error;
    }
    if (data) {
      monthCache.current[mKey] = [data, ...(monthCache.current[mKey] || [])];
      allActsCache.current = [data, ...(allActsCache.current || [])];
      setActivities(monthCache.current[mKey]);
      setAllActivities(allActsCache.current);
    }
    return data;
  }, [user, mKey]);

  // Quita una actividad de las cachés y del estado (todas las cachés de mes).
  const dropActivityLocal = useCallback((id) => {
    for (const k of Object.keys(monthCache.current)) {
      monthCache.current[k] = (monthCache.current[k] || []).filter(a => a.id !== id);
    }
    setActivities(prev => prev.filter(a => a.id !== id));
    if (allActsCache.current) allActsCache.current = allActsCache.current.filter(a => a.id !== id);
    setAllActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  // Borrado en servidor. Si venía de WHOOP, se recuerda para que la próxima
  // sincronización no la vuelva a crear.
  const commitDeleteActivity = useCallback(async (target) => {
    if (target?.whoop_id) {
      await supabase.from('whoop_dismissed')
        .insert({ whoop_id: target.whoop_id, user_email: user.email });
    }
    const { error } = await supabase.from('activities').delete().eq('id', target.id);
    if (error) throw error;
  }, [user]);

  // Borrado con deshacer («deshacer en lugar de preguntar»): la actividad
  // desaparece al instante, pero el borrado real espera unos segundos. Devuelve
  // una función que lo cancela y la devuelve a su sitio. Si el borrado falla,
  // la actividad vuelve y se avisa con onError. Lo pendiente se confirma si la
  // app pasa a segundo plano, para no dejar borrados a medias.
  const pendingDeletes = useRef(new Map());
  const UNDO_MS = 6000;
  const deleteActivityWithUndo = useCallback((id, { onError } = {}) => {
    const target = [...Object.values(monthCache.current).flat(), ...(allActsCache.current || [])].find(a => a?.id === id);
    if (!target) return null;
    const inMonths = Object.keys(monthCache.current).filter(k => (monthCache.current[k] || []).some(a => a.id === id));
    const shownMonth = (monthCache.current[mKey] || []).some(a => a.id === id);
    const byDate = (a, b) => String(b.date).localeCompare(String(a.date));
    const restore = () => {
      for (const k of inMonths) {
        if (!(monthCache.current[k] || []).some(a => a.id === id)) {
          monthCache.current[k] = [...(monthCache.current[k] || []), target].sort(byDate);
        }
      }
      if (shownMonth) setActivities(prev => (prev.some(a => a.id === id) ? prev : [...prev, target].sort(byDate)));
      if (allActsCache.current && !allActsCache.current.some(a => a.id === id)) {
        allActsCache.current = [...allActsCache.current, target].sort(byDate);
      }
      setAllActivities(prev => (prev.some(a => a.id === id) ? prev : [...prev, target].sort(byDate)));
    };
    dropActivityLocal(id);
    const commit = async () => {
      const entry = pendingDeletes.current.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingDeletes.current.delete(id);
      try {
        await commitDeleteActivity(target);
        dropActivityLocal(id); // por si un refresco la trajo de vuelta mientras tanto
      } catch (err) {
        console.error('deleteActivity error:', err);
        restore();
        onError?.(err);
      }
    };
    pendingDeletes.current.set(id, { timer: setTimeout(commit, UNDO_MS), commit });
    return () => {
      const entry = pendingDeletes.current.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingDeletes.current.delete(id);
      restore();
    };
  }, [dropActivityLocal, commitDeleteActivity, mKey]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== 'hidden') return;
      for (const { commit } of [...pendingDeletes.current.values()]) commit();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const deleteActivity = useCallback(async (id) => {
    // Si venía de WHOOP, se recuerda para que la próxima sincronización no la
    // vuelva a crear.
    const target = [...(monthCache.current[mKey] || []), ...(allActsCache.current || [])].find(a => a.id === id);
    if (target?.whoop_id) {
      // insert (no upsert: RLS no da UPDATE); si ya existía, el error da igual.
      await supabase.from('whoop_dismissed')
        .insert({ whoop_id: target.whoop_id, user_email: user.email });
    }
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) {
      console.error('deleteActivity error:', error);
      throw error;
    }
    if (monthCache.current[mKey]) {
      monthCache.current[mKey] = monthCache.current[mKey].filter(a => a.id !== id);
      setActivities(monthCache.current[mKey]);
    }
    if (allActsCache.current) {
      allActsCache.current = allActsCache.current.filter(a => a.id !== id);
      setAllActivities(allActsCache.current);
    }
  }, [mKey, user]);

  // Actualiza campos de una actividad existente (típicamente training_type)
  const updateActivity = useCallback(async (id, patch) => {
    let { data, error } = await supabase
      .from('activities')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    // Fallback: si la columna manually_edited no existe aún (migración SQL
    // pendiente), reintentamos sin ella para no bloquear la edición.
    if (error && /manually_edited|muscle_groups/i.test(error.message || '')) {
      console.warn('[Olympia] activities.manually_edited no existe — ejecuta la migración SQL. Guardando edición sin la marca.');
      const { manually_edited, muscle_groups, ...rest } = patch;
      const retry = await supabase
        .from('activities')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      console.error('updateActivity error:', error);
      throw error;
    }
    if (data) {
      // Actualiza la fila en ambos cachés
      if (monthCache.current[mKey]) {
        monthCache.current[mKey] = monthCache.current[mKey].map(a => a.id === id ? data : a);
        setActivities([...monthCache.current[mKey]]);
      }
      if (allActsCache.current) {
        allActsCache.current = allActsCache.current.map(a => a.id === id ? data : a);
        setAllActivities([...allActsCache.current]);
      }
    }
    return data;
  }, [mKey]);

  const upsertProfile = useCallback(async (profileData) => {
    const { data, error } = await supabase
      .from('team_members')
      .upsert({ email: user.email, user_id: user.id, ...profileData }, { onConflict: 'email' })
      .select()
      .single();
    if (error) {
      console.error('upsertProfile error:', error);
      throw error;
    }
    if (data) {
      const updated = (teamMembersCache.current || []).filter(m => m.email !== user.email);
      teamMembersCache.current = [...updated, data].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setTeamMembers(teamMembersCache.current);
    }
    return data;
  }, [user]);

  const addPlan = useCallback(async ({ date, activity_type, notes, duration_minutes }) => {
    if (!user?.email) {
      console.error('addPlan: usuario no autenticado');
      return null;
    }

    const basePayload = {
      user_email: user.email,
      date,
      activity_type,
      notes: notes || null,
    };

    // Intento 1: con duration_minutes (si la columna existe en weekly_plans)
    const payload = (duration_minutes != null && duration_minutes > 0)
      ? { ...basePayload, duration_minutes }
      : basePayload;

    let { data, error } = await supabase
      .from('weekly_plans')
      .insert([payload])
      .select()
      .single();

    // Fallback: si la columna duration_minutes no existe aún (migración SQL pendiente),
    // reintentamos sin ella para no bloquear la creación del plan.
    if (error && /duration_minutes/i.test(error.message || '')) {
      console.warn(
        '[Olympia] weekly_plans.duration_minutes no existe — ejecuta la migración SQL. Guardando plan sin duración.'
      );
      const retry = await supabase
        .from('weekly_plans')
        .insert([basePayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('addPlan error:', error);
      throw error;
    }

    if (data) {
      setWeeklyPlans(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
    }
    return data;
  }, [user?.email]);

  const removePlan = useCallback(async (id) => {
    const { error } = await supabase.from('weekly_plans').delete().eq('id', id);
    if (error) {
      console.error('removePlan error:', error);
      return false;
    }
    setWeeklyPlans(prev => prev.filter(p => p.id !== id));
    return true;
  }, []);

  // Quitar un plan con deshacer: misma mecánica que las actividades.
  const plansRef = useRef(weeklyPlans);
  plansRef.current = weeklyPlans;
  const removePlanWithUndo = useCallback((id, { onError } = {}) => {
    const plan = plansRef.current.find(p => p.id === id);
    if (!plan) return null;
    setWeeklyPlans(prev => prev.filter(p => p.id !== id));
    const key = 'plan:' + id;
    const restore = () => setWeeklyPlans(prev =>
      (prev.some(p => p.id === id) ? prev : [...prev, plan].sort((a, b) => a.date.localeCompare(b.date))));
    const commit = async () => {
      const entry = pendingDeletes.current.get(key);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingDeletes.current.delete(key);
      const { error } = await supabase.from('weekly_plans').delete().eq('id', id);
      if (error) { console.error('removePlan error:', error); restore(); onError?.(error); }
    };
    pendingDeletes.current.set(key, { timer: setTimeout(commit, UNDO_MS), commit });
    return () => {
      const entry = pendingDeletes.current.get(key);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingDeletes.current.delete(key);
      restore();
    };
  }, []);

  // Derivados
  const myActivities = useMemo(
    () => activities.filter(a => a.user_email === user?.email),
    [activities, user?.email]
  );
  const myProfile = useMemo(
    () => teamMembers.find(m => m.email === user?.email),
    [teamMembers, user?.email]
  );

  const value = {
    activities,
    allActivities,
    myActivities,
    teamMembers,
    members: teamMembers,
    myProfile,
    weeklyPlans,
    plans: weeklyPlans,
    loading,
    createActivity,
    deleteActivity,
    deleteActivityWithUndo,
    updateActivity,
    upsertProfile,
    addPlan,
    removePlan,
    removePlanWithUndo,
    refresh: () => {
      fetchMonthActivities(true);
      fetchAllActivities(true);
      fetchTeamMembers(true);
      fetchWeeklyPlans(true);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
