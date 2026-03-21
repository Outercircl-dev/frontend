import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Share2, Heart, CalendarPlus, MessageCircle, AlertTriangle, ShieldCheck, Circle, Download, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMembership } from '@/components/OptimizedProviders';
import ShareEventModal from '@/components/ShareEventModal';
import { supabase } from '@/integrations/supabase/client';
import UnifiedSEO from '@/components/UnifiedSEO';
import BreadcrumbSEO from '@/components/BreadcrumbSEO';
import { generateEventSchema } from '@/utils/seoSchemas';
import SEOImage from '@/components/SEOImage';
const EventDetails: React.FC = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    showAds
  } = useMembership();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAttending, setIsAttending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session?.user) {
        // Fetch current user profile (users can always see their own profile)
        const {
          data: profile
        } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', session.user.id).single();
        setCurrentUser(profile);
      }
    };
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', session.user.id).single();
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        console.log('Fetching event details for ID:', id);

        // Fetch the event - note that with new security policies, users can only see:
        // 1. Events they're hosting
        // 2. Events they're participating in
        // 3. Public events for discovery (but may not see full details)
        const {
          data: eventData,
          error: eventError
        } = await supabase.from('events').select('*').eq('id', id).single();
        if (eventError) {
          console.error('Error fetching event:', eventError);
          setEvent(null);
          setLoading(false);
          return;
        }
        if (!eventData) {
          setEvent(null);
          setLoading(false);
          return;
        }
        console.log('Event data:', eventData);

        // Check if current user is attending, auto-join host
        if (currentUser) {
          const {
            data: participantData
          } = await supabase.from('event_participants').select('status').eq('event_id', eventData.id).eq('user_id', currentUser.id).single();
          const isUserAttending = !!participantData;
          setIsAttending(isUserAttending);

          // If user is host and not already attending, auto-add them
          if (eventData.host_id === currentUser.id && !isUserAttending) {
            const {
              error: autoJoinError
            } = await supabase.from('event_participants').insert({
              event_id: eventData.id,
              user_id: currentUser.id,
              status: 'attending'
            });
            if (!autoJoinError) {
              setIsAttending(true);
              console.log('Host auto-joined event');
            }
          }
          console.log('User attendance status:', isUserAttending);
        }

        // Fetch host profile - will only work if user is friends with host or viewing their own event
        const {
          data: hostProfile,
          error: hostError
        } = await supabase.from('profiles').select('id, name, avatar_url, bio').eq('id', eventData.host_id).maybeSingle();
        if (hostError) {
          console.error('Error fetching host profile:', hostError);
        }
        console.log('Host profile:', hostProfile);

        // Fetch participants
        const {
          data: participantsData,
          error: participantsError
        } = await supabase.from('event_participants').select(`
            user_id,
            status,
            profiles:user_id (
              id,
              name,
              avatar_url
            )
          `).eq('event_id', eventData.id).eq('status', 'attending');
        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
        }
        const participantsList = participantsData?.map(p => ({
          id: p.user_id,
          name: p.profiles?.name || 'Unknown',
          avatar: p.profiles?.avatar_url || 'https://randomuser.me/api/portraits/men/22.jpg'
        })) || [];
        setParticipants(participantsList);

        // Fetch messages for this event with sender profiles
        const {
          data: messagesData,
          error: messagesError
        } = await supabase.from('messages').select(`
            id,
            content,
            created_at,
            sender_id
          `).eq('event_id', eventData.id).eq('message_type', 'event').order('created_at', {
          ascending: true
        });
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        }

        // Fetch sender profiles separately, using public view for better compatibility
        const senderIds = messagesData?.map(m => m.sender_id) || [];
        const {
          data: sendersData
        } = await supabase.from('profiles_public_secure').select('id, name, avatar_url').in('id', senderIds);
        const sendersMap = new Map(sendersData?.map(sender => [sender.id, sender]) || []);
        const messagesList = messagesData?.map(m => {
          const sender = sendersMap.get(m.sender_id);
          return {
            id: m.id,
            user: {
              id: m.sender_id,
              name: sender?.name || 'OuterCircl System',
              avatar: sender?.avatar_url || ''
            },
            text: m.content,
            timestamp: m.created_at
          };
        }) || [];
        console.log('Messages data raw:', messagesData);
        console.log('Processed messages:', messagesList);
        setMessages(messagesList);

        // Transform the data to match the expected format
        const transformedEvent = {
          id: eventData.id,
          title: eventData.title,
          description: eventData.description || '',
          imageUrl: eventData.image_url || '/placeholder.svg',
          date: eventData.date,
          time: eventData.time,
          duration: eventData.duration || '2 hours',
          location: eventData.location || '',
          coordinates: eventData.coordinates || [-73.98, 40.73],
          attendees: participantsList.length,
          maxAttendees: eventData.max_attendees || 4,
          categories: eventData.category ? [eventData.category] : ['other'],
          host: {
            id: eventData.host_id,
            name: hostProfile?.name || 'Unknown Host',
            avatar: hostProfile?.avatar_url || 'https://randomuser.me/api/portraits/men/22.jpg',
            bio: hostProfile?.bio || 'Event organizer'
          },
          participants: participantsList,
          comments: messagesList,
          status: 'Confirmed',
          approvalRequired: false
        };
        console.log('Transformed event:', transformedEvent);
        setEvent(transformedEvent);
      } catch (error) {
        console.error('Unexpected error fetching event details:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [id, currentUser]);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'EEEE, MMMM d, yyyy');
  };
  const handleAttendEvent = async () => {
    if (!isLoggedIn || !currentUser) {
      toast.error("Please log in to attend activities");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }
    try {
      if (!isAttending) {
        // Join the event
        const {
          error
        } = await supabase.from('event_participants').insert({
          event_id: id,
          user_id: currentUser.id,
          status: 'attending'
        });
        if (error) {
          console.error('Error joining event:', error);
          toast.error("Failed to join activity");
          return;
        }
        setIsAttending(true);
        toast.success("You're now attending this activity!");

        // Update participant count
        setEvent(prev => ({
          ...prev,
          attendees: prev.attendees + 1,
          participants: [...prev.participants, {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar_url
          }]
        }));
      } else {
        // Leave the event
        const {
          error
        } = await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', currentUser.id);
        if (error) {
          console.error('Error leaving event:', error);
          toast.error("Failed to leave activity");
          return;
        }
        setIsAttending(false);
        toast.info("You're no longer attending this activity.");

        // Update participant count
        setEvent(prev => ({
          ...prev,
          attendees: prev.attendees - 1,
          participants: prev.participants.filter(p => p.id !== currentUser.id)
        }));
      }
    } catch (error) {
      console.error('Unexpected error with attendance:', error);
      toast.error("Something went wrong. Please try again.");
    }
  };
  const handleSaveEvent = async () => {
    if (!isLoggedIn || !currentUser) {
      toast.error("Please log in to save activities");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }
    try {
      if (!isSaved) {
        // Save the event
        const {
          error
        } = await supabase.from('saved_events').insert({
          event_id: id,
          user_id: currentUser.id
        });
        if (error) {
          console.error('Error saving event:', error);
          toast.error("Failed to save activity");
          return;
        }
        setIsSaved(true);
        toast.success("Activity saved to your collection!");
      } else {
        // Remove from saved
        const {
          error
        } = await supabase.from('saved_events').delete().eq('event_id', id).eq('user_id', currentUser.id);
        if (error) {
          console.error('Error removing saved event:', error);
          toast.error("Failed to remove from collection");
          return;
        }
        setIsSaved(false);
        toast.info("Activity removed from your collection.");
      }
    } catch (error) {
      console.error('Unexpected error with saving:', error);
      toast.error("Something went wrong. Please try again.");
    }
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
      // Save message to database
      const {
        data: messageData,
        error
      } = await supabase.from('messages').insert({
        content: comment.trim(),
        sender_id: currentUser.id,
        event_id: id,
        message_type: 'event'
      }).select().single();
      if (error) {
        console.error('Error saving message:', error);
        toast.error("Failed to post comment");
        return;
      }

      // Add to local state
      const newComment = {
        id: messageData.id,
        user: {
          id: currentUser.id,
          name: currentUser.name || 'Current User',
          avatar: currentUser.avatar_url || ''
        },
        text: comment.trim(),
        timestamp: messageData.created_at
      };
      const updatedMessages = [...messages, newComment];
      setMessages(updatedMessages);
      setEvent({
        ...event,
        comments: updatedMessages
      });
      setComment('');
      toast.success("Comment posted!");
    } catch (error) {
      console.error('Unexpected error posting comment:', error);
      toast.error("Failed to post comment");
    }
  };
  const handleReportEvent = () => {
    if (!isLoggedIn) {
      toast.error("Please log in to report activities");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }

    // Create email with event details
    const subject = "Report Activity";
    const body = `Activity Details:
    
Title: ${event?.title || 'N/A'}
Date: ${event?.date ? formatDate(event.date) : 'N/A'}
Time: ${event?.time || 'N/A'}
Location: ${event?.location || 'N/A'}
Description: ${event?.description || 'N/A'}
Host: ${event?.hostProfile?.name || 'N/A'}
Event URL: ${window.location.href}

Please describe the issue with this activity:`;
    const mailtoLink = `mailto:info@outercircl.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open email client
    window.location.href = mailtoLink;
  };
  const handleMessageHost = () => {
    if (!isLoggedIn) {
      toast.error("Please log in to message the host");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }
    if (!event.host.id) {
      toast.error("Host information not available");
      return;
    }

    // Navigate to messages page with host as recipient
    navigate(`/messages?recipient=${event.host.id}&name=${encodeURIComponent(event.host.name)}`);
  };
  const handleShareEvent = () => {
    // Open share modal for other options
    setShowShareModal(true);
  };
  const generateCalendarUrls = () => {
    if (!event) return {};
    const startDate = new Date(`${event.date}T${event.time || '12:00:00'}`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const title = encodeURIComponent(event.title);
    const description = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${description}&location=${location}`,
      yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${title}&st=${start}&dur=0200&desc=${description}&in_loc=${location}`,
      ics: generateIcsFile()
    };
  };
  const generateIcsFile = () => {
    if (!event) return '';
    const startDate = new Date(`${event.date}T${event.time || '12:00:00'}`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OuterCircl//Event Calendar//EN', 'BEGIN:VEVENT', `UID:${event.id}@outercircl.com`, `DTSTART:${formatIcsDate(startDate)}`, `DTEND:${formatIcsDate(endDate)}`, `SUMMARY:${event.title}`, `DESCRIPTION:${event.description || ''}`, `LOCATION:${event.location || ''}`, `URL:${window.location.href}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return icsContent;
  };
  const downloadIcsFile = () => {
    const icsContent = generateIcsFile();
    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8'
    });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar file downloaded!');
  };
  const handleSendTestEmail = async () => {
    if (!isLoggedIn || !currentUser) {
      toast.error("Please log in to send test emails");
      navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`);
      return;
    }
    try {
      toast.info("Sending test emails to all participants...");
      const {
        data,
        error
      } = await supabase.functions.invoke('send-test-activity-email', {
        body: {
          eventId: id
        }
      });
      if (error) {
        console.error('Function error:', error);
        toast.error("Failed to send test emails");
        return;
      }
      toast.success(`Test emails sent successfully! ${data?.successful || 0} emails delivered.`);
    } catch (error) {
      console.error('Unexpected error sending test emails:', error);
      toast.error("Failed to send test emails");
    }
  };
  const handleCalendarOption = (type: string) => {
    const urls = generateCalendarUrls();
    switch (type) {
      case 'google':
        window.open(urls.google, '_blank');
        break;
      case 'outlook':
        window.open(urls.outlook, '_blank');
        break;
      case 'yahoo':
        window.open(urls.yahoo, '_blank');
        break;
      case 'download':
        downloadIcsFile();
        break;
      default:
        break;
    }
  };
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar isLoggedIn={isLoggedIn} username={isLoggedIn ? "User" : undefined} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>;
  }
  if (!event) {
    return <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar isLoggedIn={isLoggedIn} username={isLoggedIn ? "User" : undefined} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Activity Not Found</h2>
            <p className="text-gray-600 mb-4">The activity you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/dashboard')}>Browse Activities</Button>
          </div>
        </div>
      </div>;
  }
  const spotsLeft = event.maxAttendees - event.attendees;
  const isFull = spotsLeft <= 0;

  // Check if this is a core activity (max 5 participants)
  const isCoreActivity = event.maxAttendees === 5;

  // Generate event schema for SEO
  const eventSchema = generateEventSchema({
    name: event.title,
    description: event.description,
    startDate: new Date(`${event.date}T${event.time || '12:00:00'}`).toISOString(),
    endDate: new Date(new Date(`${event.date}T${event.time || '12:00:00'}`).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    location: {
      name: event.location,
      latitude: event.coordinates?.[1],
      longitude: event.coordinates?.[0]
    },
    organizer: {
      name: event.host.name,
      url: `https://outercircl.com/profile/${event.host.id}`
    },
    image: event.imageUrl.startsWith('http') ? event.imageUrl : `https://outercircl.com${event.imageUrl}`,
    url: `https://outercircl.com/event/${event.id}`,
    eventStatus: 'EventScheduled',
    eventAttendanceMode: 'OfflineEventAttendanceMode'
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <UnifiedSEO
        title={`${event.title} - Event Details`}
        description={event.description || `Join ${event.title} on ${formatDate(event.date)} at ${event.location}. ${event.attendees} attending, ${event.maxAttendees - event.attendees} spots left.`}
        ogImage={event.imageUrl.startsWith('http') ? event.imageUrl : `https://outercircl.com${event.imageUrl}`}
        canonicalUrl={`https://outercircl.com/event/${event.id}`}
        type="article"
        article={{
          publishedTime: event.date,
          author: event.host.name,
          section: 'Events'
        }}
      />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar isLoggedIn={isLoggedIn} username={isLoggedIn ? "User" : undefined} />
      
      <main className="flex-1 container py-6">
        <BreadcrumbSEO 
          className="mb-6"
          items={[
            { name: 'Home', url: 'https://outercircl.com/', position: 1 },
            { name: 'Dashboard', url: 'https://outercircl.com/dashboard', position: 2 },
            { name: event.title, url: `https://outercircl.com/event/${event.id}`, position: 3 }
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-64 md:h-80">
                <SEOImage 
                  src={event.imageUrl || '/placeholder.svg'} 
                  alt={`${event.title} - Activity hosted by ${event.host.name}`}
                  title={event.title}
                  caption={`${event.title} on ${formatDate(event.date)} at ${event.location}`}
                  className="w-full h-full object-cover"
                  priority={true}
                  schema={{
                    '@type': 'ImageObject',
                    contentUrl: event.imageUrl,
                    description: `Event image for ${event.title}`,
                    name: event.title,
                    author: event.host.name
                  }}
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {event.status && <Badge className={event.status === 'Confirmed' ? "bg-green-500" : event.status === 'Draft' ? "bg-gray-500" : "bg-yellow-500"}>
                      {event.status}
                    </Badge>}
                  {event.approvalRequired && <Badge variant="outline" className="bg-white/80 border-pink-400 text-pink-600">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Approval Required
                    </Badge>}
                </div>
                
                {/* Core Activity Icon */}
                {isCoreActivity && <div className="absolute top-4 left-4 h-8 w-8 rounded-full bg-[#E60023]/90 backdrop-blur-sm flex items-center justify-center">
                    <Circle className="h-4 w-4 text-white fill-current" />
                  </div>}
              </div>
              
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.categories.map((category: string, index: number) => <Badge key={index} className="bg-[#E60023] hover:bg-[#D50C22]">
                      {category}
                    </Badge>)}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
                  {isCoreActivity && <Circle className="h-5 w-5 text-[#E60023] fill-current" />}
                </div>
                
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-[#E60023]" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-[#E60023]" />
                    <span>{event.time} • {event.duration}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-[#E60023]" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-[#E60023]" />
                    <span>{event.attendees} attending • {spotsLeft} spots left</span>
                    {isCoreActivity && <span className="ml-1 text-[#E60023] font-medium">(Core Activity)</span>}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAttendEvent} disabled={isFull && !isAttending} className={`${isAttending ? 'bg-green-500 hover:bg-green-600' : 'bg-[#E60023] hover:bg-[#D50C22]'} text-white`}>
                    {isAttending ? 'Attending' : isFull ? 'Full' : 'Attend'}
                  </Button>
                  <Button variant="outline" onClick={handleSaveEvent} className={isSaved ? 'border-pink-500 text-pink-500' : ''}>
                    <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-pink-500 text-pink-500' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/messages?conversation=event_${id}`)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Group Chat
                  </Button>
                  <Button variant="outline" onClick={handleShareEvent}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  {/* Test Email Button - Only show for event host */}
                  {event.host.id === currentUser?.id && <Button variant="outline" onClick={handleSendTestEmail} className="border-blue-500 text-blue-500 hover:bg-blue-50">
                      🧪 Test Email
                    </Button>}
                </div>
              </div>
            </div>
            
            {/* Event tabs */}
            <Tabs defaultValue="details" className="bg-white rounded-lg shadow-sm p-6">
              <TabsList className="mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attendees">Attendees ({event.attendees})</TabsTrigger>
                <TabsTrigger value="discussion">Discussion ({messages.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-line">{event.description}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="attendees">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={event.host.avatar} />
                      <AvatarFallback>{event.host.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{event.host.name}</div>
                      <div className="text-sm text-muted-foreground">Host • Organizer</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <h3 className="font-medium">Attendees ({event.participants.length})</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {event.participants.map((participant: any) => <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{participant.name}</div>
                      </div>)}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="discussion">
                {!isLoggedIn ? <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="mb-4">Please log in to view and participate in the discussion.</p>
                    <Button onClick={() => navigate(`/auth?tab=login&redirect=${encodeURIComponent(`/event/${id}`)}`)}>
                      Log In
                    </Button>
                  </div> : !isAttending && event.host.id !== currentUser?.id ? <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="mb-4">You must be a confirmed participant to view and participate in the discussion.</p>
                    <Button onClick={handleAttendEvent} disabled={isFull} className="bg-[#E60023] hover:bg-[#D50C22] text-white">
                      {isFull ? 'Activity Full' : 'Join Activity'}
                    </Button>
                  </div> : <div className="space-y-4">
                    <ScrollArea className="h-[300px] pr-4">
                      {messages.map((comment: any) => <div key={comment.id} className="flex gap-3 mb-4">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user.avatar} />
                            <AvatarFallback className="bg-[#E60023] text-white font-medium">
                              {comment.user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{comment.user.name}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm">{comment.text}</p>
                            </div>
                          </div>
                        </div>)}
                      
                      {messages.length === 0 && <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No comments yet. Be the first to start the discussion!</p>
                        </div>}
                    </ScrollArea>
                    
                    <form onSubmit={handleSubmitComment} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser?.avatar_url || "https://github.com/shadcn.png"} />
                         <AvatarFallback className="bg-[#E60023] text-white font-medium">
                           {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                         </AvatarFallback>
                       </Avatar>
                      <div className="flex-1">
                        <Textarea placeholder="Share your thoughts..." value={comment} onChange={e => setComment(e.target.value)} className="min-h-[60px] resize-none" />
                      </div>
                      <Button type="submit" className="bg-[#E60023] hover:bg-[#D50C22] text-white">
                        Post
                      </Button>
                    </form>
                  </div>}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium mb-4">Hosted by</h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={event.host.avatar} />
                  <AvatarFallback>{event.host.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{event.host.name}</div>
                  <div className="text-sm text-muted-foreground">Event Organizer</div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{event.host.bio}</p>
              
              <Button variant="outline" className="w-full" onClick={handleMessageHost}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Message Host
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium mb-4">Activity Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#E60023] mt-0.5" />
                  <div>
                    <div className="font-medium">Date & Time</div>
                    <div className="text-gray-600">{formatDate(event.date)}</div>
                    <div className="text-gray-600">{event.time} • {event.duration}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#E60023] mt-0.5" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-gray-600">{event.location}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-[#E60023] mt-0.5" />
                  <div>
                    <div className="font-medium">Attendees</div>
                    <div className="text-gray-600">
                      {event.attendees} attending • {spotsLeft} spots left
                    </div>
                  </div>
                </div>
                
                {event.approvalRequired && <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#E60023] mt-0.5" />
                    <div>
                      <div className="font-medium">Approval Required</div>
                      <div className="text-gray-600">
                        Host must approve your request to join
                      </div>
                    </div>
                  </div>}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-between items-center">
                {/* Test Email Button - only for this specific event */}
                {id === '13141d2c-26d6-462e-b3db-db153e5dbee2'}
                
                <Button variant="ghost" size="sm" className="text-gray-500 flex-shrink-0" onClick={handleReportEvent}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Report
                </Button>
                
                <Button variant="ghost" size="sm" className="text-gray-500 flex-shrink-0" onClick={handleShareEvent}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-500 flex-shrink-0">
                      <CalendarPlus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Add to Calendar</span>
                      <span className="sm:hidden">Calendar</span>
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg z-50">
                    <DropdownMenuItem onClick={() => handleCalendarOption('google')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Google Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCalendarOption('outlook')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Outlook Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCalendarOption('yahoo')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Yahoo Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCalendarOption('download')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download .ics file
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <ShareEventModal open={showShareModal} onOpenChange={setShowShareModal} event={event} currentUser={currentUser} />
      </div>
    </>
  );
};
export default EventDetails;