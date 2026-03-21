
import React from 'react';
import { Separator } from '@/components/ui/separator';

const ContactSection = () => {
  return (
    <>
      <Separator className="my-8" />
      
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Still have questions?</h3>
        <p className="text-muted-foreground mb-4">
          Our support team is here to help you with any other questions or issues.
        </p>
        <div className="flex justify-center gap-4">
          <a 
            href="/contact-us" 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full text-sm font-medium text-white bg-[#E60023] hover:bg-[#D50C22]"
          >
            Contact Support
          </a>
          <a 
            href="/community-guidelines" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Community Guidelines
          </a>
        </div>
      </div>
    </>
  );
};

export default ContactSection;
