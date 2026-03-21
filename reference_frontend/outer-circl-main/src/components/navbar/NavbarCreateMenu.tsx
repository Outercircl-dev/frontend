
import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useLanguage } from '@/components/OptimizedProviders';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NavbarCreateMenu: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const quickActions = [
    { icon: Calendar, label: 'Create Activity', path: '/create-event' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white z-50">
        {quickActions.map((action) => (
          <DropdownMenuItem 
            key={action.path}
            onClick={() => navigate(action.path)}
            className="cursor-pointer"
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavbarCreateMenu;
