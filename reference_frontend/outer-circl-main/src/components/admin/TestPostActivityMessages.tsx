import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  message?: string;
  event?: {
    id: string;
    title: string;
    date: string;
    location: string;
    host_name: string;
  };
  sent: number;
  failed: number;
  failures?: Array<{
    email: string;
    error: string;
  }>;
  error?: string;
}

export const TestPostActivityMessages: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [domainTestResult, setDomainTestResult] = useState<any>(null);
  const { toast } = useToast();

  const testDomains = async () => {
    setIsLoading(true);
    setDomainTestResult(null);

    try {
      console.log('🧪 Testing MailerSend domains...');
      
      const { data, error } = await supabase.functions.invoke('test-mailersend-simple', {
        body: {
          testEmail: 'christie.lau7@gmail.com'
        }
      });

      if (error) {
        console.error('❌ Domain test error:', error);
        toast({
          title: "Domain Test Failed",
          description: error.message || 'Failed to test domains',
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Domain test response:', data);
      setDomainTestResult(data);

      const successfulDomains = data.results?.filter((r: any) => r.status === 'success') || [];
      
      if (successfulDomains.length > 0) {
        toast({
          title: "Domain Test Complete",
          description: `Found ${successfulDomains.length} working domain(s)!`,
          variant: "default"
        });
      } else {
        toast({
          title: "Domain Issues Found",
          description: "No working domains found. Check results below.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Domain test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Failed to test domains',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSeptember19Tennis = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🎾 Testing September 19th tennis game post-activity messages...');
      
      // Call the edge function with the September 19th tennis game ID
      const { data, error } = await supabase.functions.invoke('send-post-activity-messages', {
        body: {
          eventId: '10cde423-a455-4a06-846a-ddd09ece9331',
          messageType: 'reliability_rating'
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        toast({
          title: "Test Failed",
          description: error.message || 'Failed to send messages',
          variant: "destructive"
        });
        setResult({ error: error.message, sent: 0, failed: 1 });
        return;
      }

      console.log('✅ Edge function response:', data);
      setResult(data);

      if (data.sent > 0) {
        toast({
          title: "Test Completed Successfully",
          description: `Successfully sent ${data.sent} messages, ${data.failed} failed`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Messages Sent",
          description: data.message || "No participants found or other issue occurred",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Failed to send messages',
        variant: "destructive"
      });
      setResult({ error: error.message, sent: 0, failed: 1 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>📧 Test MailerSend Post-Activity Messages</CardTitle>
        <CardDescription>
          Test sending reliability rating messages to participants of the September 19th tennis game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Test Details:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Event: Tennis game (September 19, 2025)</li>
            <li>• Event ID: 10cde423-a455-4a06-846a-ddd09ece9331</li>
            <li>• Message Type: Reliability Rating</li>
            <li>• Expected Participants: 2</li>
            <li>• Email Service: MailerSend (Transactional)</li>
            <li className="pt-2 font-semibold">• Rating Flow: Email → Event Page → Rating Interface</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 Domain Testing</h3>
          <p className="text-sm text-blue-800 mb-4">
            Test which sender domains are verified and working with your MailerSend account.
          </p>
          <div className="bg-orange-50 p-3 rounded border border-orange-200 mb-4">
            <p className="text-sm text-orange-800">
              <strong>⚠️ Note:</strong> Trial MailerSend accounts can only send emails to the administrator's email address. 
              To test with other recipients, upgrade your MailerSend plan.
            </p>
          </div>
          <Button 
            onClick={testDomains}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Testing Domains...
              </>
            ) : (
              '🔍 Test MailerSend Domains'
            )}
          </Button>
        </div>

        <Button 
          onClick={testSeptember19Tennis}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending Messages...
            </>
          ) : (
            '🎾 Send Post-Activity Messages'
          )}
        </Button>

        {result && (
          <div className="mt-6 space-y-4">
            {result.error ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-2">❌ Test Failed</h3>
                <p className="text-red-700">{result.error}</p>
                <div className="mt-2 text-sm text-red-600">
                  <p>Sent: {result.sent}</p>
                  <p>Failed: {result.failed}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">✅ Test Results</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-green-800">Event Details:</p>
                      <p className="text-green-700">Title: {result.event?.title || 'N/A'}</p>
                      <p className="text-green-700">Date: {result.event?.date ? new Date(result.event.date).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-green-700">Location: {result.event?.location || 'N/A'}</p>
                      <p className="text-green-700">Host: {result.event?.host_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Delivery Stats:</p>
                      <p className="text-green-700">Messages Sent: {result.sent}</p>
                      <p className="text-green-700">Failed: {result.failed}</p>
                      <p className="text-green-700">Success Rate: {result.sent + result.failed > 0 ? Math.round((result.sent / (result.sent + result.failed)) * 100) : 0}%</p>
                    </div>
                  </div>
                </div>

                {result.failures && result.failures.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-2">❌ Failed Deliveries</h3>
                    <div className="space-y-2">
                      {result.failures.map((failure, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium text-red-800">{failure.email}</p>
                          <p className="text-red-700">{failure.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">📊 Email Content</h3>
                  <p className="text-sm text-blue-800">
                    Participants received a reliability rating email with:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Personalized greeting with their name</li>
                    <li>• Event details and date</li>
                    <li>• Call-to-action to rate fellow participants</li>
                    <li>• Professional HTML template with branding</li>
                    <li>• Direct link to rating page: <code className="bg-white px-1 rounded">/event/10cde423-a455-4a06-846a-ddd09ece9331?action=rate</code></li>
                  </ul>
                  
                  <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">🔄 Expected User Journey:</h4>
                    <div className="text-xs text-blue-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
                        <span>User receives email with "Rate Participants" button</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                        <span>User clicks button → redirects to event page with rating interface</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
                        <span>User sees "Rate" tab with star rating system for each participant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">4</span>
                        <span>User submits ratings → success message → redirected to dashboard</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {domainTestResult && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">🔍 Domain Test Results</h3>
              
              <div className="space-y-3">
                <div className="text-sm">
                  <p><strong>Test Email:</strong> {domainTestResult.testEmail}</p>
                  <p><strong>API Connectivity:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      domainTestResult.apiConnectivity === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {domainTestResult.apiConnectivity}
                    </span>
                  </p>
                  <p><strong>Recommendation:</strong> 
                    <span className={`ml-2 ${
                      domainTestResult.recommendation.includes('TRIAL ACCOUNT LIMITATION') 
                        ? 'text-orange-800 font-semibold' 
                        : ''
                    }`}>
                      {domainTestResult.recommendation}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Domain Test Results:</h4>
                  {domainTestResult.results?.map((result: any, index: number) => (
                    <div key={index} className={`p-3 rounded border text-sm ${
                      result.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{result.sender}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      {result.error && (
                        <div className="mt-2 text-xs text-gray-600">
                          Error: {result.error.status} - {JSON.stringify(result.error.details)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {domainTestResult.domainInfo && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Verified Domains in MailerSend:</h4>
                    <pre className="text-xs text-blue-800 overflow-x-auto">
                      {JSON.stringify(domainTestResult.domainInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestPostActivityMessages;