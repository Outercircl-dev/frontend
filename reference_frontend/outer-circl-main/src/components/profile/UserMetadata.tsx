
import React from 'react';
import { MapPin, Users, Calendar, Cake, User } from 'lucide-react';

interface UserMetadataProps {
  location?: string;
  joinDate?: string;
  birthDateFormatted?: string | null;
  gender?: string;
  age?: number;
  showFullDetails: boolean;
}

const UserMetadata: React.FC<UserMetadataProps> = ({ 
  location, 
  joinDate, 
  birthDateFormatted,
  gender,
  age,
  showFullDetails
}) => {
  const getAgeRange = (age?: number) => {
    if (!age) return null;
    const decade = Math.floor(age / 10) * 10;
    return `${decade}s`;
  };

  return (
    <>
      {gender && !showFullDetails && (
        <div className="mt-1 flex items-center justify-center text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5 mr-1" />
          <span>{gender}</span>
        </div>
      )}
      
      {age && !showFullDetails && (
        <div className="mt-1 text-sm text-muted-foreground text-center">
          {showFullDetails ? (
            <span>{age} years old</span>
          ) : (
            <span>Age: {getAgeRange(age)}</span>
          )}
        </div>
      )}

      {location && showFullDetails && (
        <div className="flex items-center mt-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          <span>{location}</span>
        </div>
      )}

      {birthDateFormatted && showFullDetails && (
        <div className="flex items-center text-xs text-muted-foreground mt-4">
          <Cake className="h-3.5 w-3.5 mr-1" />
          <span>Born {birthDateFormatted}</span>
        </div>
      )}
      
      {joinDate && showFullDetails && (
        <div className="flex items-center text-xs text-muted-foreground mt-4">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          <span>Joined {joinDate}</span>
        </div>
      )}
    </>
  );
};

export default UserMetadata;
