
import React, { useState } from 'react';
import { Image, Users, UserIcon, MessageCircle, Bookmark, ExternalLink, Calendar, MapPin, Send, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MediaGrid from '@/components/MediaGrid';
import SafeChatSection from '@/components/profile/SafeChatSection';
import { useNavigate } from 'react-router-dom';

interface ProfileTabContentProps {
  activeTab: string;
  userMedia: any[];
  friends: any[];
  profileData: any;
  savedActivities: any[];
  pastActivities?: any[];
  isCurrentUserProfile: boolean;
  onCreateActivity: (mediaItem: any) => void;
  onShareWithFriends: (mediaItem: any) => void;
  onActivityClick: (activityId: string) => void;
  onMediaUploaded?: (mediaItem: any) => void;
}

const ProfileTabContent: React.FC<ProfileTabContentProps> = ({
  activeTab,
  userMedia,
  friends,
  profileData,
  savedActivities,
  pastActivities = [],
  isCurrentUserProfile,
  onCreateActivity,
  onShareWithFriends,
  onActivityClick,
  onMediaUploaded
}) => {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const renderTabHeader = (icon: React.ReactNode, title: string, count?: number) => (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3 font-sans">
        <div className="p-2 bg-gradient-to-r from-brand-salmon to-pink-400 rounded-xl shadow-lg">
          {icon}
        </div>
        {title}
      </h3>
      {count !== undefined && (
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      )}
    </div>
  );

  if (activeTab === 'media') {
    return (
      <div className="animate-fade-in">
        {renderTabHeader(<Image className="w-6 h-6 text-white" />, 'Media Gallery', userMedia.length)}
        <MediaGrid 
          media={userMedia}
          canView={true}
          isFriend={true}
          isCurrentUser={isCurrentUserProfile}
          onCreateActivity={onCreateActivity}
          onShareWithFriends={onShareWithFriends}
          onMediaUploaded={onMediaUploaded}
        />
      </div>
    );
  }

  if (activeTab === 'friends') {
    return (
      <div className="space-y-4 animate-fade-in">
        {renderTabHeader(<Users className="w-6 h-6 text-white" />, 'Friends Network', friends.length)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friend) => (
            <div 
              key={friend.id} 
              className="flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 rounded-xl cursor-pointer group transition-all duration-200 border border-gray-200 hover:border-brand-salmon shadow-sm hover:shadow-md"
              onClick={() => navigate(`/profile/${friend.id}`)}
            >
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                  <AvatarImage src={friend.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-brand-salmon to-pink-400 text-white font-bold">
                    {friend.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                  friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-salmon transition-colors font-sans">
                  {friend.name}
                </p>
                <p className="text-xs text-gray-600 font-medium">@{friend.username}</p>
                <p className="text-xs text-gray-500">{friend.mutualFriendsCount || 0} mutual friends</p>
                {friend.lastActivity && (
                  <p className="text-xs text-gray-400">Last seen: {friend.lastActivity}</p>
                )}
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        
        {friends.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 font-medium">No friends yet</p>
            <p className="text-xs text-gray-400 mt-2">Start connecting with people to build your network!</p>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'about') {
    return (
      <div className="space-y-6 animate-fade-in">
        {renderTabHeader(<UserIcon className="w-6 h-6 text-white" />, 'About')}
        
        <div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 mb-6">
            <p className="text-gray-700 leading-relaxed text-lg">
              {profileData?.bio || 'No bio available'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 mb-3 font-sans">Details</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <span className="text-blue-500 text-lg">📍</span>
                  <span className="text-gray-700 font-medium">{profileData?.location || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <span className="text-green-500 text-lg">💼</span>
                  <span className="text-gray-700 font-medium">{profileData?.occupation || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <span className="text-purple-500 text-lg">📅</span>
                  <span className="text-gray-700 font-medium">
                    Joined {new Date(profileData?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {profileData?.interests && profileData.interests.length > 0 && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-3 font-sans">Interests</h5>
                <div className="flex flex-wrap gap-2">
                  {profileData.interests.slice(0, 8).map((interest: string, index: number) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-pink-100 to-purple-100 text-brand-salmon px-3 py-2 rounded-full text-sm font-medium border border-pink-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'messages') {
    // No conversations state - removed sample data
    return (
      <div className="animate-fade-in">
        {renderTabHeader(
          <MessageCircle className="w-6 h-6 text-white" />, 
          'Messages',
          0
        )}

        {/* Start New Conversation */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/messages')}
            className="bg-brand-salmon hover:bg-brand-dark-salmon text-white rounded-full px-6 py-3"
          >
            <Send className="h-4 w-4 mr-2" />
            Start New Conversation
          </Button>
        </div>

        {/* Integrated Chat Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <SafeChatSection messageFilter="all" />
        </div>
      </div>
    );
  }

  if (activeTab === 'saved') {
    if (!isCurrentUserProfile) {
      return (
        <div className="text-center py-12 animate-fade-in">
          {renderTabHeader(<Bookmark className="w-6 h-6 text-white" />, 'Saved Activities')}
          <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Saved activities are private</p>
        </div>
      );
    }

    const allActivities = [...savedActivities];
    const totalCount = savedActivities.length + pastActivities.length;

    const renderActivityCard = (activity: any, activityType: 'saved' | 'past') => (
      <div 
        key={`${activityType}-${activity.id}`} 
        className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl cursor-pointer hover:from-pink-50 hover:to-purple-50 transition-all duration-300 group border border-gray-200 hover:border-brand-salmon shadow-sm hover:shadow-md"
        onClick={() => onActivityClick(activity.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <h5 className="font-semibold text-gray-900 text-sm group-hover:text-brand-salmon transition-colors font-sans">
            {activity.title}
          </h5>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              activityType === 'saved' 
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {activityType === 'saved' ? 'Saved' : 'Attended'}
            </span>
            <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        
        <div className="space-y-2 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-2 p-2 bg-white/50 rounded-md">
            <Calendar className="h-3 w-3 text-blue-500" />
            <span className="font-medium">
              {new Date(activity.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
              {activity.time && ` at ${activity.time}`}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/50 rounded-md">
            <MapPin className="h-3 w-3 text-green-500" />
            <span className="font-medium">{activity.location || 'Location TBD'}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/50 rounded-md">
            <Users className="h-3 w-3 text-purple-500" />
            <span className="font-medium">{activity.attendees || activity.max_attendees || 0} attendees</span>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {activity.description || 'No description available'}
        </p>
        
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
          activityType === 'past'
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
            : activity.status === 'confirmed' || activity.status === 'active'
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
              : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border border-yellow-200'
        }`}>
          {activityType === 'past' ? 'Completed' : (activity.status || 'active')}
        </span>
      </div>
    );

    return (
      <div className="space-y-6 animate-fade-in">
        {renderTabHeader(<Bookmark className="w-6 h-6 text-white" />, 'My Activities', totalCount)}

        {/* Saved Activities Section */}
        {savedActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg">
                <Bookmark className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 font-sans">Saved & Upcoming</h4>
              <span className="text-sm text-gray-500 bg-orange-50 px-2 py-1 rounded-full font-medium border border-orange-200">
                {savedActivities.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {savedActivities.map((activity) => renderActivityCard(activity, 'saved'))}
            </div>
          </div>
        )}

        {/* Past Activities Section */}
        {pastActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 font-sans">Past 30 Days</h4>
              <span className="text-sm text-gray-500 bg-blue-50 px-2 py-1 rounded-full font-medium border border-blue-200">
                {pastActivities.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastActivities.map((activity) => renderActivityCard(activity, 'past'))}
            </div>
          </div>
        )}

        {savedActivities.length === 0 && pastActivities.length === 0 && (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 font-medium">No activities yet</p>
            <p className="text-xs text-gray-400 mt-2">Save activities you're interested in or join events to see them here!</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ProfileTabContent;
