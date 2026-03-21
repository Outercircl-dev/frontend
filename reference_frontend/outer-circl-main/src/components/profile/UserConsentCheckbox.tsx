
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserConsentCheckboxProps {
  consentType: string;
  hasConsented: boolean;
  onConsentChange: (checked: boolean) => void;
}

const UserConsentCheckbox: React.FC<UserConsentCheckboxProps> = ({ 
  consentType, 
  hasConsented, 
  onConsentChange 
}) => {
  return (
    <div className="mt-5 w-full">
      <div className="bg-background border rounded-xl p-3 shadow-sm">
        <div className="flex items-start space-x-2">
          <div className="mt-0.5">
            <Checkbox 
              id="consent" 
              checked={hasConsented}
              onCheckedChange={onConsentChange}
              className="border-[#E60023]"
            />
          </div>
          <label htmlFor="consent" className="text-xs leading-tight cursor-pointer">
            <span className="flex items-center">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E60023] mr-1" />
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
    </div>
  );
};

export default UserConsentCheckbox;
