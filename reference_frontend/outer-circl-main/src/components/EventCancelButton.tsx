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
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface EventCancelButtonProps {
  eventId: string;
  eventTitle: string;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const EventCancelButton: React.FC<EventCancelButtonProps> = ({
  eventId,
  eventTitle,
  onCancel,
  variant = 'destructive',
  size = 'sm',
  className = ''
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleCancelEvent = async () => {
    setIsLoading(true);
    try {
      // Cancel the event by updating its status
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        console.error('Error cancelling event:', error);
        toast.error('Failed to cancel activity');
        return;
      }

      toast.success('Activity has been cancelled');
      onCancel?.();
      setIsOpen(false);
      
      // Redirect to dashboard after cancelling
      navigate('/dashboard');
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast.error('Failed to cancel activity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <X className="w-4 h-4 mr-2" />
          Cancel Activity
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Activity</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel "{eventTitle}"? This action cannot be undone and all participants will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Activity</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelEvent}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel Activity
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EventCancelButton;