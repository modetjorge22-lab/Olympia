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

  // ─── MUTATIONS ───
  const createActivity = useCallback(async (activityData) => {
    const { data, error } = await supabase
      .from('activities')
      .insert({ ...activityData, user_id: user.id, user_email: user.email })
      .select()
      .single();
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

  const deleteActivity = useCallback(async (id) => {
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
  }, [mKey]);

  const upsertProfile = useCallback(async (profileData) => {
    const { data, error } = await supabase
      .from('team_members')
      .upsert({ email: user.email, ...profileData }, { onConflict: 'email' })
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

  const addPlan = useCallback(async ({ date, activity_type, notes }) => {
    if (!user?.email) return null;
    const { data, error } = await supabase
      .from('weekly_plans')
      .insert([{ user_email: user.email, date, activity_type, notes: notes || null }])
      .select()
      .single();
    if (error) {
      console.error('addPlan error:', error);
      return null;
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
    upsertProfile,
    addPlan,
    removePlan,
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
