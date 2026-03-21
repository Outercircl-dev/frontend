import React, { useMemo } from 'react';
import { PinterestMessageCard } from './PinterestMessageCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  type: 'welcome' | 'reminder' | 'chat' | 'post-activity';
  title: string;
  content: string;
  sender?: {
    name: string;
    avatar_url?: string;
  };
  timestamp: string;
  isRead?: boolean;
  eventTitle?: string;
  event_id?: string;
}

interface PinterestMessageGridProps {
  messages: Message[];
  onMessageClick?: (message: Message) => void;
  className?: string;
  groupByEvent?: boolean;
}

export const PinterestMessageGrid: React.FC<PinterestMessageGridProps> = ({
  messages,
  onMessageClick,
  className = '',
  groupByEvent = false
}) => {
  const organizedMessages = useMemo(() => {
    if (!groupByEvent) {
      return { ungrouped: messages };
    }

    const grouped = messages.reduce((acc, message) => {
      const eventKey = message.event_id || message.eventTitle || 'Direct Messages';
      if (!acc[eventKey]) {
        acc[eventKey] = [];
      }
      acc[eventKey].push(message);
      return acc;
    }, {} as Record<string, Message[]>);

    // Sort each group by timestamp (newest first)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    return grouped;
  }, [messages, groupByEvent]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No messages yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your activity messages and conversations will appear here in a beautiful grid layout
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="space-y-6 p-1">
        {Object.entries(organizedMessages).map(([groupKey, groupMessages]) => (
          <div key={groupKey}>
            {groupByEvent && groupKey !== 'ungrouped' && (
              <>
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="text-primary">📅</span>
                    {groupKey}
                  </h3>
                  <Separator className="mt-2" />
                </div>
              </>
            )}
            
            <div className="grid gap-4 auto-rows-min" style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}>
              {groupMessages.map((message) => (
                <PinterestMessageCard
                  key={message.id}
                  {...message}
                  onClick={() => onMessageClick?.(message)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};