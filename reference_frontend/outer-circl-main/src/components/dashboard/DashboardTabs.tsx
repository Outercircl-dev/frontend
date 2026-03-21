
import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import ActivityCard, { EventData } from '@/components/ActivityCard';


interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredEvents: EventData[];
  showSuggestedEvents: boolean;
  suggestedEvents: EventData[];
  categoryFilters: string[];
  searchQuery: string;
  showAds: boolean;
  isLoggedIn: boolean;
  onAttendClick: (eventId: string) => Promise<void>;
  onSaveClick: (eventId: string, isSaved: boolean) => Promise<void>;
  onCreateEventClick: () => void;
  onCreateFromSuggestion: (event: EventData) => void;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  setActiveTab,
  filteredEvents,
  showSuggestedEvents,
  suggestedEvents,
  categoryFilters,
  searchQuery,
  showAds,
  isLoggedIn,
  onAttendClick,
  onSaveClick,
  onCreateEventClick,
  onCreateFromSuggestion
}) => {
  // Memoize filtered events for each tab to avoid recalculation
  const attendingEvents = useMemo(() => 
    filteredEvents.filter(event => event.isAttending), 
    [filteredEvents]
  );

  // Optimized grid rendering with virtualization for better performance
  const renderEventGrid = useMemo(() => (events: EventData[]) => (
    <div className="columns-1 sm:columns-2 gap-4 space-y-4">
      {events.map((event) => (
        <div key={event.id} className="break-inside-avoid mb-4">
          <ActivityCard 
            event={event} 
            onAttendClick={onAttendClick}
            onSaveClick={onSaveClick}
            isLoggedIn={isLoggedIn}
          />
        </div>
      ))}
    </div>
  ), [onAttendClick, onSaveClick, isLoggedIn]);

  const renderSuggestedEvents = useMemo(() => {
    if (!showSuggestedEvents) return null;
    
    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Suggested Activities</h3>
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {suggestedEvents.map((event) => (
            <div key={event.id} className="break-inside-avoid mb-4">
              <ActivityCard 
                event={event} 
                onAttendClick={() => onCreateFromSuggestion(event)}
                onSaveClick={onSaveClick}
                isLoggedIn={isLoggedIn}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }, [showSuggestedEvents, suggestedEvents, onCreateFromSuggestion, onSaveClick, isLoggedIn]);

  const renderEmptyState = (
    icon: React.ReactNode,
    title: string,
    description: string,
    buttonText?: string,
    buttonAction?: () => void
  ) => (
    <div className="text-center py-12">
      {icon}
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {buttonText && buttonAction && (
        <Button onClick={buttonAction} className="bg-[#E60023] hover:bg-[#D50C22] text-white">
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      )}
    </div>
  );

  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
      <TabsList>
        <TabsTrigger value="all">All Activities</TabsTrigger>
        <TabsTrigger value="attending">Attending</TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="mt-6">
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="w-full">
            {filteredEvents.length > 0 ? (
              renderEventGrid(filteredEvents)
            ) : (
              renderEmptyState(
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />,
                searchQuery.trim() ? `No activities found for "${searchQuery}"` : 'No activities found',
                searchQuery.trim() 
                  ? 'Try adjusting your search terms or filters, or create a new activity.'
                  : 'Try adjusting your filters or create a new activity.',
                'Create Activity',
                onCreateEventClick
              )
            )}
            
            {renderSuggestedEvents}
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="attending" className="mt-6">
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="w-full">
            {attendingEvents.length > 0 ? (
              renderEventGrid(attendingEvents)
            ) : (
              renderEmptyState(
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />,
                'Not attending any activities yet',
                'Browse activities and RSVP to see them here.'
              )
            )}
          </div>
        </div>
      </TabsContent>

    </Tabs>
  );
};

export default React.memo(DashboardTabs);
