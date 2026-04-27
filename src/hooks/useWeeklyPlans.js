import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useWeeklyPlans(referenceDate) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);

    // Cargamos planes del mes mostrado +/- 1 mes para tenerlos disponibles
    const ref = referenceDate || new Date();
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 2, 0);
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;

    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_email', user.email)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date');

    if (error) {
      console.error('Error loading plans:', error);
      setPlans([]);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }, [user?.email, referenceDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const addPlan = async ({ date, activity_type, notes }) => {
    if (!user?.email) return null;
    const { data, error } = await supabase
      .from('weekly_plans')
      .insert([{ user_email: user.email, date, activity_type, notes: notes || null }])
      .select()
      .single();
    if (!error && data) {
      setPlans(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
    }
    return error ? null : data;
  };

  const removePlan = async (id) => {
    const { error } = await supabase.from('weekly_plans').delete().eq('id', id);
    if (!error) setPlans(prev => prev.filter(p => p.id !== id));
    return !error;
  };

  return { plans, loading, addPlan, removePlan, refresh };
}
