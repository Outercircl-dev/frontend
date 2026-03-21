
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('ResetPassword page mounted');
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Hash:', window.location.hash);
    
    const handlePasswordReset = async () => {
      try {
        // First, let's check if there are tokens in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('URL search params:', Object.fromEntries(urlParams.entries()));
        console.log('Hash params:', Object.fromEntries(hashParams.entries()));
        
        // Extract tokens from both locations
        const accessToken = urlParams.get('access_token') || 
                           hashParams.get('access_token') ||
                           searchParams.get('access_token');
        
        const refreshToken = urlParams.get('refresh_token') || 
                            hashParams.get('refresh_token') ||
                            searchParams.get('refresh_token');
        
        const type = urlParams.get('type') || 
                    hashParams.get('type') ||
                    searchParams.get('type');
        
        console.log('Extracted tokens:');
        console.log('- Access token present:', !!accessToken);
        console.log('- Refresh token present:', !!refreshToken);
        console.log('- Type:', type);
        
        if (!accessToken || type !== 'recovery') {
          console.log('No valid reset tokens found or incorrect type');
          toast.error('Invalid reset link. Please request a new password reset.');
          setTimeout(() => navigate('/auth?tab=login'), 2000);
          setIsLoading(false);
          return;
        }

        console.log('Setting session with tokens...');
        
        // Set the session with the extracted tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        console.log('Session set result:', { sessionData, sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error('Invalid or expired reset link. Please request a new password reset.');
          setTimeout(() => navigate('/auth?tab=login'), 2000);
          setIsLoading(false);
          return;
        }

        if (!sessionData.session) {
          console.error('No session created');
          toast.error('Failed to create session. Please request a new password reset.');
          setTimeout(() => navigate('/auth?tab=login'), 2000);
          setIsLoading(false);
          return;
        }

        console.log('Session created successfully');
        console.log('User:', sessionData.user?.email);
        setIsValidToken(true);
        
        // Clear the URL parameters for security
        window.history.replaceState({}, document.title, '/reset-password');
        
      } catch (error) {
        console.error('Exception in handlePasswordReset:', error);
        toast.error('Error processing reset link. Please try again.');
        setTimeout(() => navigate('/auth?tab=login'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    handlePasswordReset();
  }, [navigate, searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        toast.error(error.message);
        return;
      }

      console.log('Password updated successfully');
      toast.success('Password updated successfully! You can now log in with your new password.');
      
      // Sign out the user to clear the reset session
      await supabase.auth.signOut();
      
      // Redirect to login
      navigate('/auth?tab=login');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An error occurred while resetting your password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gradient-to-br from-red-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Shield className="text-white h-10 w-10" />
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-4">
            Verifying Reset Link...
          </h2>
          <p className="text-center text-gray-600">
            Please wait while we verify your password reset link.
          </p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gradient-to-br from-red-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Shield className="text-white h-10 w-10" />
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-4">
            Invalid Reset Link
          </h2>
          <p className="text-center text-gray-600 mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/auth?tab=login')}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gradient-to-br from-red-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
          <Shield className="text-white h-10 w-10" />
        </div>
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-4">
          Reset Your Password
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Enter your new password below
        </p>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-2xl border border-gray-100">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-3">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  id="newPassword" 
                  type={showPassword ? "text" : "password"} 
                  className="pl-12 pr-12 h-14 border-gray-200 focus:border-red-400 focus:ring-red-400 rounded-xl" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter new password"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600" 
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-3">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  id="confirmPassword" 
                  type={showPassword ? "text" : "password"} 
                  className="pl-12 h-14 border-gray-200 focus:border-red-400 focus:ring-red-400 rounded-xl" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white h-14 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </Button>
            
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/auth?tab=login')}
                disabled={isSubmitting}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
