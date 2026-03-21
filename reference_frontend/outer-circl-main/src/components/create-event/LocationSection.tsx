
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin, AlertCircle, Navigation } from 'lucide-react';

interface LocationSectionProps {
  location: string;
  meetupSpot: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onLocationChange: (coordinates: [number, number]) => void;
}

// Global location suggestions - major cities worldwide
const globalCities = [
  'New York, NY, USA',
  'London, UK',
  'Paris, France',
  'Tokyo, Japan',
  'Sydney, Australia',
  'Berlin, Germany',
  'Toronto, Canada',
  'Barcelona, Spain',
  'Amsterdam, Netherlands',
  'Dublin, Ireland',
  'Galway, Ireland',
  'Cork, Ireland',
  'Edinburgh, Scotland',
  'Manchester, UK',
  'Rome, Italy',
  'Madrid, Spain',
  'Vienna, Austria',
  'Prague, Czech Republic',
  'Copenhagen, Denmark',
  'Stockholm, Sweden',
  'Oslo, Norway',
  'Helsinki, Finland',
  'Zurich, Switzerland',
  'Brussels, Belgium',
  'Luxembourg City, Luxembourg',
  'Lisbon, Portugal',
  'Athens, Greece'
];

const LocationSection: React.FC<LocationSectionProps> = ({
  location,
  meetupSpot,
  onInputChange,
  onLocationChange
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    
    // Show suggestions when typing
    if (value.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    
    onInputChange(e);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const syntheticEvent = {
      target: {
        name: 'location',
        value: suggestion
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onInputChange(syntheticEvent);
    setShowSuggestions(false);
  };

  const filteredSuggestions = globalCities.filter(city =>
    city.toLowerCase().includes(location.toLowerCase()) && 
    location.length > 0
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Main Location Field */}
      <div className="space-y-2 relative">
        <div className="grid gap-1.5">
          <Label htmlFor="location" className="text-xs">Location *</Label>
          <div className="relative">
            <Input
              id="location"
              name="location"
              value={location}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter any location worldwide..."
              className="h-8 text-xs pl-7"
            />
            <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-pink-500" />
          </div>
          
          {/* Location suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg border-b border-gray-100 last:border-b-0 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-pink-500" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-[10px] text-muted-foreground">
          Enter any location worldwide - city, venue, or specific address
        </div>
      </div>

      {/* Meetup Spot Field */}
      <div className="space-y-2">
        <div className="grid gap-1.5">
          <Label htmlFor="meetupSpot" className="text-xs">Meetup Spot (optional)</Label>
          <div className="relative">
            <Input
              id="meetupSpot"
              name="meetupSpot"
              value={meetupSpot}
              onChange={onInputChange}
              placeholder="e.g., By the main entrance, Near the fountain, Parking lot..."
              className="h-8 text-xs pl-7"
            />
            <Navigation className="absolute left-2 top-2 h-3.5 w-3.5 text-pink-500" />
          </div>
        </div>
        
        <div className="text-[10px] text-muted-foreground">
          Specify exactly where participants should meet within the location
        </div>
      </div>
    </div>
  );
};

export default LocationSection;
