import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, Heart, Share2, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { EventData } from '@/components/ActivityCard';

interface PinterestActivityCardProps {
  event: EventData;
  className?: string;
  onAttendClick?: (eventId: string) => void;
  onSaveClick?: (eventId: string, isSaved: boolean) => Promise<void>;
  isLoggedIn?: boolean;
  currentUserId?: string;
}

const PinterestActivityCard: React.FC<PinterestActivityCardProps> = ({
  event, 
  className, 
  onAttendClick, 
  onSaveClick,
  isLoggedIn = false,
  currentUserId
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

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

  const maxParticipants = event.maxAttendees || 4;
  const spotsLeft = maxParticipants - (event.attendees || 0);
  const isFull = spotsLeft <= 0;
  const isCoreActivity = event.maxAttendees === 4;

  const handleAttendClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      e.stopPropagation();
      toast({
        title: "Please log in to attend activities",
        variant: "destructive"
      });
      navigate("/auth?tab=login");
      return;
    }
    
    if (onAttendClick && !event.isAttending && !isFull) {
      onAttendClick(event.id);
    }
  };

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

  const shareEvent = (platform: string) => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const eventTitle = event.title;
    
    let shareUrl = "";
    
    switch(platform) {
      case "copy":
        navigator.clipboard.writeText(eventUrl);
        toast({
          title: "Activity link copied to clipboard!",
        });
        return;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`Join me at ${eventTitle}! ${eventUrl}`)}`;
        break;
      default:
        shareUrl = eventUrl;
    }
    
    if (platform !== "copy") {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className={`group overflow-hidden bg-white rounded-2xl shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-1 cursor-pointer ${className}`}>
      <Link to={isLoggedIn ? `/event/${event.id}` : "#"} onClick={!isLoggedIn ? handleAttendClick : undefined}>
        <div className="relative overflow-hidden">
          <AspectRatio ratio={4/3} className="w-full">
            <div className={`w-full h-full bg-gray-100 ${!imageLoaded ? 'loading-skeleton' : ''}`}>
              <img 
                src={event.imageUrl || '/placeholder.svg'}
                alt={event.title}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          </AspectRatio>
          
          {/* Pinterest-style overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
            {/* Action buttons - appear on hover */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="pinterest-gray" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shadow-soft"
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => shareEvent("whatsapp")}>
                    Share via WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareEvent("copy")}>
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Core Activity Badge */}
            {isCoreActivity && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary text-white border-none shadow-soft">
                  Core Activity
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        {/* Title and host info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 leading-snug">
              {event.title}
            </h3>
          </div>
          
          {event.host && (
            <Avatar className="h-8 w-8 ml-3 flex-shrink-0">
              <AvatarImage src={event.host.avatar} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                {event.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>

        {/* Date and attendees */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(event.date)}</span>
          </div>
          
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{event.attendees || 0}/{maxParticipants}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1 mb-4">
          {event.category && (
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
              {getCategoryLabel(event.category)}
            </Badge>
          )}
          {event.genderPreference === 'male' && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
              Guys Only
            </Badge>
          )}
          {event.genderPreference === 'female' && (
            <Badge variant="outline" className="text-xs bg-pink-50 text-pink-600 border-pink-200">
              Ladies Only
            </Badge>
          )}
        </div>

        {/* Action button */}
        <div className="space-y-2">
          {isFull && !event.isAttending ? (
            <Button variant="pinterest-gray" disabled className="w-full">
              Activity Full
            </Button>
          ) : (
            <Link to={isLoggedIn ? `/event/${event.id}` : "#"} className="block" onClick={!isLoggedIn ? handleAttendClick : undefined}>
              <Button 
                className={`w-full ${event.isAttending ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                variant={event.isAttending ? "default" : "pinterest"}
              >
                {event.isAttending ? 'You\'re Going!' : isLoggedIn ? 'Join Activity' : 'Sign in to Join'}
              </Button>
            </Link>
          )}

          {/* Host name */}
          {event.host && (
            <p className="text-xs text-gray-500 text-center">
              Hosted by {event.host.name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PinterestActivityCard;