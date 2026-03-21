import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';

const MobileAuthDebugger: React.FC = () => {
  const { user } = useAppContext();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = async () => {
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
      );

      const sessionCheck = await supabase.auth.getSession();
      
      setDebugInfo({
        timestamp: new Date().toISOString(),
        isMobile,
        windowWidth: window.innerWidth,
        userAgent: navigator.userAgent.substring(0, 100),
        contextUser: !!user,
        contextLoading: false,
        contextInitialized: true,
        sessionExists: !!sessionCheck.data.session,
        sessionError: sessionCheck.error?.message,
        currentPath: typeof window !== 'undefined' ? window.location.pathname : '',
        currentHash: typeof window !== 'undefined' ? window.location.hash : '',
        localStorage: (() => {
          try {
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') return { error: 'not available' };
            return {
              hasSupabaseAuth: !!localStorage.getItem('sb-bommnpdpzmvqufurwwik-auth-token'),
              authKeys: Object.keys(localStorage).filter(k => k.includes('auth')),
            };
          } catch (e) {
            return { error: 'access denied' };
          }
        })()
      });
    };

    updateDebugInfo();
    
    // Update every 2 seconds
    const interval = setInterval(updateDebugInfo, 2000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Only show on mobile AND in development mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname.includes('lovable.app'));
  
  if (!isMobile || !isDevelopment) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '10px',
        fontSize: '10px',
        zIndex: 9999,
        maxHeight: '40vh',
        overflow: 'auto'
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>🔍 Mobile Auth Debug</div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default MobileAuthDebugger;