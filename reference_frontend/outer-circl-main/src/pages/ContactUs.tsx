import React from 'react';
import Navbar from '@/components/Navbar';
import UnifiedSEO from '@/components/UnifiedSEO';
import { Footer } from '@/components/sections';
import { Mail } from 'lucide-react';

const ContactUs: React.FC = () => {

  return (
    <>
      <UnifiedSEO
        title="Contact Us"
        description="Get in touch with the Outer Circle team. We're here to help with questions about activities, membership, or technical support."
        keywords="contact outer circle, customer support, help, questions, technical support"
        canonicalUrl="https://outercircl.com/contact-us"
      />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar isLoggedIn={false} />
        
        <main className="flex-1">
          <section className="py-12 md:py-16">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-[#E60023] mb-3">
                    Contact outercircl™
                  </h1>
                  <p className="text-gray-600 md:text-xl mb-4">
                    We'd love to hear from you! Please email us directly at:
                  </p>
                  <div className="bg-[#E60023] text-white px-6 py-3 rounded-lg inline-block mb-4">
                    <strong>info@outercircl.com</strong>
                  </div>
                  <p className="text-sm text-gray-500">
                    We're happy to help with any questions you may have!
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default ContactUs;
