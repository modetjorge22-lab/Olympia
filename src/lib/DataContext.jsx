import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { useMonth } from './MonthContext';

const DataContext = createContext(null);

// Convierte Date → "YYYY-MM" para cache key estable
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { currentMonth } = useMonth();

  // Caché en memoria (se mantiene mientras la app esté montada)
  const monthCache = useRef({}); // { 'YYYY-MM': activities[] }
  const allActsCache = useRef(null);
  const teamMembersCache = useRef(null);
  const plansCache = useRef({}); // { 'YYYY-MM': plans[] }

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
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

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

  // ─── ALL ACTIVITIES (para histórico de gráficas) ───
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

  // ─── WEEKLY PLANS (rango ±1 mes desde currentMonth) ───
  const fetchWeeklyPlans = useCallback(async (force = false) => {
    if (!user?.email) return;
    if (!force && plansCache.current[mKey]) {
      setWeeklyPlans(plansCache.current[mKey]);
      return;
    }
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;

    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_email', user.email)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date');

    if (!error && data) {
      plansCache.current[mKey] = data;
      setWeeklyPlans(data);
    }
  }, [user?.email, currentMonth, mKey]);

  // Carga inicial — sólo cuando cambia el usuario o el mes
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

  // ─── MUTATIONS ───
  const createActivity = async (activityData) => {
    const { data, error } = await supabase
      .from('activities')
      .insert({ ...activityData, user_id: user.id, user_email: user.email })
      .select()
      .single();
    if (error) throw error;

    // Optimistic update + invalidación
    if (data) {
      monthCache.current[mKey] = [data, ...(monthCache.current[mKey] || [])];
      allActsCache.current = [data, ...(allActsCache.current || [])];
      setActivities(monthCache.current[mKey]);
      setAllActivities(allActsCache.current);
    }
    return data;
  };

  const deleteActivity = async (id) => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
    // Update cache
    if (monthCache.current[mKey]) {
      monthCache.current[mKey] = monthCache.current[mKey].filter(a => a.id !== id);
      setActivities(monthCache.current[mKey]);
    }
    if (allActsCache.current) {
      allActsCache.current = allActsCache.current.filter(a => a.id !== id);
      setAllActivities(allActsCache.current);
    }
  };

  const upsertProfile = async (profileData) => {
    const { data, error } = await supabase
      .from('team_members')
      .upsert({ email: user.email, ...profileData }, { onConflict: 'email' })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const updated = (teamMembersCache.current || []).filter(m => m.email !== user.email);
      teamMembersCache.current = [...updated, data].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setTeamMembers(teamMembersCache.current);
    }
    return data;
  };

  const addPlan = async ({ date, activity_type, notes }) => {
    if (!user?.email) return null;
    const { data, error } = await supabase
      .from('weekly_plans')
      .insert([{ user_email: user.email, date, activity_type, notes: notes || null }])
      .select()
      .single();
    if (!error && data) {
      const updated = [...(plansCache.current[mKey] || []), data].sort((a, b) => a.date.localeCompare(b.date));
      plansCache.current[mKey] = updated;
      setWeeklyPlans(updated);
    }
    return error ? null : data;
  };

  const removePlan = async (id) => {
    const { error } = await supabase.from('weekly_plans').delete().eq('id', id);
    if (!error && plansCache.current[mKey]) {
      plansCache.current[mKey] = plansCache.current[mKey].filter(p => p.id !== id);
      setWeeklyPlans(plansCache.current[mKey]);
    }
    return !error;
  };

  // Derivados
  const myActivities = useMemo(
    () => activities.filter(a => a.user_email === user?.email),
    [activities, user?.email]
  );
  const myProfile = useMemo(
    () => teamMembers.find(m => m.email === user?.email),
    [teamMembers, user?.email]
  );

  const value = useMemo(() => ({
    activities,
    allActivities,
    myActivities,
    teamMembers,
    members: teamMembers, // alias
    myProfile,
    weeklyPlans,
    plans: weeklyPlans, // alias
    loading,
    createActivity,
    deleteActivity,
    upsertProfile,
    addPlan,
    removePlan,
    refresh: () => {
      fetchMonthActivities(true);
      fetchAllActivities(true);
      fetchTeamMembers(true);
      fetchWeeklyPlans(true);
    },
  }), [activities, allActivities, myActivities, teamMembers, myProfile, weeklyPlans, loading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
