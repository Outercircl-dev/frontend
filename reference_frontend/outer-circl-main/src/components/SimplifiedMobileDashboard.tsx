import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import Navbar from '@/components/Navbar';

const SimplifiedMobileDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  
  console.log('📱 SimplifiedMobileDashboard: Starting render', {
    hasUser: !!user,
    userId: user?.id
  });

  // Handle data fetching with proper error handling
  const {
    events,
    isLoading,
    refreshEvents
  } = useDashboardData(user?.id);

  // Redirect to auth if no user
  useEffect(() => {
    if (!user) {
      console.log('📱 SimplifiedMobileDashboard: No user, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  // If no user and we're initialized, let auth redirect handle it
  if (!user) {
    return null;
  }

  // Show loading state while fetching events
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <Navbar isLoggedIn={true} username={user?.email?.split('@')[0] || "User"} />
          <main className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading activities...</p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Beta Banner */}
        <div className="bg-[#E60023] text-white text-center py-1 text-xs font-medium">
          Beta Version - Join us for early access!
        </div>
        
        <Navbar isLoggedIn={true} username={user?.email?.split('@')[0] || "User"} />
        
        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Discover Activities</h1>
            <p className="text-gray-600">Find activities near you and meet new people!</p>
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
              <p className="text-gray-600 mb-4">Be the first to create an activity in your area!</p>
              <Button onClick={() => navigate('/create-event')}>
                Create Activity
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/event/${event.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{event.title}</CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          {event.date} at {event.time}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {event.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-1" />
                          {event.attendees}/{event.maxAttendees} people
                        </div>
                      </div>
                      {event.imageUrl && (
                        <img 
                          src={event.imageUrl} 
                          alt={event.title}
                          className="w-20 h-20 rounded-lg object-cover ml-4"
                        />
                      )}
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default SimplifiedMobileDashboard;
