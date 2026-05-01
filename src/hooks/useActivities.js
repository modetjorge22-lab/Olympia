import { useData } from '@/lib/DataContext';

export const ACTIVITY_TYPES = {
  strength_training: { emoji: '💪', label: 'Fuerza' },
  running:           { emoji: '🏃', label: 'Running' },
  swimming:          { emoji: '🏊', label: 'Natación' },
  cycling:           { emoji: '🚴', label: 'Ciclismo' },
  tennis:            { emoji: '🎾', label: 'Tenis' },
  padel:             { emoji: '🏸', label: 'Pádel' },
  football:          { emoji: '⚽', label: 'Fútbol' },
  yoga:              { emoji: '🧘', label: 'Yoga' },
  hiking:            { emoji: '🥾', label: 'Senderismo' },
  martial_arts:      { emoji: '🥊', label: 'Artes marciales' },
  other:             { emoji: '🏅', label: 'Otro' },
};

export const TRAINING_TYPES = {
  progress:      { label: 'Progreso',      color: 'bg-violet-500' },
  consolidation: { label: 'Consolidación', color: 'bg-brand-500' },
};

// Wrapper de retrocompatibilidad — todo viene del DataContext compartido
// Los componentes existentes pueden seguir llamando useActivities(currentMonth)
// pero ya no provoca refetch. El monthDate se ignora porque DataContext ya
// observa el currentMonth global.
export function useActivities() {
  const { activities, allActivities, myActivities, loading, createActivity, deleteActivity, updateActivity, refresh } = useData();
  return {
    activities,
    allActivities,
    myActivities,
    loading,
    createActivity,
    deleteActivity,
    updateActivity,
    getUserMonthActivities: (email, monthDate) => {
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      return allActivities.filter(a => {
        const d = new Date(a.date);
        return a.user_email === email && d.getFullYear() === y && d.getMonth() === m;
      });
    },
    refresh,
  };
}
