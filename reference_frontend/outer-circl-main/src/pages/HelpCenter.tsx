
import React, { useState, useEffect } from 'react';
import UnifiedSEO from '@/components/UnifiedSEO';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembership } from '@/components/OptimizedProviders';
import Footer from '@/components/sections/Footer';
import { PageLoadingIndicator } from '@/components/ui/loading-indicator';
import { 
  HelpCenterHeader, 
  NavigationTab, 
  TerminologyTab, 
  AccountTab, 
  ContactSection 
} from '@/components/help';
import BreadcrumbSEO from '@/components/BreadcrumbSEO';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import FAQStructuredData from '@/components/seo/FAQStructuredData';
import { generateFAQSchema } from '@/utils/seoSchemas';
import { helpCenterFAQs } from '@/utils/seoHelpers';

const HelpCenter = () => {
  const { membershipTier } = useMembership();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading help content
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PageLoadingIndicator text="Loading help center..." />;
  }

  // Generate FAQ structured data
  const faqStructuredData = generateFAQSchema(helpCenterFAQs);

  return (
    <>
      {/* Enhanced SEO with FAQ structured data */}
      <FAQStructuredData faqs={helpCenterFAQs} title="Help Center - Frequently Asked Questions" />
      
      {/* Breadcrumb structured data */}
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: '/' },
        { name: 'Help Center', url: '/help' }
      ]} />
      
      <UnifiedSEO
        title="Help Center"
        description="Find answers to common questions about Outer Circle. Get help with navigation, account settings, terminology, and more."
        keywords="help center, FAQ, support, how to use outer circle, account help, navigation guide"
        canonicalUrl="https://outercircl.com/help"
      />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navbar isLoggedIn={true} />
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <BreadcrumbSEO className="mb-6" />
            <HelpCenterHeader />
            
            <Tabs defaultValue="navigation" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-white/80 backdrop-blur-sm border shadow-sm rounded-full p-1">
                  <TabsTrigger 
                    value="navigation" 
                    className="rounded-full data-[state=active]:bg-[#E60023] data-[state=active]:text-white font-medium"
                  >
                    Navigation
                  </TabsTrigger>
                  <TabsTrigger 
                    value="terminology" 
                    className="rounded-full data-[state=active]:bg-[#E60023] data-[state=active]:text-white font-medium"
                  >
                    Terminology
                  </TabsTrigger>
                  <TabsTrigger 
                    value="account" 
                    className="rounded-full data-[state=active]:bg-[#E60023] data-[state=active]:text-white font-medium"
                  >
                    Account
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="navigation" className="space-y-6 animate-fade-in">
                <NavigationTab />
              </TabsContent>
              
              <TabsContent value="terminology" className="space-y-6 animate-fade-in">
                <TerminologyTab />
              </TabsContent>
              
              <TabsContent value="account" className="space-y-6 animate-fade-in">
                <AccountTab />
              </TabsContent>
            </Tabs>
            
            <ContactSection />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default HelpCenter;
