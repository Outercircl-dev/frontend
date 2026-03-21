import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, Users, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventInvitationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: {
    id: string;
    event_id: string;
    inviter_id: string;
    status: string;
    event?: {
      title: string;
      description?: string;
      date?: string;
      time?: string;
      location?: string;
      category?: string;
      max_attendees?: number;
      image_url?: string;
    };
    inviter?: {
      name?: string;
      username?: string;
      avatar_url?: string;
    };
  };
  onResponse?: (accepted: boolean) => void;
}

const EventInvitationModal: React.FC<EventInvitationModalProps> = ({
  isOpen,
  onOpenChange,
  invitation,
  onResponse
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleResponse = async (accept: boolean) => {
    setIsLoading(true);
    try {
      if (accept) {
        const { data, error } = await supabase.rpc('accept_event_invitation', {
          p_invitation_id: invitation.id
        });

        if (error) {
          console.error('Error accepting invitation:', error);
          toast.error('Failed to accept invitation');
          return;
        }

        if (data) {
          toast.success('Invitation accepted! You\'re now attending this activity.');
        } else {
          toast.error('Unable to accept invitation');
          return;
        }
      } else {
        // Decline invitation
        const { error } = await supabase
          .from('event_invitations')
          .update({ 
            status: 'declined', 
            responded_at: new Date().toISOString() 
          })
          .eq('id', invitation.id);

        if (error) {
          console.error('Error declining invitation:', error);
          toast.error('Failed to decline invitation');
          return;
        }

        toast.success('Invitation declined');
      }

      onResponse?.(accept);
      onOpenChange(false);
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Date TBD';
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return 'Time TBD';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const { event, inviter } = invitation;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Activity Invitation
            <Badge variant="secondary" className="text-xs">Pending</Badge>
          </DialogTitle>
          <DialogDescription>
            {inviter?.name || inviter?.username || 'Someone'} invited you to join this activity
          </DialogDescription>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            {/* Event Image */}
            {event.image_url && (
              <div className="w-full h-32 rounded-lg overflow-hidden">
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
              
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {event.description}
                </p>
              )}

              <div className="space-y-2">
                {event.date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                )}

                {event.time && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(event.time)}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.max_attendees && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Max {event.max_attendees} participants</span>
                  </div>
                )}
              </div>

              {event.category && (
                <Badge variant="outline" className="w-fit">
                  {event.category}
                </Badge>
              )}
            </div>

            {/* Inviter */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="w-8 h-8">
                <AvatarImage src={inviter?.avatar_url || ''} />
                <AvatarFallback>
                  {inviter?.name?.[0] || inviter?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Invited by {inviter?.name || inviter?.username || 'Unknown'}
                </p>
                {inviter?.name && inviter?.username && (
                  <p className="text-xs text-muted-foreground">@{inviter.username}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleResponse(false)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Decline
          </Button>
          <Button
            onClick={() => handleResponse(true)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventInvitationModal;