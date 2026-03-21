import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SafeSwitch as Switch } from '@/components/ui/SafeSwitch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Bell, Smartphone, UserMinus, Crown } from 'lucide-react';
import { useMembership, useLanguage, useAppContext } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';
import { measureAsyncOperation } from '@/utils/performance';
import { SettingsLoadingSkeleton, MembershipLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import NotificationPermissionCard from '@/components/settings/NotificationPermissionCard';

// Direct imports to prevent React initialization race conditions
import { AccountDeactivationModal } from '@/components/profile/AccountDeactivationModal';
import MembershipManagement from '@/components/membership/MembershipManagement';


const profileSchema = z.object({
  messagePrivacy: z.enum(['everyone', 'followers', 'nobody']),
  eventMessages: z.boolean(),
  pushNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  personalizationOpt: z.enum(['full', 'limited', 'minimal']),
  adPersonalization: z.boolean()
});

const Settings = () => {
  const navigate = useNavigate();
  const { membershipTier, region } = useMembership();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState('messaging');
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isPremium = useMemo(() => membershipTier === 'premium', [membershipTier]);

  // Initialize the form with defaults
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      messagePrivacy: 'everyone',
      eventMessages: true,
      pushNotifications: true,
      emailNotifications: true,
      personalizationOpt: 'full',
      adPersonalization: true
    },
  });

  // Phase 1: Auth redirect handled by AppBootstrap and parent routes
  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/settings');
    }
  }, [user, navigate]);

  // Optimized: Load settings for authenticated user
  const loadUserAndSettings = useCallback(async () => {
    if (!user) return;
    
    return measureAsyncOperation('Load Settings Data', async () => {
      setIsLoading(true);

      // Load privacy settings for the authenticated user
      const { data: settingsData } = await supabase
        .from('profile_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        // Batch form updates to prevent multiple re-renders
        form.reset({
          messagePrivacy: (settingsData.message_privacy as 'everyone' | 'followers' | 'nobody') || 'everyone',
          eventMessages: settingsData.event_messages ?? true,
          pushNotifications: settingsData.push_notifications ?? true,
          emailNotifications: settingsData.email_notifications ?? true,
          personalizationOpt: (settingsData.personalization_opt as 'full' | 'limited' | 'minimal') || 'full',
          adPersonalization: settingsData.ad_personalization ?? true
        });
      }
      setIsLoading(false);
    });
  }, [form]);

  useEffect(() => {
    loadUserAndSettings();
  }, [loadUserAndSettings]);


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      // Update privacy settings
      await updatePrivacySettings(values);
      
      toast.success(t('settings.saved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const updatePrivacySettings = useCallback(async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profile_privacy_settings')
      .upsert({
        user_id: user.id,
        profile_visibility: 'public',
        allow_friend_requests: true,
        message_privacy: values.messagePrivacy,
        email_notifications: values.emailNotifications,
        push_notifications: values.pushNotifications,
        event_messages: values.eventMessages,
        personalization_opt: values.personalizationOpt,
        ad_personalization: values.adPersonalization
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }
  }, [user]);

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center p-8">
      <MembershipLoadingSkeleton />
    </div>
  );

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading while settings are being fetched or role is loading
  if (isLoading) {
    return (
      <>
        <Navbar isLoggedIn={true} username={user.email?.split('@')[0] || "User"} />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">{t('nav.settings')}</h1>
          </div>
          <SettingsLoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar isLoggedIn={true} username={user.email?.split('@')[0] || "User"} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">{t('nav.settings')}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100">
              <TabsList className="h-14 w-full bg-transparent border-b rounded-none p-0 gap-x-6">
                <TabsTrigger 
                  value="messaging" 
                  className="h-14 px-4 data-[state=active]:border-b-2 data-[state=active]:border-[#E60023] rounded-none data-[state=active]:shadow-none"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Messaging & Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="app" 
                  className="h-14 px-4 data-[state=active]:border-b-2 data-[state=active]:border-[#E60023] rounded-none data-[state=active]:shadow-none"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  App Preferences
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="h-14 px-4 data-[state=active]:border-b-2 data-[state=active]:border-[#E60023] rounded-none data-[state=active]:shadow-none"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Account
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                  <TabsContent value="messaging" className="mt-0 p-0">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="messagePrivacy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Messaging Privacy</FormLabel>
                            <FormDescription className="text-sm text-gray-500 mb-2">
                              Control who can send you direct messages
                            </FormDescription>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-3"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="everyone" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Everyone</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="followers" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Followers and people I follow</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="nobody" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Nobody</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventMessages"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Activity Chat Messages</FormLabel>
                              <FormDescription>
                                Receive messages from activity participants and organizers
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#E60023]"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pushNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Push Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications about new activities and messages
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#E60023]"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive email updates about important activity
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-[#E60023]"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Browser Notification Permissions Card */}
                    <div className="mt-6">
                      <NotificationPermissionCard />
                    </div>
                  </TabsContent>

                  <TabsContent value="app" className="mt-0 p-0">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="personalizationOpt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Personalization</FormLabel>
                            <FormDescription className="text-sm text-gray-500 mb-2">
                              Control how we use your data to personalize your experience
                            </FormDescription>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-3"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="full" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Full personalization</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="limited" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Limited personalization</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="minimal" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Minimal personalization</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Enhanced Ad Experience Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">Ad Experience</h3>
                            <p className="text-sm text-gray-500">Customize your advertising preferences</p>
                          </div>
                          {isPremium && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full border border-yellow-200">
                              <Crown className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">Premium</span>
                            </div>
                          )}
                        </div>
                        
                        {isPremium ? (
                          // Premium users - clean, ad-free experience
                          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 p-6">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/20 to-orange-200/20 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-yellow-500 rounded-lg">
                                  <Crown className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-yellow-900">Ad-Free Experience</h4>
                                  <p className="text-sm text-yellow-700">Enjoy your activities without interruptions</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-yellow-800 bg-yellow-100/50 px-3 py-2 rounded-lg">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                No ads, no distractions - pure focus on what matters
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Standard users - enticing upgrade experience
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="adPersonalization"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
                                    <div className="p-4 border-b border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                          <FormLabel className="text-base font-medium">Personalized Ads</FormLabel>
                                          <FormDescription>
                                            See ads tailored to your interests and activity
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-[#E60023]"
                                          />
                                        </FormControl>
                                      </div>
                                    </div>
                                    
                                    {/* Premium Upgrade Call-to-Action */}
                                    <div className="relative p-4 bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 border-t-2 border-[#E60023]/20">
                                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#E60023]/10 to-[#D50C22]/10 rounded-full -mr-12 -mt-12"></div>
                                      <div className="relative">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 bg-[#E60023] rounded-lg flex-shrink-0">
                                            <Crown className="h-4 w-4 text-white" />
                                          </div>
                                          <div className="flex-1">
                                            <h4 className="font-semibold text-[#E60023] mb-1">
                                              🚀 Escape the Ads Forever
                                            </h4>
                                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                                              Join thousands who{"'"}ve upgraded to enjoy a completely ad-free experience. 
                                              Focus on what matters - finding amazing activities without any distractions.
                                            </p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                Zero ads, anywhere
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                Unlimited participants
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                Priority support
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                Premium features
                                              </div>
                                            </div>
                                            
                                            <Button 
                                              onClick={() => navigate('/membership')}
                                              className="w-full bg-gradient-to-r from-[#E60023] to-[#D50C22] hover:from-[#D50C22] hover:to-[#B91C1C] text-white shadow-lg hover:shadow-xl transition-all duration-200 group"
                                            >
                                              <Crown className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                                              Upgrade to Premium
                                              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                                                Ad-Free
                                              </span>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="mt-0 p-0">
                    <div className="space-y-6">
                      {/* Membership Management Section */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Membership Management
                        </h4>
                        <MembershipManagement />
                      </div>
                      
                      {/* Admin Section - Only visible to admins */}
                      {isAdmin && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <Crown className="h-4 w-4" />
                            Admin Tools
                          </h4>
                          <p className="text-sm text-blue-700 mb-4">
                            Access security monitoring, email testing, and system administration tools.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => navigate('/security-admin')}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            Open Security Admin
                          </Button>
                        </div>
                      )}
                      
                      {/* Account Deactivation Section */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                          <UserMinus className="h-4 w-4" />
                          Account Deactivation
                        </h4>
                        <p className="text-sm text-red-700 mb-4">
                          <strong>⚠️ WARNING: This action is PERMANENT.</strong> Deactivating your account will permanently disable access and cannot be recovered. All your data will become inaccessible forever.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeactivationModal(true)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Deactivate Account
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      className="bg-[#E60023] hover:bg-[#D50C22] text-white"
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Tabs>
        </div>
        
        {user && (
          <AccountDeactivationModal
            isOpen={showDeactivationModal}
            onClose={() => setShowDeactivationModal(false)}
            userId={user.id}
          />
        )}
      </div>
    </>
  );
};

export default Settings;
