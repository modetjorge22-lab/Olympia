import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Objetivos de volumen (horas / sesiones por semana o mes).
// Carga los de todo el equipo; si la tabla aún no existe (migración pendiente)
// devuelve listas vacías sin romper nada.
export function useObjectives() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [available, setAvailable] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[Olympia] objectives no disponible — ejecuta db/2026-10-objetivos-y-marcas.sql');
      setAvailable(false);
      return;
    }
    setAvailable(true);
    setObjectives(data || []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createObjective = useCallback(async ({ activity_type, metric, period, target }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('objectives')
      .insert({
        user_id: user.id,
        user_email: user.email,
        activity_type: activity_type || null,
        metric, period,
        target: Number(target),
      })
      .select()
      .single();
    if (error) { console.error('createObjective error:', error); return null; }
    setObjectives(prev => [...prev, data]);
    return data;
  }, [user]);

  const deleteObjective = useCallback(async (id) => {
    const { error } = await supabase.from('objectives').delete().eq('id', id);
    if (!error) setObjectives(prev => prev.filter(o => o.id !== id));
  }, []);

  const myObjectives = objectives.filter(o => o.user_email === user?.email);

  return { objectives, myObjectives, available, createObjective, deleteObjective, refresh: fetchAll };
}
