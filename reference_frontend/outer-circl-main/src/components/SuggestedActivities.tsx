
import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SuggestedActivities: React.FC = () => {
  // Mock suggested activities data
  const suggestedActivities = [
    {
      id: '101',
      title: 'Local Art Fair',
      date: '2023-10-29',
      time: '11:00 AM',
      location: 'Central Park',
      distance: '0.8',
      attendees: 27,
      maxAttendees: 40,
      host: {
        name: 'Creative Community',
        avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
      },
      categories: ['Arts'],
      imageUrl: '/placeholder.svg',
    },
    {
      id: '102',
      title: 'Coffee & Code Meetup',
      date: '2023-10-31',
      time: '6:30 PM',
      location: 'Byte Cafe',
      distance: '1.2',
      attendees: 9,
      maxAttendees: 15,
      host: {
        name: 'Tech Enthusiasts',
        avatar: 'https://randomuser.me/api/portraits/men/54.jpg',
      },
      categories: ['Technology'],
      imageUrl: '/placeholder.svg',
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Suggested Activities Near You</h3>
      {suggestedActivities.length > 0 ? (
        <div className="grid gap-6">
          {suggestedActivities.map(event => (
            <div 
              key={event.id} 
              className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Image Section */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={event.imageUrl || '/placeholder.svg'} 
                  alt={event.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <Badge className="bg-[#E60023] hover:bg-[#D50C22] font-medium">
                    {event.categories[0]}
                  </Badge>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4">
                <h4 className="font-semibold text-base mb-2">{event.title}</h4>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(event.date)} • {event.time}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-1 cursor-help">
                            {event.location} ({event.distance} miles away)
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{event.location} ({event.distance} miles from you)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <div className="flex items-center">
                      <span>{event.attendees}/{event.maxAttendees} attendees</span>
                      <div className="ml-2 w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#E60023] rounded-full"
                          style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarImage src={event.host.avatar} />
                      <AvatarFallback className="bg-[#E60023]/10 text-[#E60023] text-xs">
                        {event.host.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{event.host.name}</span>
                  </div>
                  
                  <Link to={`/event/${event.id}`} className="inline-block">
                    <Button 
                      variant="pinterest" 
                      className="rounded-full px-4 py-1 h-8 text-sm"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">
            No suggested activities at the moment
          </p>
        </div>
      )}
      <Link to="/dashboard" className="block">
        <Button variant="outline" size="sm" className="w-full rounded-full">
          Find More Activities
        </Button>
      </Link>
    </div>
  );
};

export default SuggestedActivities;
