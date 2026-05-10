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

  // Crear una nueva meta — inserta primero las columnas base,
  // luego intenta actualizar con las nuevas columnas (activity_type, pb_date)
  // para que funcione aunque la migración SQL aún no se haya ejecutado.
  const createGoal = useCallback(async ({ title, unit, current_value, activity_type }) => {
    if (!user) return null;
    const today = new Date().toISOString().slice(0, 10);
    const hasValue = current_value != null && current_value !== '';

    // Payload base (siempre existe en el schema original)
    const basePayload = {
      user_id: user.id,
      user_email: user.email,
      title: title.trim(),
      unit: unit?.trim() || '',
      current_value: hasValue ? Number(current_value) : null,
    };

    // Intentar con las columnas nuevas primero
    const fullPayload = {
      ...basePayload,
      activity_type: activity_type || null,
      pb_date: hasValue ? today : null,
    };

    let { data, error } = await supabase
      .from('goals')
      .insert(fullPayload)
      .select()
      .single();

    // Fallback: las columnas nuevas aún no existen → reintentar sin ellas
    if (error) {
      const fallback = await supabase
        .from('goals')
        .insert(basePayload)
        .select()
        .single();
      if (fallback.error) {
        console.error('createGoal error:', fallback.error);
        return null;
      }
      data = fallback.data;
    }

    if (data) setGoals(prev => [data, ...prev]);
    return data;
  }, [user]);

  // Actualizar la marca personal + registrar el logro
  const updateMark = useCallback(async (goalId, newValue, date) => {
    if (!user) return null;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;

    const pbDate = date || new Date().toISOString().slice(0, 10);
    const oldValue = goal.current_value;

    // Intentar actualizar con las columnas nuevas
    let updatedGoal = null;
    const { data: d1, error: e1 } = await supabase
      .from('goals')
      .update({ current_value: Number(newValue), pb_date: pbDate })
      .eq('id', goalId)
      .select()
      .single();

    if (e1) {
      // Fallback sin pb_date
      const { data: d2, error: e2 } = await supabase
        .from('goals')
        .update({ current_value: Number(newValue) })
        .eq('id', goalId)
        .select()
        .single();
      if (e2) { console.error('updateMark error:', e2); return null; }
      updatedGoal = d2;
    } else {
      updatedGoal = d1;
    }

    // Intentar registrar en pr_achievements (puede no existir aún)
    try {
      await supabase.from('pr_achievements').insert({
        user_id: user.id,
        user_email: user.email,
        goal_id: goalId,
        goal_title: goal.title,
        new_value: Number(newValue),
        old_value: oldValue,
        unit: goal.unit || '',
        activity_type: goal.activity_type || null,
        date: pbDate,
      });
    } catch (_) {
      // Silencioso si la tabla aún no existe
    }

    if (updatedGoal) setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
    return updatedGoal;
  }, [user, goals]);

  const deleteGoal = useCallback(async (goalId) => {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (!error) setGoals(prev => prev.filter(g => g.id !== goalId));
  }, []);

  return { goals, loading, createGoal, updateMark, deleteGoal, refresh: fetchGoals };
}

// Hook para leer las metas de todo el equipo (Grupos)
export function useTeamGoals() {
  const [teamGoals, setTeamGoals] = useState([]);

  useEffect(() => {
    supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTeamGoals(data); });
  }, []);

  return teamGoals;
}
