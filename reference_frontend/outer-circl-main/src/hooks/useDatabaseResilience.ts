import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

interface DatabaseOperation<T> {
  execute: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  retryConfig?: RetryConfig;
}

export const useDatabaseResilience = () => {
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);

  const executeWithRetry = useCallback(async <T>(
    operation: DatabaseOperation<T>
  ): Promise<T | null> => {
    const config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      ...operation.retryConfig
    };

    setIsOperationInProgress(true);

    let lastError: any;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`🔄 Database operation attempt ${attempt + 1}/${config.maxRetries + 1}`);
        
        const result = await operation.execute();
        
        console.log('✅ Database operation succeeded');
        operation.onSuccess?.(result);
        setIsOperationInProgress(false);
        return result;
        
      } catch (error: any) {
        lastError = error;
        console.log(`❌ Database operation failed (attempt ${attempt + 1}):`, error);
        
        // Don't retry on auth errors or client errors
        if (error?.status === 401 || error?.status === 403 || error?.status === 400) {
          console.log('💔 Non-retryable error, stopping attempts');
          break;
        }
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < config.maxRetries) {
          const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log('💔 All database operation attempts failed');
    operation.onError?.(lastError);
    setIsOperationInProgress(false);
    return null;
  }, []);

  const createActivity = useCallback(async (activityData: any) => {
    return executeWithRetry({
      execute: async () => {
        console.log('🎯 Creating activity with resilient database operation');
        
        // Pre-flight check - ensure user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Authentication required to create activity');
        }

        // Insert activity with explicit error handling
        const { data, error } = await supabase
          .from('events')
          .insert([{
            ...activityData,
            created_by: user.id,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('❌ Database insert error:', error);
          throw error;
        }

        return data;
      },
      onSuccess: (result: any) => {
        console.log('🎉 Activity created successfully:', result?.id);
      },
      onError: (error) => {
        console.error('💔 Failed to create activity after all retries:', error);
      },
      retryConfig: {
        maxRetries: 2, // Less retries for create operations
        baseDelay: 500
      }
    });
  }, [executeWithRetry]);

  const fetchActivities = useCallback(async (filters?: any) => {
    return executeWithRetry({
      execute: async () => {
        console.log('📊 Fetching activities with resilient database operation');
        
        let query = supabase
          .from('events')
          .select('*, profiles(display_name, avatar_url)')
          .order('created_at', { ascending: false });

        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        
        if (filters?.location) {
          query = query.ilike('location', `%${filters.location}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Database fetch error:', error);
          throw error;
        }

        return data || [];
      },
      onSuccess: (result: any) => {
        console.log(`📊 Fetched ${result?.length || 0} activities successfully`);
      },
      onError: (error) => {
        console.error('💔 Failed to fetch activities after all retries:', error);
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000
      }
    });
  }, [executeWithRetry]);

  return {
    createActivity,
    fetchActivities,
    executeWithRetry,
    isOperationInProgress
  };
};