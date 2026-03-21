import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UnifiedMessage } from '@/hooks/useUnifiedMessaging';
import { MessageThread } from './MessageThread';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ThreadedMessageListProps {
  messages: UnifiedMessage[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * Virtualized message list with Pinterest-style threading
 * Phase 3: Performance-optimized message display
 */
export const ThreadedMessageList: React.FC<ThreadedMessageListProps> = ({
  messages,
  currentUserId,
  onLoadMore,
  hasMore = false
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Group messages by conversation (event_id or direct message pair)
  const threads = React.useMemo(() => {
    const threadMap = new Map<string, UnifiedMessage[]>();
    
    messages.forEach(msg => {
      const threadKey = msg.event_id || 
        (msg.recipient_id && msg.sender_id 
          ? [msg.sender_id, msg.recipient_id].sort().join('-')
          : msg.id);
      
      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, []);
      }
      threadMap.get(threadKey)!.push(msg);
    });

    return Array.from(threadMap.entries()).map(([key, msgs]) => ({
      id: key,
      messages: msgs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      lastMessage: msgs[0],
      unreadCount: msgs.filter(m => !m.read_at && m.recipient_id === currentUserId).length
    }));
  }, [messages, currentUserId]);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  // Load more when near bottom
  useEffect(() => {
    const items = rowVirtualizer.getVirtualItems();
    const lastItem = items[items.length - 1];
    
    if (lastItem && lastItem.index >= threads.length - 3 && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [rowVirtualizer.getVirtualItems(), threads.length, hasMore, onLoadMore]);

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  if (threads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No messages yet
      </div>
    );
  }

  return (
    <ScrollArea ref={parentRef} className="h-full">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const thread = threads[virtualRow.index];
          return (
            <div
              key={thread.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageThread
                thread={thread}
                currentUserId={currentUserId}
                isExpanded={expandedThreads.has(thread.id)}
                onToggle={() => toggleThread(thread.id)}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
