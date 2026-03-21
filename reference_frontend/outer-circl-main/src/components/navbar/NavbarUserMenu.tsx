
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MailPlus, Settings, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/OptimizedProviders';
import { toast } from 'sonner';
import UserAvatar from '@/components/profile/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavbarUserMenuProps {
  isLoggedIn: boolean;
  username: string;
  avatarUrl?: string;
}

const NavbarUserMenu: React.FC<NavbarUserMenuProps> = ({
  isLoggedIn,
  username,
  avatarUrl
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      console.log('Logging out user...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        toast.error('Error logging out. Please try again.');
        return;
      }
      
      console.log('Logout successful');
      toast.success('Logged out successfully');
      
      // Navigate to home page after logout
      navigate('/');
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast.error('An unexpected error occurred during logout');
    }
  };

  if (!isLoggedIn) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="rounded-full flex items-center justify-center w-10 h-10 p-0 border-gray-200 hover:bg-gray-50"
          aria-label="User profile menu"
        >
          {(avatarUrl || (username && username !== 'User')) ? (
            <UserAvatar 
              name={username || 'User'}
              avatarUrl={avatarUrl}
              size="sm"
              className="w-8 h-8"
            />
          ) : (
            <User className="h-5 w-5 text-gray-600" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg rounded-xl py-2 border border-gray-200">
        <DropdownMenuItem asChild className="px-4 py-2.5 text-sm cursor-pointer">
          <Link to="/profile" className="flex items-center w-full">
            <div className="w-full">
              <p className="font-medium">Profile</p>
            </div>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/thebuzz')}>
          <MailPlus className="h-4 w-4 mr-2" />
          the buzz
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2 border-gray-100" />
        
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/help')}>
          Help Center
        </DropdownMenuItem>
        
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/privacy-policy')}>
          Privacy Policy
        </DropdownMenuItem>
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/community-guidelines')}>
          Community Guidelines
        </DropdownMenuItem>
        <DropdownMenuItem className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => navigate('/terms-of-service')}>
          Terms of Service
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2 border-gray-100" />
        
        <DropdownMenuItem 
          className="px-4 py-2 text-sm cursor-pointer text-[#E60023] hover:bg-gray-50"
          onClick={handleLogout}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavbarUserMenu;
