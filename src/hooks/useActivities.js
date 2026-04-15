import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Tipos de actividad con emoji y label
export const ACTIVITY_TYPES = {
  strength_training: { emoji: '💪', label: 'Fuerza' },
  running: { emoji: '🏃', label: 'Running' },
  swimming: { emoji: '🏊', label: 'Natación' },
  cycling: { emoji: '🚴', label: 'Ciclismo' },
  tennis: { emoji: '🎾', label: 'Tenis' },
  padel: { emoji: '🏸', label: 'Pádel' },
  football: { emoji: '⚽', label: 'Fútbol' },
  yoga: { emoji: '🧘', label: 'Yoga' },
  hiking: { emoji: '🥾', label: 'Senderismo' },
  martial_arts: { emoji: '🥊', label: 'Artes marciales' },
  other: { emoji: '🏅', label: 'Otro' },
};

export const TRAINING_TYPES = {
  progress: { label: 'Progreso', color: 'bg-violet-500' },
  consolidation: { label: 'Consolidación', color: 'bg-brand-500' },
};

export function useActivities(monthDate) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all activities (for team view)
  const fetchAllActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      setAllActivities(data);
    }
  }, []);

  // Fetch activities for a specific month
  const fetchActivities = useCallback(async () => {
    if (!monthDate) return;

    setLoading(true);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  }, [monthDate]);

  useEffect(() => {
    fetchActivities();
    fetchAllActivities();
  }, [fetchActivities, fetchAllActivities]);

  // Create a new activity
  const createActivity = async (activityData) => {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activityData,
        user_id: user.id,
        user_email: user.email,
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh
    await fetchActivities();
    await fetchAllActivities();
    return data;
  };

  // Delete an activity
  const deleteActivity = async (id) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchActivities();
    await fetchAllActivities();
  };

  // Get activities for a specific user and month
  const getUserMonthActivities = (email, monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    return allActivities.filter(a => {
      const d = new Date(a.date);
      return a.user_email === email && d.getFullYear() === year && d.getMonth() === month;
    });
  };

  // Get my activities
  const myActivities = activities.filter(a => a.user_email === user?.email);

  return {
    activities,
    allActivities,
    myActivities,
    loading,
    createActivity,
    deleteActivity,
    getUserMonthActivities,
    refresh: fetchActivities,
  };
}
