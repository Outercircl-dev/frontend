
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Mail, Trash2, Crown, Clock, Sparkles } from 'lucide-react';
import { useSupabaseMembership } from '@/hooks/useSupabaseMembership';

const SupabaseAccountManagement: React.FC = () => {
  const { 
    membership, 
    loading, 
    isAdmin, 
    availableSlots, 
    usedSlots, 
    sendInvitation, 
    removeSlot 
  } = useSupabaseMembership();
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 overflow-hidden">
        <CardContent className="pt-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto"></div>
            <p className="mt-4 text-gray-600">loading membership...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!membership) {
    return null;
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }

    if (!isValidEmail(inviteEmail)) {
      return;
    }

    setIsInviting(true);
    try {
      const success = await sendInvitation(inviteEmail);
      if (success) {
        setInviteEmail('');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveSlot = (slotId: string) => {
    removeSlot(slotId);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getTotalSlots = () => {
    return 1; // Only premium tier supports single user
  };

  const getStatusIcon = (slot: any) => {
    if (slot.status === 'active') {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">active</Badge>;
    } else if (slot.status === 'invited') {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          <Clock className="h-3 w-3 mr-1" />
          invited
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-gray-500">available</Badge>;
  };

  const tierConfig = {
    duo: { color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
    family: { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' }
  };

  const config = tierConfig[membership.subscription_tier as keyof typeof tierConfig];

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 overflow-hidden">
      {/* Header with gradient */}
      <CardHeader className={`bg-gradient-to-r from-[#E60023] to-purple-600 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-full">
              <Users className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">account management</CardTitle>
            {isAdmin && (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Crown className="h-3 w-3 mr-1" />
                admin
              </Badge>
            )}
          </div>
          <CardDescription className="text-white/90 text-base">
            manage your {membership.subscription_tier} membership • {usedSlots}/{getTotalSlots()} slots used
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Account Slots List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-[#E60023]" />
            <h3 className="text-lg font-semibold text-gray-900">account slots</h3>
          </div>
          
          <div className="grid gap-4">
            {membership.membership_slots
              .sort((a, b) => a.slot_position - b.slot_position)
              .map((slot, index) => (
                <div key={slot.id} className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${config?.bgColor || 'bg-gray-200'} flex items-center justify-center text-lg font-bold ${config?.color || 'text-gray-600'}`}>
                        {slot.slot_position + 1}
                      </div>
                      <div>
                        {slot.profiles?.email ? (
                          <div>
                            <p className="font-semibold text-gray-900 text-lg">{slot.profiles.email}</p>
                            <div className="flex items-center gap-3 mt-2">
                              {slot.slot_position === 0 && (
                                <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                                  <Crown className="h-3 w-3 mr-1" />
                                  admin
                                </Badge>
                              )}
                              {getStatusIcon(slot)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-500 text-lg font-medium">available slot</p>
                            <p className="text-sm text-gray-400">ready for invitation</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {slot.user_id && slot.slot_position !== 0 && isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Invite Section */}
        {isAdmin && availableSlots > 0 && (
          <div className="bg-gradient-to-r from-[#E60023]/5 to-purple-50 p-6 rounded-xl border border-[#E60023]/20">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-[#E60023]" />
              <h3 className="text-lg font-semibold text-gray-900">invite new member</h3>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="enter email address to invite"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-12 rounded-full border-gray-300 focus:border-[#E60023] focus:ring-[#E60023]"
                />
              </div>
              <Button 
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail.trim()}
                className="bg-[#E60023] hover:bg-[#D50C22] text-white rounded-full px-8 h-12 font-medium"
              >
                {isInviting ? (
                  'sending...'
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    invite
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mt-3">
              you have {availableSlots} available slot{availableSlots !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}

        {/* Info for non-admin users */}
        {!isAdmin && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 text-lg">member account</p>
                <p className="text-blue-700 mt-1 leading-relaxed">
                  you're part of a {membership.subscription_tier} membership. contact your account admin to manage slots and invitations.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseAccountManagement;
