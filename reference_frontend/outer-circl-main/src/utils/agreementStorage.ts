import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgreementData {
  userId: string;
  agreements: {
    type: string;
    version?: string;
  }[];
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records user agreements in the database
 * This function stores legal consent records for compliance purposes
 */
export const recordUserAgreements = async ({
  userId,
  agreements,
  ipAddress,
  userAgent
}: AgreementData): Promise<boolean> => {
  try {
    console.log('Recording user agreements:', { userId, agreements: agreements.length });

    // Get user's IP address if not provided
    let userIpAddress = ipAddress;
    if (!userIpAddress) {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIpAddress = ipData.ip;
      } catch (error) {
        console.warn('Could not fetch IP address for agreement recording:', error);
      }
    }

    // Get user agent if not provided
    const userAgentString = userAgent || navigator.userAgent;

    // Record each agreement
    const agreementPromises = agreements.map(agreement => 
      supabase.from('user_agreements').insert({
        user_id: userId,
        agreement_type: agreement.type,
        agreement_version: agreement.version || '1.0',
        ip_address: userIpAddress,
        user_agent: userAgentString,
        agreed_at: new Date().toISOString()
      })
    );

    const results = await Promise.all(agreementPromises);

    // Check if any insertions failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Some agreement recordings failed:', errors);
      toast.error('Failed to record some user agreements');
      return false;
    }

    console.log('All user agreements recorded successfully');
    return true;

  } catch (error) {
    console.error('Error recording user agreements:', error);
    toast.error('Failed to record user agreements');
    return false;
  }
};

/**
 * Gets user agreements from the database
 */
export const getUserAgreements = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_agreements')
      .select('*')
      .eq('user_id', userId)
      .order('agreed_at', { ascending: false });

    if (error) {
      console.error('Error fetching user agreements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user agreements:', error);
    return [];
  }
};

/**
 * Checks if user has agreed to specific agreement types
 */
export const hasUserAgreedTo = async (userId: string, agreementTypes: string[]): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_agreements')
      .select('agreement_type')
      .eq('user_id', userId)
      .in('agreement_type', agreementTypes);

    if (error) {
      console.error('Error checking user agreements:', error);
      return false;
    }

    const agreedTypes = data?.map(item => item.agreement_type) || [];
    return agreementTypes.every(type => agreedTypes.includes(type));
  } catch (error) {
    console.error('Error checking user agreements:', error);
    return false;
  }
};