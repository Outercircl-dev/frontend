
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavbarSearchProps {
  shouldShowSearch: boolean;
}

// Galway County locations for search suggestions
const galwayLocations = [
  'Galway City',
  'Salthill',
  'Clifden',
  'Ballinasloe',
  'Tuam',
  'Loughrea',
  'Gort',
  'Athenry',
  'Oranmore',
  'Claregalway',
  'Moycullen',
  'Spiddal',
  'Kinvara',
  'Portumna',
  'Headford'
];

const NavbarSearch: React.FC<NavbarSearchProps> = ({ shouldShowSearch }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    activities: any[];
    people: any[];
    places: string[];
  }>({ activities: [], people: [], places: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ activities: [], people: [], places: [] });
      setShowSuggestions(false);
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

      // Search people - only if user is authenticated
      let people = [];
      if (currentUser?.id) {
        const { data: peopleData, error: peopleError } = await supabase
          .rpc('search_users', {
            search_term: query,
            requesting_user_id: currentUser.id
          })
          .limit(3);
        
        if (!peopleError) {
          people = peopleData || [];
        }
      }

      // Mock places
      const places = galwayLocations
        .filter(location => location.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      setSearchResults({
        activities: activities || [],
        people: people,
        places
      });
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (isMobile) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Handle escape key to close expanded search on mobile
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isExpanded) {
        setIsExpanded(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isExpanded]);

  // Focus input when expanded on mobile
  useEffect(() => {
    if (isMobile && isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile, isExpanded]);

  const handleSearch = (e: React.FormEvent, term?: string) => {
    e.preventDefault();
    const queryTerm = term || searchTerm.trim();
    if (queryTerm) {
      navigate(`/dashboard?search=${encodeURIComponent(queryTerm)}`);
      setShowSuggestions(false);
      if (isMobile) {
        setIsExpanded(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    navigate(`/dashboard?search=${encodeURIComponent(suggestion)}`);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const handleMobileSearchToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setSearchTerm('');
      setShowSuggestions(false);
    }
  };

  if (!shouldShowSearch) {
    return null;
  }

  // Mobile view: Just search icon when collapsed
  if (isMobile && !isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMobileSearchToggle}
        className="h-8 w-8 p-0 hover:bg-gray-100"
      >
        <Search className="h-4 w-4 text-gray-600" />
      </Button>
    );
  }

  // Mobile expanded view: Full screen overlay
  if (isMobile && isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Search</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMobileSearchToggle}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search input */}
        <div className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search activities & friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => (searchResults.activities.length > 0 || searchResults.people.length > 0 || searchResults.places.length > 0) && setShowSuggestions(true)}
                className="pl-10 pr-4 py-3 w-full bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#E60023] focus:border-transparent text-base"
              />
            </div>
          </form>
        </div>

        {/* Search results */}
        {showSuggestions && (searchResults.activities.length > 0 || searchResults.people.length > 0 || searchResults.places.length > 0) && (
          <div className="flex-1 overflow-y-auto px-4">
            {/* Activities */}
            {searchResults.activities.map((activity) => (
              <button 
                key={activity.id} 
                onClick={() => {
                  navigate(`/event/${activity.id}`);
                  setIsExpanded(false);
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
                  setIsExpanded(false);
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
          </div>
        )}
      </div>
    );
  }

  // Desktop view: Traditional search bar
  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search activities & friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => (searchResults.activities.length > 0 || searchResults.people.length > 0 || searchResults.places.length > 0) && setShowSuggestions(true)}
            className="pl-10 pr-4 py-2 w-64 bg-gray-50 border-gray-200 rounded-full focus:bg-white focus:ring-2 focus:ring-[#E60023] focus:border-transparent"
          />
        </div>
      </form>
      
      {/* Search suggestions dropdown */}
      {showSuggestions && (searchResults.activities.length > 0 || searchResults.people.length > 0 || searchResults.places.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Activities */}
          {searchResults.activities.map((activity) => (
            <button key={activity.id} onClick={() => navigate(`/event/${activity.id}`)} className="w-full p-2 hover:bg-gray-50 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#E60023]" />
              <div className="text-left">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.location}</p>
              </div>
            </button>
          ))}
          {/* People */}
          {searchResults.people.map((person) => (
            <button key={person.id} onClick={() => navigate(`/profile/${person.id}`)} className="w-full p-2 hover:bg-gray-50 flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={person.avatar_url} />
                <AvatarFallback>{person.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{person.name}</p>
                <p className="text-xs text-gray-500">{person.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavbarSearch;
