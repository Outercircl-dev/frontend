
import React from 'react';
import { MapPin } from 'lucide-react';

interface MapEvent {
  id: string;
  title: string;
  location: string;
  coordinates?: [number, number];
}

interface MapProps {
  className?: string;
  location?: string;
  activities?: MapEvent[];
  onLocationChange?: (coordinates: [number, number]) => void;
  interactive?: boolean;
  zoom?: number;
}

const Map: React.FC<MapProps> = ({ 
  className = '', 
  activities = [], 
  onLocationChange,
  interactive = true
}) => {
  
  return (
    <div className={`relative overflow-hidden rounded-lg border border-border bg-gray-50 ${className}`}>
      <div className="flex items-center justify-center h-full min-h-[240px] p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-pink-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Map View</h3>
            <p className="text-sm text-gray-500">Interactive map functionality coming soon</p>
          </div>
          
          {activities && activities.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <p className="text-sm font-medium text-gray-700">
                {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'} in this area
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;
