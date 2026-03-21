import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

const NotificationPermissionCard: React.FC = () => {
  const { permission, isSupported, requestPermission, isInitialized } = useNotificationPermissions();

  if (!isSupported || !isInitialized) {
    return null;
  }

  const getStatusIcon = () => {
    switch (permission) {
      case 'granted':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'denied':
        return <X className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Browser notifications are enabled';
      case 'denied':
        return 'Browser notifications are blocked';
      default:
        return 'Browser notifications not set up';
    }
  };

  const getStatusDescription = () => {
    switch (permission) {
      case 'granted':
        return 'You\'ll receive push notifications for messages, events, and activity updates.';
      case 'denied':
        return 'To receive notifications, you\'ll need to enable them in your browser settings.';
      default:
        return 'Enable browser notifications to stay updated on messages and events even when the app is closed.';
    }
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <CardTitle className="text-lg">{getStatusText()}</CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {getStatusDescription()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {permission === 'default' && (
        <CardContent className="pt-0">
          <Button onClick={handleRequestPermission} variant="outline" className="w-full sm:w-auto">
            <Bell className="mr-2 h-4 w-4" />
            Enable Notifications
          </Button>
        </CardContent>
      )}

      {permission === 'denied' && (
        <CardContent className="pt-0">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>How to enable notifications:</strong>
            </p>
            <ol className="text-sm text-yellow-700 mt-1 space-y-1 pl-4">
              <li>1. Click the lock icon in your browser's address bar</li>
              <li>2. Set Notifications to "Allow"</li>
              <li>3. Refresh this page</li>
            </ol>
          </div>
        </CardContent>
      )}

      {permission === 'granted' && (
        <CardContent className="pt-0">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <Check className="h-4 w-4" />
              All set! You'll receive notifications when the app is closed.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default NotificationPermissionCard;