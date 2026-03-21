import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PinterestMessagingView } from '../messages/PinterestMessagingView';

interface SafeChatSectionProps {
  messageFilter?: 'all' | 'direct' | 'activities';
  currentUser?: any;
  selectedConversation?: string;
  onConversationChange?: (conversationId: string | null) => void;
}

// Simple wrapper component that ensures ChatSection has router context
export const SafeChatSection: React.FC<SafeChatSectionProps> = (props) => {
  const navigate = useNavigate();
  
  // Simple router ready check
  const isRouterReady = !!navigate;

  // Only render ChatSection when router is ready
  if (!isRouterReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023]"></div>
      </div>
    );
  }

  return <PinterestMessagingView {...props} />;
};

export default SafeChatSection;