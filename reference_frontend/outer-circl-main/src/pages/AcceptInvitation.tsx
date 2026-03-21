
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'error' | 'accepted'>('loading');

  const invitationToken = searchParams.get('token');

  useEffect(() => {
    if (!invitationToken) {
      setStatus('error');
      return;
    }

    loadInvitation();
    checkUser();
  }, [invitationToken]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadInvitation = async () => {
    try {
      // Phase 1c: Use secure RPC function instead of direct table access
      const { data, error } = await supabase
        .rpc('get_invitations_safe', { p_invitation_token: invitationToken })
        .maybeSingle();

      if (error) {
        console.error('Error loading invitation:', error);
        setStatus('error');
        return;
      }

      if (!data) {
        setStatus('error');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setStatus('error');
        return;
      }

      setInvitation(data);
      setStatus('found');
    } catch (error) {
      console.error('Error loading invitation:', error);
      setStatus('error');
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to auth with invitation token
      navigate(`/auth?invitation=${invitationToken}`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { invitationToken }
      });

      if (error) {
        toast.error(`Failed to accept invitation: ${error.message}`);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setStatus('accepted');
      toast.success('Invitation accepted successfully!');
      
      // Redirect to membership page after a delay
      setTimeout(() => {
        navigate('/membership');
      }, 2000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Invitation Accepted!</CardTitle>
            <CardDescription>
              You've successfully accepted the invitation and joined the membership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting you to your membership dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#E60023]/10 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-[#E60023]" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join a membership on Outer Circle.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Invitation Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-xs">{invitation?.email_masked || '***@***.***'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{invitation?.status || 'pending'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires:</span>
                <span>{new Date(invitation?.expires_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleAcceptInvitation}
            disabled={loading}
            className="w-full bg-[#E60023] hover:bg-[#D50C22]"
          >
            {loading ? (
              'Accepting...'
            ) : user ? (
              'Accept Invitation'
            ) : (
              'Sign Up to Accept'
            )}
          </Button>

          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              You'll need to create an account or sign in to accept this invitation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
