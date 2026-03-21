import EventCancelButton from '@/components/EventCancelButton';
import EventLeaveButton from '@/components/EventLeaveButton';
import ShareableEventLink from '@/components/ShareableEventLink';
import ShareEventModal from '@/components/ShareEventModal';
import MessageItem from '@/components/messages/MessageItem';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { useOptimizedEventDetails } from '@/hooks/useOptimizedEventDetails';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UnifiedSEO from '@/components/UnifiedSEO';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Navigation,
  Users, 
  Heart, 
  UserPlus, 
  UserMinus,
  Send,
  Share2
} from 'lucide-react';

const OptimizedEventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get current user from context
  const { user: currentUser } = useAppContext();
  const isLoggedIn = !!currentUser;
  
  // Check if this is a rating action from email
  const isRatingAction = searchParams.get('action') === 'rate';
  
  // Use optimized hook for all event data
  const {
    event,
    participants,
    messages,
    userStatus,
    isLoading,
    error,
    isCached,
    cacheAge,
    updateAttendance,
    updateSavedStatus,
    addMessage,
    refetch
  } = useOptimizedEventDetails(id, currentUser?.id);
  
  // Extract user-specific flags from userStatus
  const isAttending = userStatus?.isAttending || false;
  const isSaved = userStatus?.isSaved || false;
  const isHost = currentUser?.id === event?.host_id;

  const [comment, setComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // Auto-open rating modal when action=rate is present
  useEffect(() => {
    if (isRatingAction && event && currentUser && !showRatingModal) {
      setShowRatingModal(true);
    }
  }, [isRatingAction, event, currentUser, showRatingModal]);

  // Generate SEO data
  const seoTitle = event ? `${event.title} | outercircl` : 'Event Details';
  const seoDescription = event ? event.description || `Join this activity in ${event.location}` : 'Event details';

  const handleAttendance = async () => {
      if (!currentUser) {
      toast.error("Please log in to join activities");
      return;
    }
    await updateAttendance(id!, !isAttending);
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      toast.error("Please log in to save activities");
      return;
    }
    await updateSavedStatus(id!, !isSaved);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !currentUser) {
      toast.error("Please log in to comment on activities");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await addMessage(id!, comment.trim());
      setComment('');
      toast.success("Message sent!");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  // Show loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn={isLoggedIn} username="" />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Event</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn={isLoggedIn} username={currentUser?.email?.split('@')[0] || ""} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <UnifiedSEO 
        title={seoTitle}
        description={seoDescription}
        keywords="activity, event, social"
        canonicalUrl={`/event/${id}`}
      />
      
      {/* Shareable link optimization component */}
      <ShareableEventLink />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn={isLoggedIn} username={currentUser?.email?.split('@')[0] || ""} />
        
        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Activities
          </Button>

          {/* Cache Status Indicator */}
          {isCached && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    Viewing cached data {cacheAge && `(${Math.round(cacheAge / 1000)}s old)`}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refetch}
                  className="text-orange-700 dark:text-orange-300 border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Event Header */}
          <div className="mb-8">
            <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden mb-6">
              <img
                src={event.image_url || '/placeholder.svg'}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{event.title}</h1>
                <div className="flex items-center gap-4 text-white/90 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Info and Actions */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  {(event.categories || []).map((category, index) => (
                    <Badge key={index} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {category}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {participants?.length || 0} / {event.max_attendees || 'unlimited'} attendees
                  </div>
                  {event.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.duration}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <Avatar>
                    <AvatarImage src={event.host?.avatar_url} />
                    <AvatarFallback>{event.host?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{event.host?.name}</p>
                    <p className="text-sm text-muted-foreground">Event Host</p>
                  </div>
                </div>
                
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                
                {/* Meeting Point - Only visible to attending participants and hosts */}
                {event.meetup_spot && (isAttending || isHost) && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation className="w-4 h-4 text-primary" />
                      <span className="font-medium">Meeting Point:</span>
                      <span className="text-muted-foreground">{event.meetup_spot}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 md:min-w-[200px]">
                <div className="flex gap-2">
                  {isHost ? (
                    /* Host can only cancel the activity */
                    <EventCancelButton 
                      eventId={id!}
                      eventTitle={event.title}
                      className="flex-1"
                      variant="destructive"
                      size="default"
                    />
                  ) : isAttending ? (
                    /* Participants can leave the activity */
                    <EventLeaveButton 
                      eventId={id!}
                      eventTitle={event.title}
                      isHost={isHost}
                      onLeave={refetch}
                      className="flex-1"
                      variant="outline"
                      size="default"
                    />
                  ) : (
                    /* Non-attendees can join the activity */
                    <Button 
                      onClick={handleAttendance}
                      className="flex-1"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Activity
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleSaveToggle}
                    variant="outline" 
                    size="icon"
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                  </Button>
                </div>

                <Button 
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Activity
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="attendees" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendees">
                Attendees ({participants?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="discussion">
                Discussion ({messages?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendees" className="mt-6">
              <div className="space-y-4">
                {(participants || []).map((participant, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Avatar>
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>{participant.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {(!participants || participants.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No attendees yet. Be the first to join!
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="discussion" className="mt-6">
              {/* Only show discussions to attending participants and hosts */}
              {isAttending || isHost ? (
                <div className="space-y-6">
                  <ScrollArea className="h-96 w-full border rounded-lg p-4">
                    {(messages || []).map((message, index) => (
                      <MessageItem 
                        key={index} 
                        message={message} 
                        hostId={event.host_id}
                      />
                    ))}
                    
                    {(!messages || messages.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No messages yet. Start the conversation!
                      </p>
                    )}
                  </ScrollArea>

                  {/* Comment Form */}
                  <form onSubmit={handleSubmitComment} className="space-y-4">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts about this activity..."
                      className="min-h-[100px]"
                    />
                    <Button type="submit" disabled={!comment.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-6 p-6 rounded-full bg-primary/10">
                    <Users className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Join to Access Discussion</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Activity discussions are only visible to confirmed attendees. Join this activity to participate in the conversation!
                  </p>
                  <Button onClick={handleAttendance} size="lg">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Activity
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Rating Section - Placeholder for future implementation */}
          {isAttending && !userStatus.isHost && (
            <Card className="mt-8">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Rating feature coming soon!</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Share Modal */}
      <ShareEventModal 
        open={showShareModal}
        onOpenChange={setShowShareModal}
        event={event}
        currentUser={currentUser}
      />
    </>
  );
};

export default OptimizedEventDetails;