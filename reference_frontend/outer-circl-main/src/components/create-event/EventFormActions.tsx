
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEventHostingLimits } from '@/hooks/useEventHostingLimits';
import { useRecurringActivityLimits, recordNewRecurringEvent } from '@/hooks/useRecurringActivityLimits';
import { useEventForm } from './EventFormProvider';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultImageByCategory } from '@/utils/defaultImages';

interface EventFormActionsProps {
  selectedFriends?: any[];
  onEventCreated?: (eventId: string) => void;
}

const EventFormActions: React.FC<EventFormActionsProps> = ({ 
  selectedFriends = [], 
  onEventCreated 
}) => {
  const navigate = useNavigate();
  const { canHostMore, monthlyLimit, isLoading: hostingLoading } = useEventHostingLimits();
  const { 
    canCreateRecurring, 
    monthlyRecurringLimit, 
    isLoading: recurringLoading,
    error: recurringError 
  } = useRecurringActivityLimits();
  const { formData, date, categories, coordinates } = useEventForm();

  // Handle loading states and errors gracefully
  const isLoadingLimits = hostingLoading || recurringLoading;
  
  if (recurringError) {
    console.warn('Recurring limits error:', recurringError);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
        // Check hosting limits before creating event
        if (!canHostMore) {
          toast.error(`You've reached your monthly limit of ${monthlyLimit} activities. Upgrade to Premium for unlimited hosting!`);
          return null;
        }

    // Check recurring activity limits if creating a recurring event
    if (formData.isRecurring && !canCreateRecurring) {
      const limitMessage = recurringError 
        ? 'Unable to verify recurring activity limits. Please try again.'
        : `You've reached your monthly limit of ${monthlyRecurringLimit} recurring activities. The limit resets next month.`;
      toast.error(limitMessage);
      return null;
    }
    
    if (!formData.title || !formData.description || !date || !formData.time || !formData.location || categories.length === 0) {
      toast.error('Please fill in all required fields: title, description, date, time, location, and at least one category');
      return null;
    }

    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('You must be logged in to create an activity');
        navigate('/auth?tab=login&redirect=/create-event');
        return;
      }

      console.log('Creating event with user:', user.id);
      console.log('Selected categories:', categories);
      
      // Use the first category - these now match the database validation exactly
      const primaryCategory = categories[0] || 'social';
      console.log('Primary category being sent:', primaryCategory);
      
      // Auto-select a default image if none is provided
      let imageUrl = formData.eventImage;
      if (!imageUrl) {
        try {
          imageUrl = await getDefaultImageByCategory(primaryCategory);
          console.log('Auto-selected default image:', imageUrl);
        } catch (error) {
          console.warn('Failed to get default image:', error);
        }
      }
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        meetup_spot: formData.meetupSpot || null,
        date: date.toISOString().split('T')[0],
        time: formData.time,
        duration: formData.duration,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        category: primaryCategory, // This now matches the database validation
        host_id: user.id,
        status: formData.autoConfirm ? 'active' : 'draft',
        image_url: imageUrl || null,
        coordinates: coordinates || null,
        gender_preference: formData.genderPreference || 'no_preference',
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : null,
        recurrence_interval: formData.isRecurring && formData.recurrencePattern === 'custom' ? formData.recurrenceInterval : null,
        recurrence_end_date: formData.isRecurring && formData.recurrenceEndDate ? formData.recurrenceEndDate.toISOString().split('T')[0] : null,
        recurrence_end_count: formData.isRecurring && formData.recurrenceEndCount ? formData.recurrenceEndCount : null,
      };
      
      console.log('Inserting event data:', eventData);
      
      // Insert the event into the database
      const { data: insertedEvent, error: insertError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating event:', insertError);
        console.error('Full error details:', JSON.stringify(insertError, null, 2));
        
        // More specific error handling
        if (insertError.message?.includes('Invalid event category')) {
          toast.error(`Invalid category "${primaryCategory}". Please try selecting a different category.`);
        } else if (insertError.message?.includes('Event date cannot be in the past')) {
          toast.error('Please select a future date for your activity.');
        } else if (insertError.message?.includes('Invalid time format')) {
          toast.error('Please enter a valid time format.');
         } else {
          toast.error(`Failed to create activity: ${insertError.message}`);
        }
        return null;
      }
      
      console.log('Event created successfully:', insertedEvent);
      
      // Record the recurring event if applicable
      if (formData.isRecurring) {
        recordNewRecurringEvent();
      }
      
      // Send invitations to selected friends if any
      if (selectedFriends && selectedFriends.length > 0) {
        try {
          console.log('Sending invitations to friends:', selectedFriends.map(f => f.id));
          const friendIds = selectedFriends.map(friend => friend.id);
          
          // Send invitations via Supabase
          const invitationPromises = friendIds.map(async (friendId) => {
            const { error } = await supabase
              .from('event_invitations')
              .insert({
                event_id: insertedEvent.id,
                inviter_id: user.id,
                invited_user_id: friendId,
                status: 'pending'
              });
              
            if (error) {
              console.error('Error sending invitation to friend:', friendId, error);
              return false;
            }
            return true;
          });
          
          const results = await Promise.all(invitationPromises);
          const successCount = results.filter(Boolean).length;
          
          if (successCount > 0) {
            toast.success(`Invitations sent to ${successCount} friend${successCount > 1 ? 's' : ''}!`);
          }
        } catch (error) {
          console.error('Error sending friend invitations:', error);
          toast.error('Activity created but failed to send some invitations');
        }
      }
      
      const successMessage = formData.isRecurring 
        ? `Recurring activity "${formData.title}" created successfully! Future instances will be generated automatically.`
        : `Activity "${formData.title}" created successfully!`;
      
      toast.success(successMessage);
      
      // Return the event ID and notify parent
      const eventId = insertedEvent.id;
      onEventCreated?.(eventId);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
      return eventId;
      
    } catch (error) {
      console.error('Unexpected error creating event:', error);
      toast.error('An unexpected error occurred. Please try again.');
      return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 bg-white border-t shadow-lg p-4 mt-6 mb-safe">
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => navigate('/dashboard')}
        className="h-12 text-sm w-full"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isLoadingLimits}
        onClick={handleSubmit}
        className="bg-[#E60023] hover:bg-[#D50C22] text-white h-12 text-sm disabled:opacity-50 disabled:cursor-not-allowed w-full font-medium"
      >
        {isLoadingLimits ? 'Loading...' : 'Create Activity'}
      </Button>
    </div>
  );
};

export default EventFormActions;
