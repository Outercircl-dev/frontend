import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventLeaveButtonProps {
  eventId: string;
  eventTitle: string;
  isHost?: boolean;
  onLeave?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const EventLeaveButton: React.FC<EventLeaveButtonProps> = ({
  eventId,
  eventTitle,
  isHost = false,
  onLeave,
  variant = 'outline',
  size = 'sm',
  className = ''
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLeaveEvent = async () => {
    if (isHost) {
      toast.error('Hosts cannot leave their own activities');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('leave_event', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Error leaving event:', error);
        toast.error(`Failed to leave activity: ${error.message}`);
        return;
      }

      if (data) {
        toast.success('You have left the activity');
        setIsOpen(false);
        // Call onLeave callback to refresh the event data
        onLeave?.();
      } else {
        toast.error('Unable to leave this activity. You may not be a participant.');
      }
    } catch (error: any) {
      console.error('Error leaving event:', error);
      toast.error(`Failed to leave activity: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show leave button for hosts
  if (isHost) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <LogOut className="w-4 h-4 mr-2" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Activity</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave "{eventTitle}"? You can rejoin later if there's space available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeaveEvent}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Leave Activity
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EventLeaveButton;