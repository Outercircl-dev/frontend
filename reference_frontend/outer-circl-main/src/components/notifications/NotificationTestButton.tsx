import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, TestTube, Send } from 'lucide-react';
import { toast } from 'sonner';
import { isDeveloperMode } from '@/utils/developerMode';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

/**
 * Test button for developers to test the enhanced notification system
 * This helps ensure notifications appear properly in navbar and group chats
 */
const NotificationTestButton: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const { isAdmin } = useUserRole();

  const testNotificationSystem = async () => {
    setIsTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Create a simple test notification directly in the database
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Test Notification System',
          content: 'This is a test notification created directly in the database. You should see this notification with a red indicator!',
          notification_type: 'system',
          metadata: { test: true }
        });

      if (error) {
        console.error('Failed to create test notification:', error);
        toast.error('Failed to create test notification. Check console for details.');
      } else {
        toast.success('Test notification created! Check your navbar for the notification indicator.');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification. Check console for details.');
    } finally {
      setIsTesting(false);
    }
  };

  // Only show in developer mode for admins
  if (!isDeveloperMode(isAdmin)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={testNotificationSystem}
        disabled={isTesting}
        variant="outline"
        size="sm"
        className="bg-white shadow-lg border-2 border-primary/20 hover:border-primary/40"
      >
        {isTesting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
        ) : (
          <TestTube className="h-4 w-4 mr-2" />
        )}
        Test Notifications
      </Button>
    </div>
  );
};

export default NotificationTestButton;