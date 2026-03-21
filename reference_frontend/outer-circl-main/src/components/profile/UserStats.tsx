
import React from 'react';
import { Users, Calendar, Star } from 'lucide-react';

interface UserStatsProps {
  friendsCount: number;
  activitiesAttended: number;
  activitiesHosted: number;
}

const UserStats: React.FC<UserStatsProps> = ({
  friendsCount,
  activitiesAttended,
  activitiesHosted
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100 shadow-sm">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-600 mr-1" />
            <span className="text-lg font-semibold text-gray-800">{friendsCount}</span>
          </div>
          <p className="text-xs text-gray-600">Friends</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <Calendar className="h-5 w-5 text-green-600 mr-1" />
            <span className="text-lg font-semibold text-gray-800">{activitiesAttended}</span>
          </div>
          <p className="text-xs text-gray-600">Activities Attended</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <Star className="h-5 w-5 text-yellow-600 mr-1" />
            <span className="text-lg font-semibold text-gray-800">{activitiesHosted}</span>
          </div>
          <p className="text-xs text-gray-600">Activities Hosted</p>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
