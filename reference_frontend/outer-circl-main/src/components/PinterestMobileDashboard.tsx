import React from 'react';
import { useAppContext } from '@/components/OptimizedProviders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Heart, PlusCircle, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useDashboardData } from '@/hooks/useDashboardData';
import { EventData } from '@/components/ActivityCard';
import Navbar from '@/components/Navbar';

import MobileSearchModal from '@/components/mobile/MobileSearchModal';
import { useState, useMemo } from 'react';

// Pinterest-style masonry grid layout
const MasonryGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
};

const PinterestMobileDashboard: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Use the same data hook as desktop
  const {
    events,
    setEvents,
    isLoading,
    pinnedEventIds,
    setPinnedEventIds,
    refreshEvents
  } = useDashboardData(user?.id);

  // Get search query from URL params
  const searchQuery = searchParams.get('search') || '';

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    
    const searchLower = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(searchLower) ||
      event.description.toLowerCase().includes(searchLower) ||
      event.location.toLowerCase().includes(searchLower) ||
      event.categories.some(cat => cat.toLowerCase().includes(searchLower))
    );
  }, [events, searchQuery]);

  const handleSaveEvent = (eventId: string) => {
    const isAlreadySaved = pinnedEventIds.includes(eventId);
    
    if (isAlreadySaved) {
      const updatedSavedEvents = pinnedEventIds.filter(id => id !== eventId);
      localStorage.setItem('pinnedEvents', JSON.stringify(updatedSavedEvents));
      setPinnedEventIds(updatedSavedEvents);
      toast({
        title: "Removed from saved activities"
      });
    } else {
      const updatedSavedEvents = [...pinnedEventIds, eventId];
      localStorage.setItem('pinnedEvents', JSON.stringify(updatedSavedEvents));
      setPinnedEventIds(updatedSavedEvents);
      toast({
        title: "Saved to your activities"
      });
    }
  };
  
  const handleAttendClick = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Please log in to attend activities",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    try {
      // Check if already attending
      const { data: existingParticipation, error: checkError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingParticipation) {
        if (existingParticipation.status === 'attending') {
          // Leave the event
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', user.id);

          toast({
            title: "You've left this activity",
            variant: "default"
          });
        } else {
          // Update to attending
          await supabase
            .from('event_participants')
            .update({ status: 'attending', updated_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('user_id', user.id);

          toast({
            title: "You're now attending this activity!",
            description: "Check your messages for a welcome note from the host",
            variant: "default"
          });
        }
      } else {
        // Create new participation
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status: 'attending',
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        toast({
          title: "You're now attending this activity!",
          description: "Check your messages for a welcome note from the host",
          variant: "default"
        });
      }

      // Update local state
      setEvents(events.map(event => {
        if (event.id === eventId) {
          const wasAttending = event.isAttending;
          return {
            ...event,
            isAttending: !wasAttending,
            attendees: wasAttending ? event.attendees - 1 : event.attendees + 1
          };
        }
        return event;
      }));
    } catch (error) {
      console.error('Error attending event:', error);
      toast({
        title: "Couldn't update attendance",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleCreateEventClick = () => {
    if (!user) {
      toast({
        title: "Please log in to create activities",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    navigate('/create-event');
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50">
          <div className="bg-[#E60023] text-white text-center py-1 text-xs font-medium">
            🎉 Pinterest-style dashboard
          </div>
          
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
                <p className="text-gray-600">Discovering activities...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50">
        {/* Pinterest-style header */}
        <div className="bg-[#E60023] text-white text-center py-1 text-xs font-medium">
          🎉 Discover activities you'll love
        </div>
        
        <div className="sticky top-16 z-10 bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#E60023]">outercircl</h1>
            
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-5 h-5 text-gray-600" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full"
                onClick={handleCreateEventClick}
              >
                <PlusCircle className="w-5 h-5 text-[#E60023]" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full"
                onClick={() => navigate('/profile')}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </Button>
            </div>
          </div>
          
          {/* Search indicator */}
          {searchQuery && (
            <div className="container mx-auto px-4 py-2">
              <p className="text-sm text-gray-600">
                Showing results for "{searchQuery}" ({filteredEvents.length} found)
              </p>
            </div>
          )}
          
          {/* Simple filter pills */}
          <div className="container mx-auto px-4 py-2 overflow-x-auto flex space-x-2 pb-3">
            <Button size="sm" className="rounded-full bg-[#E60023] text-white whitespace-nowrap">
              All Activities
            </Button>
            <Button size="sm" variant="outline" className="rounded-full whitespace-nowrap">
              For You
            </Button>
            <Button size="sm" variant="outline" className="rounded-full whitespace-nowrap">
              Nearby
            </Button>
            <Button size="sm" variant="outline" className="rounded-full whitespace-nowrap">
              This Week
            </Button>
          </div>
        </div>
        
        <main className="container mx-auto px-4 py-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? `No activities found for "${searchQuery}"` : 'No activities found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search terms or create a new activity.' : 'Be the first to create an activity in your area!'}
              </p>
              <Button 
                onClick={handleCreateEventClick}
                className="bg-[#E60023] hover:bg-[#D50021] text-white"
              >
                Create Activity
              </Button>
            </div>
          ) : (
            <MasonryGrid>
              {filteredEvents.map((event) => (
                <div key={event.id} className="mb-4">
                  <Card className="overflow-hidden h-full flex flex-col">
                    {event.imageUrl && (
                      <div className="relative">
                        <img 
                          src={event.imageUrl} 
                          alt={event.title}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEvent(event.id);
                          }}
                        >
                          <Heart 
                            className={`w-5 h-5 ${event.isSaved ? 'fill-[#E60023] text-[#E60023]' : 'text-gray-700'}`} 
                          />
                        </Button>
                      </div>
                    )}
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg leading-tight line-clamp-2">
                        {event.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 pb-3">
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1.5" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1.5" />
                          <span>{event.attendees}/{event.maxAttendees} people</span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="px-6 pb-4">
                      <Button 
                        className={`w-full ${event.isAttending ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-[#E60023] text-white hover:bg-[#D50021]'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttendClick(event.id);
                        }}
                      >
                        {event.isAttending ? 'Leave' : 'Attend'}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </MasonryGrid>
          )}
        </main>
      </div>

      {/* Mobile Search Modal */}
      <MobileSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUserId={user?.id}
      />
    </>
  );
};

export default PinterestMobileDashboard;
