
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar, MapPin, Users, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';
import ReliabilityStarsDisplay from './ReliabilityStarsDisplay';

// Debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export type Person = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  reliabilityStars?: number;
};

type SearchResult = {
  activities: Array<{
    id: string;
    title: string;
    location: string;
    date: string;
    categories: string[];
  }>;
  people: Person[];
  places: Array<{
    id: string;
    name: string;
    address: string;
    coordinates?: [number, number];
    type: string;
  }>;
};

interface SearchPopoverProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

const SearchPopover: React.FC<SearchPopoverProps> = ({ 
  placeholder = "Search activities, people, places...", 
  className,
  onSearch
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({
    activities: [],
    people: [],
    places: []
  });
  const navigate = useNavigate();
  const { membershipTier } = useMembership();
  const isPremium = membershipTier === 'premium';

  // Get current user
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Search functions
  const searchActivities = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .eq('status', 'active')
        .limit(5);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching activities:', error);
      return [];
    }
  };

  const searchPeople = async (query: string) => {
    try {
      const { data, error } = await supabase
        .rpc('search_users', {
          search_term: query,
          requesting_user_id: currentUser?.id || '00000000-0000-0000-0000-000000000000'
        });
      
      if (error) throw error;
      return data?.map((person: any) => ({
        id: person.id,
        name: person.name,
        username: person.username,
        avatar: person.avatar_url,
        reliabilityStars: 0 // You can add reliability calculation here
      })) || [];
    } catch (error) {
      console.error('Error searching people:', error);
      return [];
    }
  };

  // Simulate search results based on query
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults({
        activities: [],
        people: [],
        places: []
      });
      return;
    }
    
    const [activities, people] = await Promise.all([
      searchActivities(query),
      searchPeople(query)
    ]);
    // Mock places (you can replace with real data)
    const places = [
      { id: '1', name: 'Galway City Centre', address: 'City Centre, Galway', type: 'area' },
      { id: '2', name: 'Salthill', address: 'Salthill, Galway', type: 'area' },
      { id: '3', name: 'Claddagh', address: 'Claddagh, Galway', type: 'area' },
    ].filter(place => 
      place.name.toLowerCase().includes(query.toLowerCase()) ||
      place.address.toLowerCase().includes(query.toLowerCase())
    );

    // Map activities to the expected format
    const mappedActivities = activities.map((activity: any) => ({
      id: activity.id,
      title: activity.title,
      location: activity.location,
      date: activity.date,
      categories: [activity.category || 'Other']
    }));
    
    setResults({
      activities: mappedActivities,
      people,
      places
    });
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 300),
    [currentUser]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Handle search input and pass to parent component
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Clear search functionality
  const clearSearch = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
    setOpen(false);
  };

  const handleSelect = (type: 'event' | 'person' | 'place', id: string) => {
    setOpen(false);
    
    if (type === 'event') {
      navigate(`/event/${id}`);
    } else if (type === 'person') {
      navigate(`/profile/${id}`);
    }
  };

  // Handle direct search submission
  const handleSearchSubmit = () => {
    if (query.trim()) {
      setOpen(false);
      // Navigate to dashboard with search query
      navigate(`/dashboard?search=${encodeURIComponent(query.trim())}`);
      if (onSearch) {
        onSearch(query.trim());
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={`relative w-full ${className}`}>
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
            onFocus={() => setOpen(true)}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground hover:text-gray-700 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder={placeholder}
            value={query}
            onValueChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-4 text-sm text-muted-foreground">
                {query.trim() ? (
                  <div className="space-y-2">
                    <p>No results found for "{query}".</p>
                    <button
                      onClick={handleSearchSubmit}
                      className="text-[#E60023] hover:underline text-sm font-medium"
                    >
                      Search all activities for "{query}"
                    </button>
                  </div>
                ) : (
                  <p>Start typing to search...</p>
                )}
              </div>
            </CommandEmpty>
            
            {results.activities.length > 0 && (
              <CommandGroup heading="Activities">
                {results.activities.map(event => (
                  <CommandItem 
                    key={event.id}
                    onSelect={() => handleSelect('event', event.id)}
                    className="flex items-center py-2 cursor-pointer"
                  >
                    <div className="mr-2 p-1 bg-pink-50 rounded-full">
                      <Calendar className="h-4 w-4 text-[#E60023]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{event.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1 inline" /> {event.location}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.places.length > 0 && (results.activities.length > 0 || results.people.length > 0) && (
              <CommandSeparator />
            )}

            {results.places.length > 0 && (
              <CommandGroup heading="Places">
                {results.places.map(place => (
                  <CommandItem 
                    key={place.id}
                    onSelect={() => handleSelect('place', place.id)}
                    className="flex items-center py-2 cursor-pointer"
                  >
                    <div className="mr-2 p-1 bg-blue-50 rounded-full">
                      <MapPin className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{place.name}</span>
                      <span className="text-xs text-muted-foreground">{place.address}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {results.people.length > 0 && (results.activities.length > 0 || results.places.length > 0) && (
              <CommandSeparator />
            )}
            
            {results.people.length > 0 && (
              <CommandGroup heading="People">
                {results.people.map(person => (
                  <CommandItem 
                    key={person.id}
                    onSelect={() => handleSelect('person', person.id)}
                    className="flex items-center py-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={person.avatar} alt={person.name} />
                      <AvatarFallback className="bg-[#E60023] text-white">
                        {person.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{person.name}</span>
                      <span className="text-xs text-muted-foreground">{person.username}</span>
                    </div>
                    
                    {isPremium && person.reliabilityStars && (
                      <div className="ml-auto">
                        <ReliabilityStarsDisplay 
                          rating={person.reliabilityStars}
                          showTooltip={false}
                          size={14}
                          className="px-1.5 py-0.5 bg-pink-50 rounded-full"
                        />
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Show search all option when there are results */}
            {query.trim() && (results.activities.length > 0 || results.people.length > 0 || results.places.length > 0) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem 
                    onSelect={handleSearchSubmit}
                    className="flex items-center py-2 cursor-pointer text-[#E60023]"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Search all activities for "{query}"</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchPopover;
