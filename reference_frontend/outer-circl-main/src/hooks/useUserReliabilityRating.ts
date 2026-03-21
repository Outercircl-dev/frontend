import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserReliabilityData {
  averageRating: number | null;
  totalRatings: number;
  hasRatings: boolean;
}

export const useUserReliabilityRating = (userId: string | undefined) => {
  const [reliabilityData, setReliabilityData] = useState<UserReliabilityData>({
    averageRating: null,
    totalRatings: 0,
    hasRatings: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUserRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get reliability rating from profile and individual ratings for count
        const [profileResponse, ratingsResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('reliability_rating')
            .eq('id', userId)
            .single(),
          supabase
            .from('user_ratings')
            .select('rating')
            .eq('rated_user_id', userId)
        ]);

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        if (ratingsResponse.error) {
          throw ratingsResponse.error;
        }

        const reliabilityRating = profileResponse.data?.reliability_rating;
        const ratingsCount = ratingsResponse.data?.length || 0;

        if (!reliabilityRating || ratingsCount === 0) {
          setReliabilityData({
            averageRating: null,
            totalRatings: ratingsCount,
            hasRatings: false
          });
        } else {
          setReliabilityData({
            averageRating: Number(reliabilityRating),
            totalRatings: ratingsCount,
            hasRatings: true
          });
        }
      } catch (err) {
        console.error('Error fetching user ratings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch ratings');
        setReliabilityData({
          averageRating: null,
          totalRatings: 0,
          hasRatings: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRatings();
  }, [userId]);

  return { reliabilityData, loading, error };
};