
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, MessageCircle, Settings, HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const FooterNav: React.FC = () => {
  const isMobile = useIsMobile();

  // Safe navigation with fallback
  let navigate;
  try {
    navigate = useNavigate();
  } catch (error) {
    console.warn('⚠️ Router context not available in FooterNav, using fallback');
    navigate = (path: string) => window.location.href = path;
  }

  const quickLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Calendar },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: '/profile', icon: Calendar },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const supportLinks = [
    { label: 'Help Center', path: '/help' },
    { label: 'Community Guidelines', path: '/community-guidelines' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
    { label: 'Terms of Service', path: '/terms-of-service' },
    { label: 'Contact Us', path: '/contact-us' },
  ];

  const companyLinks = [
    { label: 'About Us', path: '/about-us' },
    { label: 'The Buzz Newsletter', path: '/thebuzz' },
    { label: 'Membership', path: '/membership' },
  ];

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <div className="flex items-center mb-4">
              <Link to="/dashboard" className="flex items-center">
                {isMobile ? (
                  <img
                    src="/lovable-uploads/8f6f4c91-8281-45b1-b7e4-27b7b5358bb8.png"
                    alt="outercircl"
                    className="h-6 w-6"
                  />
                ) : (
                  <>
                    <img
                      src="/lovable-uploads/bb54d9cc-c97c-412f-959c-d981b768d807.png"
                      alt="outercircl"
                      className="h-8"
                    />
                    <span className="text-[0.5rem] ml-0.5">™</span>
                  </>
                )}
              </Link>
            </div>
            <Button
              onClick={() => navigate('/create-event')}
              className="bg-[#E60023] hover:bg-[#D50C22] text-white rounded-full"
            >
              Create
            </Button>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Access</h3>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center text-gray-600 hover:text-gray-900 text-sm py-1 transition-colors"
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <div className="space-y-2">
              {supportLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block text-gray-600 hover:text-gray-900 text-sm py-1 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="col-span-1">
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <div className="space-y-2">
              {companyLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block text-gray-600 hover:text-gray-900 text-sm py-1 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              ™ 2026 outercircl. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link to="/help" className="text-gray-500 hover:text-gray-700">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterNav;
