import { Skeleton } from "./skeleton";

/**
 * Pinterest-style skeleton loading components
 * Phase 6: Beautiful loading states
 */

export const MessageCardSkeleton = () => (
  <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
      </div>
    </div>
  </div>
);

export const ConversationCardSkeleton = () => (
  <div className="p-3 rounded-xl bg-card hover:bg-accent/50 transition-colors border border-border">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      <Skeleton className="h-2 w-2 rounded-full" />
    </div>
  </div>
);

export const NotificationCardSkeleton = () => (
  <div className="p-4 rounded-xl bg-card border border-border space-y-3">
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
      </div>
    </div>
  </div>
);

export const MessageThreadSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
          <Skeleton className="h-20 w-64 rounded-2xl" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export const PinterestLoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background flex items-center justify-center p-4">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-48 mx-auto rounded-full" />
        <Skeleton className="h-4 w-64 mx-auto rounded-full" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MessageCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const MessagingViewSkeleton = () => (
  <div className="flex h-[calc(100vh-12rem)] gap-4">
    {/* Conversations sidebar */}
    <div className="w-80 space-y-2">
      <Skeleton className="h-8 w-32 rounded-full mb-4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <ConversationCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Messages area */}
    <div className="flex-1 border border-border rounded-2xl overflow-hidden">
      <div className="h-16 border-b border-border p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
      </div>
      <MessageThreadSkeleton />
    </div>
  </div>
);
