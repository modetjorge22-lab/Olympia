import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false });
    if (!error && data) setGoals(data);
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Crear una nueva meta
  const createGoal = useCallback(async ({ title, unit, current_value, activity_type }) => {
    if (!user) return null;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        user_email: user.email,
        title: title.trim(),
        unit: unit?.trim() || '',
        current_value: current_value != null && current_value !== '' ? Number(current_value) : null,
        activity_type: activity_type || null,
        pb_date: current_value != null && current_value !== '' ? today : null,
      })
      .select()
      .single();
    if (error) { console.error('createGoal error:', error); return null; }
    if (data) setGoals(prev => [data, ...prev]);
    return data;
  }, [user]);

  // Actualizar la marca personal de una meta + registrar el logro
  const updateMark = useCallback(async (goalId, newValue, date) => {
    if (!user) return null;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;

    const pbDate = date || new Date().toISOString().slice(0, 10);
    const oldValue = goal.current_value;

    // 1. Actualizar la meta
    const { data: updatedGoal, error: goalError } = await supabase
      .from('goals')
      .update({ current_value: Number(newValue), pb_date: pbDate, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .single();
    if (goalError) { console.error('updateMark goal error:', goalError); return null; }

    // 2. Registrar el logro en pr_achievements
    const { error: prError } = await supabase
      .from('pr_achievements')
      .insert({
        user_id: user.id,
        user_email: user.email,
        goal_id: goalId,
        goal_title: goal.title,
        new_value: Number(newValue),
        old_value: oldValue,
        unit: goal.unit || '',
        activity_type: goal.activity_type,
        date: pbDate,
      });
    if (prError) console.error('updateMark pr_achievements error:', prError);

    // 3. Actualizar estado local
    if (updatedGoal) setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
    return updatedGoal;
  }, [user, goals]);

  const deleteGoal = useCallback(async (goalId) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (!error) setGoals(prev => prev.filter(g => g.id !== goalId));
  }, []);

  return { goals, loading, createGoal, updateMark, deleteGoal, refresh: fetchGoals };
}
