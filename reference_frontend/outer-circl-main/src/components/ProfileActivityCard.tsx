
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Activity } from 'lucide-react';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from '@/components/ui/use-toast';

export interface ProfileEventData {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  date: string;
  time: string;
  location?: string;
  max_attendees?: number;
  category?: string;
  status?: string;
  
}

interface ProfileEventCardProps {
  event: ProfileEventData;
  isLoggedIn?: boolean;
}

const ProfileEventCard: React.FC<ProfileEventCardProps> = ({ 
  event, 
  isLoggedIn = false 
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };


  // Check if this is a core activity (max 4 participants)
  const isCoreActivity = event.max_attendees === 4;

  // Get category label
  const getCategoryLabel = (categoryId?: string) => {
    if (!categoryId) return 'Other';
    
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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 mb-6 last:mb-0">
      <Link to={`/event/${event.id}`} className="flex flex-col sm:flex-row">
        <div className="relative sm:w-1/3">
          <AspectRatio ratio={1/1} className="sm:h-full">
            <img 
              src={event.image_url || '/placeholder.svg'} 
              alt={event.title}
              className="w-full h-full object-cover hover:brightness-90 transition-all duration-300"
            />
          </AspectRatio>
          
          {/* Core Activity Icon */}
          {isCoreActivity && (
            <div className="absolute top-3 left-3 h-6 w-6 rounded-full bg-[#E60023]/90 backdrop-blur-sm flex items-center justify-center">
              <Activity className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-lg">{event.title}</h3>
            {isCoreActivity && (
              <Activity className="h-3 w-3 text-[#E60023]" />
            )}
          </div>
          
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
            
            {event.max_attendees && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                <span>Max {event.max_attendees} attendees</span>
                {isCoreActivity && (
                  <span className="ml-1 text-[#E60023] font-medium">(Core Activity)</span>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <BadgeComponent variant="outline" className="text-xs bg-[#E60023]/10 text-[#E60023] border-[#E60023]">
                {getCategoryLabel(event.category)}
              </BadgeComponent>
              <BadgeComponent variant="outline" className="text-sm px-3 py-1">
                {formatDate(event.date)} at {event.time}
              </BadgeComponent>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default ProfileEventCard;
