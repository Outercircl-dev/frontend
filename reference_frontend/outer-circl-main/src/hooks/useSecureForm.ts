import { useState, useEffect, useCallback } from 'react';
import { validateInput, formSecurity, ClientRateLimit } from '@/utils/security';

interface UseSecureFormOptions {
  rateLimitKey?: string;
  maxAttempts?: number;
  rateLimitWindowMs?: number;
  minSubmissionTimeMs?: number;
}

export const useSecureForm = (options: UseSecureFormOptions = {}) => {
  const {
    rateLimitKey = 'form_submission',
    maxAttempts = 5,
    rateLimitWindowMs = 60000,
    minSubmissionTimeMs = 1000
  } = options;

  const [formStartTime] = useState(Date.now());
  const [formToken] = useState(() => formSecurity.generateFormToken());
  const [rateLimit] = useState(() => new ClientRateLimit());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sanitize form data
  const sanitizeFormData = useCallback((data: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sanitized[key] = validateInput.sanitizeText(value);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }, []);

  // Validate submission
  const validateSubmission = useCallback((data: Record<string, any>) => {
    // Check rate limiting
    if (rateLimit.isRateLimited(rateLimitKey, maxAttempts, rateLimitWindowMs)) {
      throw new Error('Too many submission attempts. Please wait before trying again.');
    }

    // Check submission timing
    if (!formSecurity.validateSubmissionTiming(formStartTime, minSubmissionTimeMs)) {
      throw new Error('Form submitted too quickly. Please try again.');
    }

    // Validate email fields
    Object.entries(data).forEach(([key, value]) => {
      if (key.toLowerCase().includes('email') && typeof value === 'string') {
        if (!validateInput.isValidEmail(value)) {
          throw new Error(`Invalid email format for ${key}`);
        }
      }
    });

    return true;
  }, [rateLimit, rateLimitKey, maxAttempts, rateLimitWindowMs, formStartTime, minSubmissionTimeMs]);

  // Secure submit handler
  const secureSubmit = useCallback(async (
    data: Record<string, any>,
    submitFn: (sanitizedData: Record<string, any>) => Promise<any>
  ) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);

      // Validate submission
      validateSubmission(data);

      // Sanitize data
      const sanitizedData = sanitizeFormData(data);

      // Add form token for verification
      const dataWithToken = {
        ...sanitizedData,
        _formToken: formToken
      };

      // Execute submission
      const result = await submitFn(dataWithToken);
      
      // Reset rate limit on successful submission
      rateLimit.resetLimit(rateLimitKey);
      
      return result;
    } catch (error) {
      console.error('Secure form submission failed:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateSubmission, sanitizeFormData, formToken, rateLimit, rateLimitKey]);

  // File upload validation
  const validateFileUpload = useCallback((file: File, options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}) => {
    const {
      maxSizeMB = 10,
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    } = options;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    if (!validateInput.isValidFileSize(file, maxSizeMB)) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    return true;
  }, []);

  return {
    formToken,
    isSubmitting,
    secureSubmit,
    sanitizeFormData,
    validateSubmission,
    validateFileUpload,
    isRateLimited: (key: string = rateLimitKey) => 
      rateLimit.isRateLimited(key, maxAttempts, rateLimitWindowMs)
  };
};