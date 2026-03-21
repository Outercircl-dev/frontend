import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, Bell, Calendar } from 'lucide-react';

interface ReminderMessageProps {
  message: {
    content: string;
    created_at: string;
    user: {
      name: string;
      avatar: string;
    };
  };
}

const ReminderMessage: React.FC<ReminderMessageProps> = ({ message }) => {
  // Determine reminder type based on content
  const getReminderType = (content: string) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('2 hour') || lowerContent.includes('2h')) {
      return { color: 'orange', label: '2h Reminder', icon: Clock };
    }
    if (lowerContent.includes('12 hour') || lowerContent.includes('12h')) {
      return { color: 'yellow', label: '12h Reminder', icon: Bell };
    }
    if (lowerContent.includes('24 hour') || lowerContent.includes('tomorrow')) {
      return { color: 'blue', label: '24h Reminder', icon: Calendar };
    }
    return { color: 'gray', label: 'Reminder', icon: Bell };
  };

  const reminderType = getReminderType(message.content);
  const Icon = reminderType.icon;

  // Color mapping for backgrounds based on reminder type
  const bgColorMap = {
    orange: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    gray: 'bg-muted/50 border-border'
  };

  const iconColorMap = {
    orange: 'text-orange-600 dark:text-orange-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-muted-foreground'
  };

  return (
    <div className={`rounded-lg border p-4 mb-4 ${bgColorMap[reminderType.color as keyof typeof bgColorMap]} transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-background/50 ${iconColorMap[reminderType.color as keyof typeof iconColorMap]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {reminderType.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
};

export default ReminderMessage;
