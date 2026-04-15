import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useTeamMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMembers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Check if current user has a team member profile
  const myProfile = members.find(m => m.email === user?.email);

  // Create or update profile
  const upsertProfile = async (profileData) => {
    if (myProfile) {
      const { error } = await supabase
        .from('team_members')
        .update(profileData)
        .eq('id', myProfile.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('team_members')
        .insert({
          ...profileData,
          user_id: user.id,
          email: user.email,
        });
      if (error) throw error;
    }
    await fetchMembers();
  };

  return {
    members,
    myProfile,
    loading,
    upsertProfile,
    refresh: fetchMembers,
  };
}
