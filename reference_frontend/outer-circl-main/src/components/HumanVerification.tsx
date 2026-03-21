
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Shield, RefreshCw } from 'lucide-react';

interface HumanVerificationProps {
  onSuccess: () => void;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({ onSuccess }) => {
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Generate a random CAPTCHA code
  const generateCaptchaCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
  };

  // Initial CAPTCHA generation
  useEffect(() => {
    generateCaptchaCode();
  }, []);

  const handleVerify = () => {
    setIsVerifying(true);

    // Add a slight delay to simulate verification
    setTimeout(() => {
      if (userInput.toUpperCase() === captchaCode) {
        onSuccess();
      } else {
        setVerificationAttempts(prev => prev + 1);
        setUserInput('');
        generateCaptchaCode();
        setIsVerifying(false);
      }
    }, 1000);
  };

  // Get a fresh CAPTCHA
  const refreshCaptcha = () => {
    setUserInput('');
    generateCaptchaCode();
  };

  // Render the CAPTCHA in a visually distorted way
  const renderCaptcha = () => {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 p-4 rounded-md select-none relative">
          {/* Add some random lines for noise */}
          <svg width="200" height="60" className="absolute top-0 left-0 z-0" style={{ opacity: 0.5 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1={Math.random() * 200}
                y1={Math.random() * 60}
                x2={Math.random() * 200}
                y2={Math.random() * 60}
                stroke="#888"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="relative z-10">
            {captchaCode.split('').map((char, index) => (
              <span
                key={index}
                className="text-2xl font-bold inline-block mx-1"
                style={{
                  transform: `rotate(${Math.random() * 20 - 10}deg) translateY(${Math.random() * 6 - 3}px)`,
                  color: `hsl(${Math.random() * 360}, 70%, 40%)`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Determine if we need a more complex verification after multiple attempts
  const needsComplexVerification = verificationAttempts >= 2;

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-center">
        <Shield className="h-12 w-12 text-red-500 mr-3" />
        <div>
          <h4 className="text-lg font-medium">Human Verification</h4>
          <p className="text-sm text-muted-foreground">
            Please complete this verification to prove you're human
          </p>
        </div>
      </div>

      {renderCaptcha()}

      <div className="space-y-2">
        <Label htmlFor="verification-code">Enter the code shown above</Label>
        <div className="flex space-x-2">
          <Input
            id="verification-code"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter the code"
            className="flex-1"
            autoComplete="off"
            maxLength={6}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={refreshCaptcha}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {needsComplexVerification && (
        <div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm">
          Multiple verification attempts detected. Please ensure you're entering the correct code.
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-2">
        <Button
          type="button"
          variant="default"
          className="bg-red-500 hover:bg-red-600 text-white"
          onClick={handleVerify}
          disabled={userInput.length < 4 || isVerifying}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
