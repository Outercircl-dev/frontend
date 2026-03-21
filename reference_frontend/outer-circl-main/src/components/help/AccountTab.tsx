
import React from 'react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PremiumBenefitCard from './PremiumBenefitCard';
import { Crown, Shield } from 'lucide-react';

const AccountTab = () => {
  const premiumBenefits = [
    {
      title: "Enhanced Experience",
      description: "Enjoy an enhanced experience with additional features and capabilities."
    },
    {
      title: "Reliability Ratings",
      description: "View reliability ratings of other members to make informed decisions."
    },
    {
      title: "Upcoming Friend Activities",
      description: "See all upcoming activities your friends are attending."
    },
    {
      title: "Advanced Activity Filters",
      description: "Access exclusive filtering options to find the perfect activities."
    },
    {
      title: "Early Access to Features",
      description: "Be the first to try new features before they're widely available."
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border p-8 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#E60023]/10 mb-4">
          <Crown className="h-6 w-6 text-[#E60023]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Account & Premium Benefits</h2>
        <p className="text-gray-600">Everything you need to know about your account</p>
      </div>
      
      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="premium-benefits" className="border rounded-2xl px-6 bg-white shadow-sm">
          <AccordionTrigger className="font-semibold text-lg hover:no-underline">
            <div className="flex items-center">
              <Crown className="h-5 w-5 mr-3 text-[#E60023]" /> 
              What are the benefits of premium membership?
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {premiumBenefits.map((benefit, index) => (
                <PremiumBenefitCard
                  key={index}
                  title={benefit.title}
                  description={benefit.description}
                />
              ))}
            </div>
            <div className="text-center">
              <Link to="/membership" className="inline-flex items-center px-6 py-3 rounded-full bg-[#E60023] hover:bg-[#D50C22] text-white font-medium transition-colors duration-300 shadow-lg hover:shadow-xl">
                Explore Membership Options
              </Link>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="account-tiers" className="border rounded-2xl px-6 bg-white shadow-sm">
          <AccordionTrigger className="font-semibold hover:no-underline">What are the different membership tiers?</AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="mb-2">OuterCircl offers several membership options:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Standard:</strong> Basic access including creating activities with up to 4 participants</li>
              <li><strong>Premium:</strong> Enhanced experience with additional features like viewing reliability ratings and unlimited participants</li>
            </ul>
            <p className="mt-2">You can upgrade your membership at any time from the Membership page.</p>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="privacy" className="border rounded-2xl px-6 bg-white shadow-sm">
          <AccordionTrigger className="font-semibold hover:no-underline">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-3 text-[#E60023]" />
              How is my privacy protected?
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="mb-2">We take privacy seriously at OuterCircl:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your personal information is only shared according to your privacy settings</li>
              <li>You control who can see your profile and contact you</li>
              <li>Activity locations can be made private until users RSVP</li>
              <li>We comply with GDPR and CCPA regulations</li>
              <li>You can review our complete Privacy Policy for more details</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="deactivate" className="border rounded-2xl px-6 bg-white shadow-sm">
          <AccordionTrigger className="font-semibold hover:no-underline">How do I deactivate my account?</AccordionTrigger>
          <AccordionContent className="pt-4">
            <p className="mb-2">To deactivate your account:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to Settings by clicking your profile icon and selecting "Settings"</li>
              <li>Scroll to the bottom and find "Account Management"</li>
              <li>Click "Deactivate Account"</li>
              <li>Follow the prompts to confirm deactivation</li>
            </ol>
            <p className="mt-2 text-sm text-muted-foreground">Note: Deactivating your account does not immediately delete your data. It will be retained for 30 days in case you change your mind.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AccountTab;
