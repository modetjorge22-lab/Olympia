import { useData } from '@/lib/DataContext';

export function useWeeklyPlans() {
  const { plans, loading, addPlan, removePlan, refresh } = useData();
  return { plans, loading, addPlan, removePlan, refresh };
}
