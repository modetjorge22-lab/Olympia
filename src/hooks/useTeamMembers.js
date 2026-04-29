import { useData } from '@/lib/DataContext';

export function useTeamMembers() {
  const { members, myProfile, loading, upsertProfile, refresh } = useData();
  return { members, myProfile, loading, upsertProfile, refresh };
}
