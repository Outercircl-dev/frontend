
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, ShieldCheck, Share2, Badge, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import EventLeaveButton from './EventLeaveButton';

export interface EventData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  time: string;
  location: string;
  attendees?: number;
  maxAttendees?: number;
  categories?: string[]; // Keep for backward compatibility
  category?: string;     // New single category field
  genderPreference?: 'male' | 'female' | 'no_preference';
  host?: {
    name: string;
    avatar?: string;
    memberType?: 'standard' | 'premium';
  };
  hostId?: string;
  isAttending?: boolean;
  
  isSaved?: boolean;     // New saved field
  approvalRequired?: boolean;
  status?: 'Pending' | 'Confirmed' | 'Draft';
  friendsAttending?: { name: string; avatar?: string }[];
}

interface ActivityCardProps {
  event: EventData;
  className?: string;
  onAttendClick?: (eventId: string) => void;
  onSaveClick?: (eventId: string, isSaved: boolean) => Promise<void>;
  isLoggedIn?: boolean;
  isHomepageSample?: boolean; // New prop for simplified homepage display
  currentUserId?: string;
  onLeave?: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  event, 
  className, 
  onAttendClick, 
  onSaveClick,
  isLoggedIn = false,
  isHomepageSample = false,
  currentUserId,
  onLeave
}) => {
  // Safe router hook usage with fallback
  let navigate;
  try {
    navigate = useNavigate();
  } catch (error) {
    console.warn('ActivityCard: Router context not available, using window navigation');
    navigate = (path: string) => { window.location.href = path; };
  }
  
  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Display category names instead of IDs
  const getCategoryLabel = (categoryId: string) => {
    const categoryMap: Record<string, string> = {
      'social': 'Social',
      'education': 'Education',
      'sports': 'Sports & Fitness',
      'arts': 'Arts & Culture',
      'technology': 'Technology',
      'food': 'Food & Drinks',
      'health-wellness': 'Health & Wellness',
      'outdoors': 'Outdoors',
      'gaming': 'Gaming',
      'giving-back': 'Giving Back',
      'other': 'Other'
    };
    
    return categoryMap[categoryId] || categoryId;
  };
  
  // Determine if spots are available
  const maxParticipants = event.maxAttendees || 4; // Updated default to 4
  const spotsLeft = maxParticipants - (event.attendees || 0);
  const isFull = spotsLeft <= 0;

  // Check if this is a core activity (max 4 participants)
  const isCoreActivity = event.maxAttendees === 4;

  // Handle attend button click
  const handleAttendClick = (e: React.MouseEvent) => {
    // If user is not logged in, prevent event propagation and redirect to auth page
    if (!isLoggedIn) {
      e.preventDefault();
      e.stopPropagation();
      toast({
        title: "Please log in to attend activities",
        variant: "destructive"
      });
      navigate("/auth?tab=login&redirect=" + encodeURIComponent(`/event/${event.id}`));
      return;
    }
    
    if (onAttendClick && !event.isAttending && !isFull) {
      onAttendClick(event.id);
    }
  };


  // Handle save click (database)
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      toast({
        title: "Please log in to save activities",
        variant: "destructive"
      });
      navigate("/auth?tab=login");
      return;
    }
    
    if (onSaveClick) {
      await onSaveClick(event.id, !event.isSaved);
    }
  };

  // Share functionality
  const shareEvent = (platform: string) => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const eventTitle = event.title;
    const eventDescription = event.description;
    
    let shareUrl = "";
    
    switch(platform) {
      case "gmail":
        shareUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(`Join me at ${eventTitle}`)}&body=${encodeURIComponent(`Check out this activity: ${eventTitle}\n\n${eventDescription}\n\nDate: ${formatDate(event.date)} at ${event.time}\nLocation: ${event.location}\n\nJoin me at: ${eventUrl}`)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(`Join me at ${eventTitle}`)}&body=${encodeURIComponent(`Check out this activity: ${eventTitle}\n\n${eventDescription}\n\nDate: ${formatDate(event.date)} at ${event.time}\nLocation: ${event.location}\n\nJoin me at: ${eventUrl}`)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`Join me at ${eventTitle}! ${eventUrl}`)}`;
        break;
      case "sms":
        shareUrl = `sms:?body=${encodeURIComponent(`Join me at ${eventTitle}! ${eventUrl}`)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(eventUrl);
        toast({
          title: "Activity link copied to clipboard!",
        });
        return;
      default:
        shareUrl = eventUrl;
    }
    
    if (platform !== "copy") {
      const newWindow = window.open(shareUrl, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        // Fallback if popup is blocked
        window.location.href = shareUrl;
      }
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col ${className}`}>
      {isLoggedIn ? (
        <Link to={isHomepageSample ? "/dashboard" : `/event/${event.id}`} className="flex-grow">
          <div className="relative">
            <AspectRatio ratio={4/3} className="w-full">
              <img 
                src={event.imageUrl || '/placeholder.svg'}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </AspectRatio>
            
            {/* Status badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {event.status && (
                <BadgeComponent className={event.status === 'Confirmed' ? "bg-green-500" : event.status === 'Draft' ? "bg-gray-500" : "bg-yellow-500"}>
                  {event.status === 'Pending' ? 'Join Now' : event.status}
                </BadgeComponent>
              )}
              {event.approvalRequired && (
                <BadgeComponent variant="outline" className="bg-white/80 border-brand-purple text-brand-purple">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Approval
                </BadgeComponent>
              )}
              {/* Core Activity Badge */}
              {isCoreActivity && (
                <BadgeComponent className="bg-[#E60023] text-white border-none">
                  Core Activity
                </BadgeComponent>
              )}
              {/* Gender Preference Badge */}
              {event.genderPreference === 'male' && (
                <BadgeComponent className="bg-blue-500 text-white border-none">
                  Guys Activity
                </BadgeComponent>
              )}
              {event.genderPreference === 'female' && (
                <BadgeComponent className="bg-pink-500 text-white border-none">
                  Ladies Activity
                </BadgeComponent>
              )}
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex-grow cursor-pointer" onClick={handleAttendClick}>
          <div className="relative">
            <AspectRatio ratio={4/3} className="w-full">
              <img 
                src={event.imageUrl || '/placeholder.svg'} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </AspectRatio>
            
            {/* Status badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {event.status && (
                <BadgeComponent className={event.status === 'Confirmed' ? "bg-green-500" : event.status === 'Draft' ? "bg-gray-500" : "bg-yellow-500"}>
                  {event.status === 'Pending' ? 'Join Now' : event.status}
                </BadgeComponent>
              )}
              {event.approvalRequired && (
                <BadgeComponent variant="outline" className="bg-white/80 border-brand-purple text-brand-purple">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Approval
                </BadgeComponent>
              )}
              {/* Core Activity Badge */}
              {isCoreActivity && (
                <BadgeComponent className="bg-[#E60023] text-white border-none">
                  Core Activity
                </BadgeComponent>
              )}
              {/* Gender Preference Badge */}
              {event.genderPreference === 'male' && (
                <BadgeComponent className="bg-blue-500 text-white border-none">
                  Guys Activity
                </BadgeComponent>
              )}
              {event.genderPreference === 'female' && (
                <BadgeComponent className="bg-pink-500 text-white border-none">
                  Ladies Activity
                </BadgeComponent>
              )}
            </div>
            
          </div>
        </div>
      )}
      
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{event.title}</h3>
          {!isHomepageSample && (
            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-gray-500"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => shareEvent("gmail")}>
                    Share via Gmail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareEvent("email")}>
                    Share via Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareEvent("whatsapp")}>
                    Share via WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareEvent("sms")}>
                    Share via Text Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareEvent("copy")}>
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        <div className="flex items-center text-gray-500 text-sm mb-3">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {truncateDescription(event.description)}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {isCoreActivity && (
            <BadgeComponent variant="outline" className="text-xs bg-[#E60023]/10 text-[#E60023] border-[#E60023]">
              Outercircl Core
            </BadgeComponent>
          )}
          {/* Gender Preference Badge */}
          {event.genderPreference === 'male' && (
            <BadgeComponent variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
              🔵 Guys Activity
            </BadgeComponent>
          )}
          {event.genderPreference === 'female' && (
            <BadgeComponent variant="outline" className="text-xs bg-pink-50 text-pink-600 border-pink-200">
              🌸 Ladies Activity
            </BadgeComponent>
          )}
          {/* Display category */}
          {event.category && (
            <BadgeComponent variant="outline" className="text-xs">
              {getCategoryLabel(event.category)}
            </BadgeComponent>
          )}
          {/* Fallback to categories array if available */}
          {!event.category && event.categories && event.categories.slice(0, isCoreActivity ? 2 : 3).map((category, index) => (
            <BadgeComponent key={index} variant="outline" className="text-xs">
              {getCategoryLabel(category)}
            </BadgeComponent>
          ))}
          {!event.category && event.categories && event.categories.length > (isCoreActivity ? 2 : 3) && (
            <BadgeComponent variant="outline" className="text-xs">
              +{event.categories.length - (isCoreActivity ? 2 : 3)}
            </BadgeComponent>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          {event.host && (
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={event.host.avatar} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                  {event.host.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">{event.host.name}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {(event.attendees !== undefined || event.maxAttendees !== undefined) && (
              <div className="flex items-center text-xs text-gray-500">
                <Users className="h-3 w-3 mr-1" />
                <span>{event.attendees || 0}/{event.maxAttendees || 4}</span>
              </div>
            )}
            
            {!isHomepageSample && (
              <BadgeComponent variant="outline" className="text-xs">
                {formatDate(event.date)}
              </BadgeComponent>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 border-t mt-auto">
        {isFull && !event.isAttending ? (
          <Button variant="outline" disabled className="w-full text-xs py-1 h-8">Full</Button>
        ) : isLoggedIn ? (
          <div className="w-full space-y-2">
            <Link 
              to={`/event/${event.id}`}
              className="w-full block"
            >
              <Button 
                className={`w-full text-xs py-1 h-8 ${event.isAttending ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                variant={event.isAttending ? "default" : "pinterest"}
              >
                {event.isAttending ? 'Attending' : event.approvalRequired ? 'Request to Join' : 'Join Activity'}
              </Button>
            </Link>
            
            {/* Show leave button if user is attending and not the host */}
            {event.isAttending && currentUserId && event.hostId !== currentUserId && (
              <EventLeaveButton
                eventId={event.id}
                eventTitle={event.title}
                isHost={event.hostId === currentUserId}
                onLeave={onLeave}
                variant="outline"
                size="sm"
                className="w-full"
              />
            )}
          </div>
        ) : (
          <Button 
            onClick={handleAttendClick}
            className="w-full text-xs py-1 h-8"
            variant="pinterest"
          >
            Sign in to Join
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;
