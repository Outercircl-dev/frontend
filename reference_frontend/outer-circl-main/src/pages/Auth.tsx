import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Lock, Eye, EyeOff, RefreshCw, ShieldCheck, BellPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HumanVerification } from '@/components/HumanVerification';
import { Checkbox } from '@/components/ui/checkbox';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';
import { recordUserAgreements } from '@/utils/agreementStorage';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { useAuthRateLimit } from '@/hooks/useAuthRateLimit';
import { loginSchema, registerSchema, sanitizeText, validateEmail } from '@/utils/authValidation';
import MobileAuthWrapper from '@/components/MobileAuthWrapper';
import { safeLocalStorage } from '@/utils/safeStorage';
import { OUTERCIRCLE_DEFAULT_IMAGE } from '@/utils/defaultImages';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    region,
    consentType,
    membershipTier,
    updateMembershipTier
  } = useMembership();

  // PHASE 2 FIX: Remove automatic redirect from Auth page to prevent loops
  // Let the login/register handlers do the redirect instead
  const hasCheckedAuthRef = useRef(false);
  
  useEffect(() => {
    // Only log auth status, don't redirect automatically
    if (hasCheckedAuthRef.current) return;
    hasCheckedAuthRef.current = true;

    const checkAuthStatus = async () => {
      try {
        const cachedSessionStr = safeLocalStorage.getItem('sb-bommnpdpzmvqufurwwik-auth-token');
        if (cachedSessionStr) {
          try {
            const cachedData = JSON.parse(cachedSessionStr);
            const now = Math.floor(Date.now() / 1000);
            if (cachedData?.expires_at > now + 60) {
              console.log('🚦 AUTH PAGE: User already has valid session (but not auto-redirecting)');
              return;
            }
          } catch (e) {
            console.warn('⚠️ Failed to parse cached session on auth page');
          }
        }

        console.log('🚦 AUTH PAGE: No authenticated user, showing auth form');
      } catch (error) {
        console.error('🔐 Auth status check failed:', error);
      }
    };
    
    checkAuthStatus();
  }, []);

  // STEP 3: Mobile network status detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-assign users to standard membership during registration
  useEffect(() => {
    if (activeTab === 'register' && membershipTier === 'standard' && !searchParams.get('from-membership')) {
      console.log('Auto-assigning standard membership for new registration');
      updateMembershipTier('standard'); // Standard is now the default tier
    }
  }, [activeTab, membershipTier, updateMembershipTier, searchParams]);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    honeypot: '',
    ageConsent: false,
    termsConsent: false,
    privacyConsent: false,
    communityGuidelinesConsent: false,
    gdprConsent: false,
    newsletterSignup: false
  });

  // Human verification states
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registrationTime, setRegistrationTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Username validation
  const usernameValidation = useUsernameValidation(registerForm.username, 500);
  
  // Rate limiting
  const rateLimit = useAuthRateLimit();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register' || tab === 'login') {
      setActiveTab(tab);
    }
  }, [searchParams]);
  useEffect(() => {
    if (activeTab === 'register' && !registrationTime) {
      setRegistrationTime(Date.now());
    }
  }, [activeTab]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    if (!rateLimit.checkRateLimit()) {
      toast.error(`Too many login attempts. Please try again in ${rateLimit.getTimeUntilReset()} minutes.`);
      return;
    }
    
    // Validate with zod
    const validation = loginSchema.safeParse({
      email: loginForm.email,
      password: loginForm.password,
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError?.message || 'Invalid login credentials');
      return;
    }
    
    const { email, password } = validation.data;

    setIsSubmitting(true);
    rateLimit.recordAttempt();
    
    // Enhanced mobile detection
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
    );

    try {
      console.log('🔐 Starting login process...', { 
        isMobile, 
        windowWidth: window.innerWidth,
        userAgent: navigator.userAgent.substring(0, 50),
        isIncognito: !window.indexedDB
      });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🔐 Login error:', error);
        toast.error(error.message);
        return;
      }
      
      // Reset rate limit on successful login
      rateLimit.resetRateLimit();

      if (data.user && data.session) {
        console.log('🔐 Login successful for user:', data.user.id);
        toast.success('Login successful!');
        
        // Use React Router navigate to prevent full page reload
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        console.log('🔐 Redirecting to:', redirectUrl);
        
        // Add a small delay to ensure toast shows, then navigate
        setTimeout(() => {
          console.log('🔐 Executing redirect...');
          navigate(redirectUrl, { replace: true });
        }, 500);
      } else {
        console.error('🔐 Login successful but no user/session data');
        toast.error('Login failed - please try again');
      }
    } catch (error) {
      console.error('🔐 Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Check rate limit
    if (!rateLimit.checkRateLimit()) {
      toast.error(`Too many registration attempts. Please try again in ${rateLimit.getTimeUntilReset()} minutes.`);
      return;
    }
    
    if (registerForm.honeypot) {
      console.log('Bot detected via honeypot');
      toast.success('Registration successful! You can now log in');
      setActiveTab('login');
      return;
    }

    const timeElapsed = Date.now() - (registrationTime || 0);
    if (timeElapsed < 3000) {
      console.log('Suspiciously fast registration detected');
      setShowVerification(true);
      return;
    }

    if (!isHumanVerified) {
      setShowVerification(true);
      return;
    }

    // Validate with zod
    const validation = registerSchema.safeParse({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
      gender: registerForm.gender,
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError?.message || 'Please check your registration details');
      return;
    }
    
    const { username, email, password } = validation.data;

    if (!usernameValidation.isValid) {
      toast.error('Please choose a valid and available username - this is how others will find you!');
      return;
    }

    if (!registerForm.ageConsent) {
      toast.error('You must confirm you are 16 years of age or older');
      return;
    }

    if (!registerForm.termsConsent || !registerForm.privacyConsent || !registerForm.communityGuidelinesConsent) {
      toast.error('You must agree to our Terms of Service, Privacy Policy, and Community Guidelines');
      return;
    }
    
    if (!registerForm.gdprConsent) {
      toast.error('You must consent to the collection and processing of your personal data');
      return;
    }

    setIsSubmitting(true);
    rateLimit.recordAttempt();
    console.log('Starting registration process...');

    try {
      const redirectUrl = `${window.location.origin}/auth?registration=complete`;
      
      // Sanitize inputs before sending
      const sanitizedUsername = sanitizeText(username);
      const sanitizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: sanitizedUsername,
            name: sanitizedUsername,
          }
        }
      });

      console.log('Registration result:', { 
        user: data.user ? { id: data.user.id, email: data.user.email } : null, 
        session: data.session ? 'present' : 'null',
        error 
      });

      if (error) {
        console.error('Registration error:', error);
        toast.error(error.message);
        return;
      }

      if (data.user) {
        console.log('User created successfully, creating profile...');
        
        // Create profile record with profile_completed set to true and username
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: sanitizedUsername,
            email: sanitizedEmail,
            username: sanitizedUsername,
            avatar_url: OUTERCIRCLE_DEFAULT_IMAGE,
            gender: registerForm.gender,
            profile_completed: true
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't show error to user as signup was successful
        } else {
          console.log('Profile created successfully with headshot');
        }

        // Record user agreements for legal compliance
        const agreements = [];
        if (registerForm.termsConsent) agreements.push({ type: 'terms_of_service', version: '1.0' });
        if (registerForm.privacyConsent) agreements.push({ type: 'privacy_policy', version: '1.0' });
        if (registerForm.communityGuidelinesConsent) agreements.push({ type: 'community_guidelines', version: '1.0' });
        if (registerForm.gdprConsent) agreements.push({ type: 'data_processing', version: '1.0' });
        
        if (agreements.length > 0) {
          const agreementRecorded = await recordUserAgreements({
            userId: data.user.id,
            agreements
          });
          
          if (agreementRecorded) {
            console.log('User agreements recorded successfully');
          } else {
            console.warn('Failed to record some user agreements');
          }
        }

        if (registerForm.newsletterSignup) {
          safeLocalStorage.setItem("newsletterSubscribed", "true");
          safeLocalStorage.setItem("subscribedEmail", registerForm.email);
          safeLocalStorage.setItem("newsletterFrequency", "weekly");
        }

        // Check if we have a session immediately (auto-confirm enabled)
        if (data.session) {
          console.log('Session established immediately, redirecting...');
          toast.success('Registration successful! Welcome to outercircl.');
          
          setTimeout(() => {
            const redirectUrl = searchParams.get('redirect') || '/dashboard';
            console.log('Redirecting to:', redirectUrl);
            navigate(redirectUrl, { replace: true });
          }, 1500);
        } else {
          console.log('No immediate session, user needs email confirmation or will be auto-confirmed...');
          toast.success('Registration successful! You will be redirected shortly.');
          
          // Set up a more robust auth state listener
          let redirectTimeout: NodeJS.Timeout;
          let hasRedirected = false;
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, !!session);
            
            if (event === 'SIGNED_IN' && session && !hasRedirected) {
              console.log('User signed in via auto-confirmation');
              hasRedirected = true;
              subscription.unsubscribe();
              clearTimeout(redirectTimeout);
              
              const redirectUrl = searchParams.get('redirect') || '/dashboard';
              navigate(redirectUrl, { replace: true });
            }
          });
          
          // Fallback: check session status every second for up to 10 seconds
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkSessionInterval = setInterval(async () => {
            attempts++;
            
            try {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              
              if (currentSession && !hasRedirected) {
                console.log('Session found via polling, redirecting...');
                hasRedirected = true;
                subscription.unsubscribe();
                clearInterval(checkSessionInterval);
                clearTimeout(redirectTimeout);
                
                const redirectUrl = searchParams.get('redirect') || '/dashboard';
                navigate(redirectUrl, { replace: true });
                return;
              }
              
              if (attempts >= maxAttempts) {
                console.log('Max attempts reached, cleaning up...');
                clearInterval(checkSessionInterval);
                subscription.unsubscribe();
                
                if (!hasRedirected) {
                  // If no session after 10 seconds, redirect to login with message
                  console.log('No session established, redirecting to login');
                  toast.info('Please check your email to confirm your account, then log in.');
                  setActiveTab('login');
                }
              }
            } catch (error) {
              console.error('Error checking session:', error);
            }
          }, 1000);
          
          // Ultimate fallback timeout
          redirectTimeout = setTimeout(() => {
            if (!hasRedirected) {
              console.log('Ultimate timeout reached, redirecting to login');
              subscription.unsubscribe();
              clearInterval(checkSessionInterval);
              toast.info('Registration completed. Please log in to continue.');
              setActiveTab('login');
            }
          }, 15000);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };
  const updateLoginForm = (field: string, value: string) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const updateRegisterForm = (field: string, value: any) => {
    setRegisterForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleVerificationSuccess = () => {
    setIsHumanVerified(true);
    setShowVerification(false);
    toast.success('Verification successful! You can now complete registration.');
  };
  const getConsentLabel = () => {
    if (consentType === 'gdpr') {
      return "I consent to the processing of my personal data according to GDPR";
    } else if (consentType === 'ccpa') {
      return "I consent to the collection and use of my information according to CCPA";
    } else {
      return "I consent to the collection and use of my information";
    }
  };

  // Display the selected membership plan at the top of the registration form
  const getMembershipPlanName = () => {
    switch(membershipTier) {
      case 'premium':
        return 'Premium';
      case 'standard':
      default:
        return 'Standard';
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Forgot password clicked - opening modal');
    setShowForgotPassword(true);
  };

  // Enhanced mobile detection for UI adjustments
  const isMobileDevice = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
  );

  return (
    <MobileAuthWrapper>
      {/* STEP 3: Network status banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-50 border-b border-red-200 p-2 text-center z-50">
          <p className="text-sm text-red-600">📴 You're offline. Connect to the internet to continue.</p>
        </div>
      )}
      
      <div className={`flex min-h-screen items-center justify-center bg-white ${isMobileDevice ? 'px-2 py-4' : 'px-4 py-12'} ${!isOnline ? 'pt-16' : ''}`}>
      <div className={`w-full ${isMobileDevice ? 'max-w-sm' : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <div className="bg-red-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to outercircl</h1>
          <p className="text-muted-foreground mt-2">Share your activities and find someone to share it with in your area</p>
          
          {searchParams.get('from-membership') && membershipTier === 'premium' && (
            <div className="mt-4 py-2 px-4 bg-red-50 rounded-full border border-red-100 inline-flex items-center">
              <span className="text-sm font-medium text-red-500">Selected plan: {getMembershipPlanName()}</span>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 h-14 rounded-none bg-muted/10">
              <TabsTrigger value="login" className="rounded-none data-[state=active]:bg-background">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-none data-[state=active]:bg-background">
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="p-6">
              <form onSubmit={handleLoginSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="email" 
                        placeholder="your@email.com" 
                        type="email" 
                        className="pl-10" 
                        value={loginForm.email} 
                        onChange={e => updateLoginForm('email', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={handleForgotPasswordClick}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10" 
                        value={loginForm.password} 
                        onChange={e => updateLoginForm('password', e.target.value)}
                        disabled={isSubmitting}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-10 w-10 text-muted-foreground" 
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    disabled={isSubmitting || !isOnline}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {!isOnline ? 'Waiting for connection...' : 'Logging in...'}
                      </>
                    ) : !isOnline ? 'Offline - Connect to Login' : 'Login'}
                  </Button>
                  
                  {/* MOBILE FIX: Help text for connection issues */}
                  {(isSubmitting || !isOnline) && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-center text-xs text-gray-600">
                      {!isOnline ? (
                        <>
                          <p className="text-red-500 font-medium">📴 You're offline</p>
                          <p className="mt-1">Connect to the internet to continue</p>
                        </>
                      ) : (
                        <>
                          <p>Taking longer than usual?</p>
                          <p className="mt-1">Check your internet connection</p>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Don't have an account?{" "}
                    <Link to="/membership" className="text-red-500 hover:underline">
                      Choose a plan and register
                    </Link>
                  </p>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="p-6">
              <form onSubmit={handleRegisterSubmit}>
                <div className="space-y-4">
                  {/* Important Username Notice */}
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-red-600 mr-2" />
                      <p className="text-sm font-medium text-red-800">
                        Your username is your unique identity on outercircl - choose carefully as it cannot be changed later!
                      </p>
                    </div>
                  </div>

                  {membershipTier === 'premium' && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100 text-center">
                      <h3 className="text-sm font-medium text-red-800">Selected plan: {getMembershipPlanName()}</h3>
                      <p className="text-xs text-red-600 mt-1">You'll have access to all {getMembershipPlanName()} features</p>
                    </div>
                  )}

                  {/* Username Setup - Primary Requirement */}
                  <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center mb-2">
                      <User className="h-5 w-5 text-red-500 mr-2" />
                      <h3 className="font-semibold text-red-800">Step 1: Choose Your Username</h3>
                    </div>
                    <p className="text-sm text-red-600 mb-3">
                      Your username is how others will find and recognize you on outercircl. Choose wisely!
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-red-700 font-medium">Username *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="username" 
                          placeholder="johndoe" 
                          className={`pl-10 ${
                            registerForm.username && !usernameValidation.isValid 
                              ? 'border-red-300 focus:border-red-500' 
                              : registerForm.username && usernameValidation.isValid 
                              ? 'border-green-300 focus:border-green-500'
                              : ''
                          }`}
                          value={registerForm.username} 
                          onChange={e => updateRegisterForm('username', e.target.value)}
                          disabled={isSubmitting}
                        />
                        {usernameValidation.isChecking && (
                          <RefreshCw className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground animate-spin" />
                        )}
                      </div>
                      {registerForm.username && usernameValidation.error && (
                        <p className="text-sm text-red-600">{usernameValidation.error}</p>
                      )}
                      {registerForm.username && usernameValidation.isValid && (
                        <p className="text-sm text-green-600">✓ Username available</p>
                      )}
                      {usernameValidation.suggestions.length > 0 && (
                        <div className="text-sm">
                          <p className="text-gray-600 mb-1">Suggestions:</p>
                          <div className="flex flex-wrap gap-1">
                            {usernameValidation.suggestions.slice(0, 3).map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => updateRegisterForm('username', suggestion)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                   
                  {/* Account Details - Step 2 */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center mb-2">
                      <Mail className="h-5 w-5 text-red-500 mr-2" />
                      <h3 className="font-medium text-red-700">Step 2: Account Details</h3>
                    </div>
                    <div className="mb-3 p-3 bg-muted/50 rounded-md border border-border">
                      <p className="text-sm text-muted-foreground">
                        📸 Your profile will use the default outercircl logo. You can add a custom photo after registration from your profile settings.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="email" 
                          placeholder="your@email.com" 
                          type="email" 
                          className="pl-10" 
                          value={registerForm.email} 
                          onChange={e => updateRegisterForm('email', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          className="pl-10 pr-10" 
                          value={registerForm.password} 
                          onChange={e => updateRegisterForm('password', e.target.value)}
                          disabled={isSubmitting}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-10 w-10 text-muted-foreground" 
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                        >
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </Button>
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="confirmPassword">Confirm Password *</Label>
                     <div className="relative">
                       <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                       <Input 
                         id="confirmPassword" 
                         type={showPassword ? "text" : "password"} 
                         className="pl-10" 
                         value={registerForm.confirmPassword} 
                         onChange={e => updateRegisterForm('confirmPassword', e.target.value)}
                         disabled={isSubmitting}
                       />
                      </div>
                    </div>
                    
                    {/* Gender Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={registerForm.gender} onValueChange={(value) => updateRegisterForm('gender', value)} disabled={isSubmitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Age consent checkbox */}
                  <div className="flex items-start space-x-2 mt-4">
                    <Checkbox 
                      id="age-consent" 
                      checked={registerForm.ageConsent} 
                      onCheckedChange={checked => {
                        updateRegisterForm('ageConsent', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="age-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I confirm that I am 16 years of age or older
                      </label>
                    </div>
                  </div>

                  {/* Newsletter signup checkbox */}
                  <div className="flex items-start space-x-2 mt-2 bg-[#FFF8E7] p-3 rounded-xl border border-[#FFE4B0]">
                    <Checkbox 
                      id="newsletter-signup" 
                      checked={registerForm.newsletterSignup} 
                      onCheckedChange={checked => {
                        updateRegisterForm('newsletterSignup', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="newsletter-signup" className="text-sm font-medium leading-none flex items-center">
                        <BellPlus className="h-3.5 w-3.5 text-[#E60023] mr-1" />
                        Subscribe to the outercircl buzz newsletter
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Get weekly updates on the best events in your area
                      </p>
                    </div>
                  </div>

                  {/* Terms of Service consent checkbox */}
                  <div className="flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="terms-consent" 
                      checked={registerForm.termsConsent} 
                      onCheckedChange={checked => {
                        updateRegisterForm('termsConsent', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="terms-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I agree to outercircl's{" "}
                        <Link to="/terms-of-service" className="text-[#E60023] hover:underline" target="_blank">
                          Terms of Service
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* Privacy Policy consent checkbox */}
                  <div className="flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="privacy-consent" 
                      checked={registerForm.privacyConsent} 
                      onCheckedChange={checked => {
                        updateRegisterForm('privacyConsent', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="privacy-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I have read and agree to the{" "}
                        <Link to="/privacy-policy" className="text-[#E60023] hover:underline" target="_blank">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* Community Guidelines consent checkbox */}
                  <div className="flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="guidelines-consent" 
                      checked={registerForm.communityGuidelinesConsent} 
                      onCheckedChange={checked => {
                        updateRegisterForm('communityGuidelinesConsent', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="guidelines-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I agree to follow the{" "}
                        <Link to="/community-guidelines" className="text-[#E60023] hover:underline" target="_blank">
                          Community Guidelines
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* Add GDPR consent checkbox */}
                  <div className="flex items-start space-x-2 mt-2 bg-[#FFECEE] p-3 rounded-xl border border-[#FFCFD4]">
                    <Checkbox 
                      id="gdpr-consent" 
                      checked={registerForm.gdprConsent} 
                      onCheckedChange={checked => {
                        updateRegisterForm('gdprConsent', checked === true);
                      }} 
                      className="mt-1 border-[#E60023] data-[state=checked]:bg-[#E60023] data-[state=checked]:text-white"
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="gdpr-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <span className="flex items-start">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#E60023] mr-1 mt-0.5" />
                          <span>
                            I consent to the collection and processing of my personal data in accordance with GDPR regulations for EU/UK users.
                            <Link to="/terms-of-service" className="text-[#E60023] hover:underline ml-1">Terms of Service</Link>,
                            <Link to="/privacy-policy" className="text-[#E60023] hover:underline ml-1">Privacy Policy</Link>, and
                            <Link to="/community-guidelines" className="text-[#E60023] hover:underline ml-1">Community Guidelines</Link>
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <input 
                    type="text" 
                    style={{ display: 'none' }} 
                    tabIndex={-1} 
                    autoComplete="off" 
                    value={registerForm.honeypot} 
                    onChange={e => updateRegisterForm('honeypot', e.target.value)} 
                  />
                  
                  {isHumanVerified ? (
                    <div className="flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-md">
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      <p className="text-sm">Human verification completed</p>
                    </div>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center justify-center" 
                      onClick={() => setShowVerification(true)}
                      disabled={isSubmitting}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify you're human
                    </Button>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-500 hover:bg-red-600 text-white" 
                    disabled={!isHumanVerified || isSubmitting || !usernameValidation.isValid || usernameValidation.isChecking}
                  >
                    {isSubmitting ? 'Creating Account...' : 'Register'}
                  </Button>
                  
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{" "}
                    <Link 
                      to="/auth?tab=login" 
                      className="text-red-500 hover:underline" 
                      onClick={e => {
                        e.preventDefault();
                        setActiveTab("login");
                      }}
                    >
                      Login
                    </Link>
                  </p>

                  {membershipTier === 'standard' && searchParams.get('from-membership') !== 'true' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                      <Link to="/membership" className="text-red-500 hover:underline block">
                        Want premium features? View membership options
                      </Link>
                    </div>
                  )}
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* MOBILE FIX: Network status indicator */}
      {!navigator.onLine && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 text-center shadow-lg z-50">
          <p className="text-sm text-red-600 font-medium">📴 You're offline</p>
          <p className="text-xs text-red-500 mt-1">Please check your internet connection</p>
        </div>
      )}

      <Dialog open={showVerification} onOpenChange={setShowVerification}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify You're Human</DialogTitle>
          </DialogHeader>
          <HumanVerification onSuccess={handleVerificationSuccess} />
        </DialogContent>
      </Dialog>

      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
      </div>
    </MobileAuthWrapper>
  );
};

export default Auth;
