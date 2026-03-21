
import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

const galwayLocations = [
  'Galway City',
  'Salthill',
  'Clifden',
  'Ballinasloe',
  'Tuam',
  'Loughrea'
];

const MobileSearchModal: React.FC<MobileSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUserId 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    activities: any[];
    people: any[];
    places: string[];
  }>({ activities: [], people: [], places: [] });

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ activities: [], people: [], places: [] });
      return;
    }

    try {
      // Search activities
      const { data: activities } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,location.ilike.%${query}%`)
        .eq('status', 'active')
        .limit(3);

      // Search people
      const { data: people } = await supabase
        .rpc('search_users', {
          search_term: query,
          requesting_user_id: currentUserId || '00000000-0000-0000-0000-000000000000'
        })
        .limit(3);

      // Filter places
      const places = galwayLocations
        .filter(location => location.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      setSearchResults({
        activities: activities || [],
        people: people || [],
        places
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearch = (term?: string) => {
    const queryTerm = term || searchTerm.trim();
    if (queryTerm) {
      navigate(`/dashboard?search=${encodeURIComponent(queryTerm)}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Search</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search input */}
      <div className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search activities & friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#E60023] focus:border-transparent text-base"
              autoFocus
            />
          </div>
        </form>
      </div>

      {/* Search results */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Activities */}
        {searchResults.activities.map((activity) => (
          <button 
            key={activity.id} 
            onClick={() => {
              navigate(`/event/${activity.id}`);
              onClose();
            }} 
            className="w-full p-4 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
          >
            <Calendar className="h-5 w-5 text-[#E60023] flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.location}</p>
            </div>
          </button>
        ))}
        
        {/* People */}
        {searchResults.people.map((person) => (
          <button 
            key={person.id} 
            onClick={() => {
              navigate(`/profile/${person.id}`);
              onClose();
            }} 
            className="w-full p-4 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback>{person.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-left flex-1">
              <p className="text-sm font-medium">{person.name}</p>
              <p className="text-xs text-gray-500">{person.username}</p>
            </div>
          </button>
        ))}

        {/* Places */}
        {searchResults.places.map((place) => (
          <button 
            key={place} 
            onClick={() => handleSearch(place)} 
            className="w-full p-4 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
          >
            <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-sm font-medium">{place}</p>
              <p className="text-xs text-gray-500">Location</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileSearchModal;
