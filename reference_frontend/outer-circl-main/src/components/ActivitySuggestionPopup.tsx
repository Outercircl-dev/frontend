
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

interface ActivitySuggestionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSuggestion: (suggestion: string) => void;
}

const ActivitySuggestionPopup: React.FC<ActivitySuggestionPopupProps> = ({
  open,
  onOpenChange,
  onSelectSuggestion,
}) => {
  // Predefined list of suggested activities
  const suggestedActivities = [
    "Cold Plunge",
    "Dog Walk",
    "New Moms Playground Meetup",
    "5K Jog - Beginner",
    "Book Club Meetup",
    "Morning Meditation",
    "Coffee & Conversation",
    "Urban Photography Walk",
    "Pickup Basketball",
    "Hiking Adventure",
    "Cooking Class",
    "Board Game Night"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl overflow-hidden bg-white shadow-xl border-none">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-brand-salmon" />
            Suggested Activities
          </DialogTitle>
          <DialogDescription>
            Pick one of these fun activities or create your own!
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-2 pb-4 max-h-[60vh] overflow-y-auto">
          {suggestedActivities.map((activity, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start h-auto py-3 px-4 whitespace-normal text-left hover:bg-brand-purple/10 hover:border-brand-purple/50 hover:text-brand-purple transition-all rounded-lg shadow-sm"
              onClick={() => {
                onSelectSuggestion(activity);
                onOpenChange(false);
              }}
            >
              {activity}
            </Button>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Create My Own
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivitySuggestionPopup;
