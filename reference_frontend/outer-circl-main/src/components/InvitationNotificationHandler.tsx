import * as React from 'react';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import EventInvitationModal from './EventInvitationModal';

const { useState, useEffect } = React;

const InvitationNotificationHandler: React.FC = () => {
  const { invitations, isLoading } = useEventInvitations();
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-show modal for the first pending invitation
  useEffect(() => {
    if (!isLoading && invitations.length > 0 && !selectedInvitation) {
      setSelectedInvitation(invitations[0]);
      setIsModalOpen(true);
    }
  }, [invitations, isLoading, selectedInvitation]);

  const handleInvitationResponse = (accepted: boolean) => {
    setSelectedInvitation(null);
    setIsModalOpen(false);
    
    // Show next invitation if any
    setTimeout(() => {
      const nextInvitation = invitations.find(inv => inv.id !== selectedInvitation?.id);
      if (nextInvitation) {
        setSelectedInvitation(nextInvitation);
        setIsModalOpen(true);
      }
    }, 500);
  };

  if (!selectedInvitation) return null;

  return (
    <EventInvitationModal
      isOpen={isModalOpen}
      onOpenChange={setIsModalOpen}
      invitation={selectedInvitation}
      onResponse={handleInvitationResponse}
    />
  );
};

export default InvitationNotificationHandler;