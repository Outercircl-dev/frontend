import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivityStats {
  category: string;
  activity_count: number;
  last_activity_date: string;
  total_activities: number;
}

export interface UserActivitySummary {
  user_id: string;
  user_name: string;
  user_email: string;
  total_activities: number;
  categories_participated: number;
  last_activity_date: string;
  activities_by_category: any; // Using any since it comes from jsonb_object_agg
}

export const useUserActivityStats = (userId: string | null) => {
  const [activityStats, setActivityStats] = useState<UserActivityStats[]>([]);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityStats = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Get detailed activity stats by category
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_activity_stats', { p_user_id: userId });

      if (statsError) {
        console.error('Error fetching activity stats:', statsError);
        setError('Failed to load activity statistics');
        return;
      }

      setActivityStats(statsData || []);

      // Activity summary functionality temporarily disabled due to schema changes
      setActivitySummary(null);

    } catch (err) {
      console.error('Error in fetchActivityStats:', err);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityStats();
  }, [userId]);

  const getTotalActivities = () => {
    return activityStats.reduce((total, stat) => total + stat.activity_count, 0);
  };

  const getMostActiveCategory = () => {
    if (activityStats.length === 0) return null;
    return activityStats.reduce((max, current) => 
      current.activity_count > max.activity_count ? current : max
    );
  };

  const getCategoriesParticipated = () => {
    return activityStats.length;
  };

  return {
    activityStats,
    activitySummary,
    loading,
    error,
    refetch: fetchActivityStats,
    // Helper functions
    getTotalActivities,
    getMostActiveCategory,
    getCategoriesParticipated
  };
};