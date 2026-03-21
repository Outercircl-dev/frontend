
import React from 'react';
import { Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return <footer className="bg-gray-50 text-gray-700 py-12">
    <div className="container">
      <div className="flex flex-col md:flex-row justify-between mb-8 gap-8">
        <div className="mb-8 md:mb-0">
          <div className="flex items-center gap-2 mb-4">
            <img
              src="/lovable-uploads/bb54d9cc-c97c-412f-959c-d981b768d807.png"
              alt="outercircl"
              className="h-8"
            />
            <span className="text-[0.5rem]">™</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about-us" className="text-gray-500 hover:text-brand-purple">About Us</Link></li>
              <li><Link to="/privacy-policy" className="text-gray-500 hover:text-brand-purple">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-gray-500 hover:text-brand-purple">Terms of Service</Link></li>
              <li><Link to="/contact-us" className="text-gray-500 hover:text-brand-purple">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/community-guidelines" className="text-gray-500 hover:text-brand-purple">Community Guidelines</Link></li>
              <li><Link to="/help" className="text-gray-500 hover:text-brand-purple">Help Center</Link></li>
              <li><Link to="/thebuzz" className="text-gray-500 hover:text-brand-purple">the buzz</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Follow Us</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://www.tiktok.com/@outercircl" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand-purple flex items-center gap-1">
                  <img src="/lovable-uploads/4bdc490c-09ce-40a1-92fc-3a8331a3fc90.png" alt="TikTok" className="h-4 w-4 object-contain" />
                  TikTok
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/outercircl/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand-purple flex items-center gap-1">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8 text-gray-500 text-sm text-center">
        <p>&copy; 2026 outercircl<span className="text-[0.5rem] align-top">™</span>. All rights reserved.</p>
      </div>
    </div>
  </footer>;
};
export default Footer;
