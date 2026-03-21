import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Shield, MessageCircle, MapPin, Star } from 'lucide-react';
import UserAvatar from './UserAvatar';
import UserReliabilityRating from './UserReliabilityRating';
import FriendshipButton from './FriendshipButton';
import { useUserReliabilityRating } from '@/hooks/useUserReliabilityRating';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';

interface ProfileHeaderProps {
  profileData: any;
  isCurrentUserProfile: boolean;
  showReliabilityStars: boolean;
  userReliabilityRating: number;
  stats: { activities: number };
  onEditProfile: () => void;
  onPhotoUpload: () => void;
  onViewSettings: () => void;
  onPrivacySettings?: () => void;
  onBannerChange: () => void;
  onMessageUser: () => void;
  currentUserId?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isCurrentUserProfile,
  showReliabilityStars,
  userReliabilityRating,
  stats,
  onEditProfile,
  onPhotoUpload,
  onViewSettings,
  onPrivacySettings,
  onBannerChange,
  onMessageUser,
  currentUserId
}) => {
  const { reliabilityData, loading: ratingLoading } = useUserReliabilityRating(profileData?.id);
  
  // Use actual rating data or fall back to prop for backwards compatibility
  const displayRating = reliabilityData?.hasRatings ? reliabilityData.averageRating : null;
  const totalRatings = reliabilityData?.totalRatings || 0;

  // Get current user ID for uploads
  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  // Image upload functionality
  const { uploading, triggerFileInput } = useImageUpload({
    userId: profileData?.id || '',
    onSuccess: (url) => {
      // Refresh the page to show updated image
      window.location.reload();
    }
  });

  const handleAvatarUpload = async () => {
    const userId = await getCurrentUserId();
    if (userId && userId === profileData?.id) {
      triggerFileInput('avatar');
    }
  };

  return (
    <div className="relative mb-8">
      {/* Simplified Header - No Banner for Better Performance */}
      <div className="bg-gradient-to-br from-slate-100 to-gray-200 py-8 rounded-2xl">
        {/* Profile Information Card - Mobile Optimized */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 py-4 px-4 md:py-6 md:px-6 mx-4">
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Mobile: Avatar and Basic Info in Column Layout */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Profile Avatar */}
              <div className="flex-shrink-0">
                <UserAvatar
                  avatarUrl={profileData?.avatar_url}
                  name={profileData?.name}
                  size="lg"
                  showUploadButton={isCurrentUserProfile}
                  onUpload={handleAvatarUpload}
                  className="ring-4 ring-white shadow-xl w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40"
                />
              </div>
              
              {/* Basic Info - Mobile Optimized */}
              <div className="flex-1 text-center sm:text-left w-full min-w-0">
                <div className="mb-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-sans tracking-tight leading-tight break-words">
                    {profileData?.name || 'User Name'}
                  </h1>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                    <span className="text-base sm:text-lg text-gray-600 font-medium truncate">
                      @{profileData?.username || 'username'}
                    </span>
                    {profileData?.location && (
                      <div className="flex items-center justify-center sm:justify-start gap-1">
                        <span className="hidden sm:inline text-gray-400 mx-2">•</span>
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm sm:text-md text-gray-500 truncate">
                          {profileData.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {profileData?.bio && (
                    <p className="text-gray-700 text-sm sm:text-md leading-relaxed max-w-full sm:max-w-2xl mb-3 break-words">
                      {profileData.bio}
                    </p>
                  )}
                </div>

                {/* Contact Information - Only visible to profile owner */}
                {isCurrentUserProfile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {profileData?.phone && (
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm font-medium">📞 Office</span>
                        <span className="text-sm font-mono">{profileData.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reliability Ratings Section - Visible to Other Users */}
                {!isCurrentUserProfile && showReliabilityStars && (
                  <div className="bg-gradient-to-br from-brand-salmon/5 to-brand-salmon/10 p-4 rounded-xl border border-brand-salmon/20 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Community Rating</h3>
                      <span className="text-sm text-gray-500">Based on event attendance</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        {displayRating ? (
                          <>
                            <div className="text-3xl font-bold text-brand-salmon mb-1">{displayRating}</div>
                            <div className="flex items-center justify-center mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(displayRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="text-xs text-gray-600">
                              {totalRatings} rating{totalRatings !== 1 ? 's' : ''}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-gray-400 mb-1">N/A</div>
                            <div className="flex items-center justify-center mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 text-gray-300" />
                              ))}
                            </div>
                            <div className="text-xs text-gray-600">No ratings yet</div>
                          </>
                        )}
                      </div>
                      {displayRating ? (
                        <div className="flex-1">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Punctual</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-brand-salmon h-2 rounded-full" style={{width: `${displayRating * 20}%`}}></div>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(displayRating * 20)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Helpful</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-brand-salmon h-2 rounded-full" style={{width: `${Math.max(0, (displayRating - 0.2) * 20)}%`}}></div>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(Math.max(0, (displayRating - 0.2) * 20))}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Friendly</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-brand-salmon h-2 rounded-full" style={{width: `${Math.min(100, (displayRating + 0.3) * 20)}%`}}></div>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(Math.min(100, (displayRating + 0.3) * 20))}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Punctual</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-300 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-gray-500">-</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Helpful</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-300 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-gray-500">-</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-16">Friendly</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-300 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-gray-500">-</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-brand-salmon/10">
                      <p className="text-xs text-gray-600 text-center">
                        Ratings are based on feedback from event attendees and help build trust in our community
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats Row for Current User or Non-Rated Profiles */}
                <div className="flex items-center gap-6 mb-4">
                  {(isCurrentUserProfile || !showReliabilityStars) && (
                    <div className="text-center bg-brand-salmon/10 p-3 rounded-xl min-w-[70px]">
                      {displayRating !== null ? (
                        <>
                          <div className="text-2xl font-bold text-brand-salmon">{displayRating}</div>
                          <div className="flex items-center justify-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(displayRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-gray-400">N/A</div>
                          <div className="flex items-center justify-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-gray-300" />
                            ))}
                          </div>
                        </>
                      )}
                      <div className="text-xs text-gray-600 mt-1">Reliability Rating</div>
                    </div>
                  )}
                </div>

                {/* Interests Tags */}
                {profileData?.interests && profileData.interests.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.interests.slice(0, 6).map((interest: string, index: number) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 bg-brand-salmon/10 text-brand-salmon text-sm rounded-full border border-brand-salmon/20 font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                      {profileData.interests.length > 6 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          +{profileData.interests.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="w-full">
              <div className="space-y-3">
                {isCurrentUserProfile ? (
                  <>
                    <Button 
                      onClick={onEditProfile}
                      size="sm"
                      className="w-full bg-brand-salmon hover:bg-brand-dark-salmon text-white font-medium py-2 px-4 rounded-lg transition-all shadow hover:shadow-md"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={onViewSettings} 
                        variant="outline" 
                        size="sm"
                        className="border border-gray-300 hover:border-brand-salmon hover:text-brand-salmon font-medium py-2 px-3 rounded-lg transition-all text-xs sm:text-sm"
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        Settings
                      </Button>
                      
                      {onPrivacySettings && (
                        <Button 
                          onClick={onPrivacySettings} 
                          variant="outline" 
                          size="sm"
                          className="border border-gray-300 hover:border-brand-salmon hover:text-brand-salmon font-medium py-2 px-3 rounded-lg transition-all text-xs sm:text-sm"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Privacy
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Friendship Button */}
                      <FriendshipButton
                        currentUserId={currentUserId}
                        targetUserId={profileData?.id}
                        size="sm"
                      />
                      
                      <Button 
                        onClick={onMessageUser} 
                        size="sm"
                        variant="outline"
                        className="border-brand-salmon text-brand-salmon hover:bg-brand-salmon hover:text-white font-medium py-2 px-4 rounded-lg transition-all"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                    
                    {/* Personal Introduction Section */}
                    {profileData?.introduction && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
                        <h3 className="text-md font-semibold text-gray-900 mb-2">Personal Introduction</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {profileData.introduction}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;