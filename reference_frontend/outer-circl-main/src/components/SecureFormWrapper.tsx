import React, { useState, useEffect } from 'react';
import { validateInput, ClientRateLimit } from '@/utils/security';
import { useSecureForm } from '@/hooks/useSecureForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecureFormProps {
  onSubmit: (data: any) => Promise<void>;
  formType: 'contact' | 'profile' | 'message' | 'general';
  children?: React.ReactNode;
}

export const SecureFormWrapper: React.FC<SecureFormProps> = ({
  onSubmit,
  formType,
  children
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { 
    secureSubmit, 
    validateFileUpload, 
    isSubmitting, 
    isRateLimited 
  } = useSecureForm({
    rateLimitKey: `${formType}_form`,
    maxAttempts: formType === 'contact' ? 3 : 5,
    rateLimitWindowMs: 60 * 1000 // 1 minute
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: validateInput.sanitizeText(value)
    }));
    setError('');
  };

  const handleFileChange = (field: string, file: File) => {
    try {
      validateFileUpload(file, {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
      
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRateLimited()) {
      setError('Too many attempts. Please wait before trying again.');
      return;
    }

    try {
      await secureSubmit(formData, async (sanitizedData) => {
        await onSubmit(sanitizedData);
        setSuccess('Form submitted successfully!');
        setFormData({});
      });
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {children}

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};

// Example usage components
export const SecureContactForm: React.FC<{ onSubmit: (data: any) => Promise<void> }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  return (
    <SecureFormWrapper onSubmit={onSubmit} formType="contact">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          required
        />
      </div>
    </SecureFormWrapper>
  );
};