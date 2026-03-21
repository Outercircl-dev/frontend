
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const EventCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton className="w-full aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
};

export const UserProfileSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Hero background */}
      <Skeleton className="h-32 w-full" />
      
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="flex justify-center -mt-12 mb-4">
          <Skeleton className="w-24 h-24 rounded-full border-4 border-white" />
        </div>
        
        {/* Name and username */}
        <div className="text-center space-y-2 mb-4">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
        
        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
        
        {/* Bio */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
        </div>
        
        {/* Interests */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-6 w-18" />
        </div>
      </div>
    </div>
  );
};

export const ChatMessageSkeleton: React.FC = () => {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export const FriendActivitySkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton className="w-full aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex -space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Tab skeleton */}
      <div className="flex space-x-4 border-b">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-20" />
      </div>
      
      {/* Form sections skeleton */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      
      {/* Save button skeleton */}
      <div className="flex justify-end pt-4 border-t">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

export const MembershipLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
};
