
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search } from 'lucide-react';

const NavigationTab = () => {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Search className="h-5 w-5 mr-2 text-[#E60023]" />
        Site Navigation
      </h2>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="dashboard">
          <AccordionTrigger>How do I navigate to the dashboard?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2">The dashboard is your main hub for finding activities. You can access it by:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Clicking the OuterCircl logo in the top-left corner</li>
              <li>Clicking "Explore" in the navigation menu</li>
              <li>Visiting the /dashboard route directly</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="profile">
          <AccordionTrigger>How do I view and edit my profile?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2">To access your profile:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Click your profile icon in the top-right corner of any page</li>
              <li>Select "View profile" from the dropdown menu</li>
              <li>Once on your profile page, you can edit your information by clicking "Edit Profile"</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="search">
          <AccordionTrigger>How do I search for activities or people?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2">You can search using the search icon in the navigation bar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click the search icon to open the search popover</li>
              <li>Type keywords related to activities or people you're looking for</li>
              <li>Use filters to narrow down your search results</li>
              <li>Results will update in real-time as you type</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="messages">
          <AccordionTrigger>How do I access my messages?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2">To view and send messages:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click the message icon in the top navigation bar</li>
              <li>You'll be taken to your messages page where you can see all conversations</li>
              <li>Click on any conversation to view and respond to messages</li>
              <li>To start a new conversation, you can message users directly from their profile</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="create-event">
          <AccordionTrigger>How do I create a new activity?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2">To create a new activity:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Click the "+" button in the navigation bar or find "Create Activity" in the dashboard</li>
              <li>Fill out the activity details including title, description, date, time, and location</li>
              <li>Add any additional information like maximum participants or required items</li>
              <li>Upload images to make your activity more appealing</li>
              <li>Click "Create Activity" to publish it</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default NavigationTab;
