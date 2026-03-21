import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    console.error('AppErrorBoundary: Application error caught:', error);
    return { 
      hasError: true, 
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary: Detailed error info:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ errorInfo });
  }

  handleNavigateToDashboard = () => {
    // Navigate to dashboard and force reset
    this.setState({ hasError: false });
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 100);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert className="mb-4">
              <AlertDescription className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-[#E60023] mb-2">outercircl</h2>
                  <p className="text-gray-600 mb-4">
                    Something went wrong. We're working to fix this issue.
                  </p>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="text-left text-sm bg-gray-100 p-3 rounded mb-4">
                      <summary className="cursor-pointer font-medium">
                        Error Details (Development)
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs">
                        {this.state.error.message}
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={this.handleReset}
                      className="w-full bg-[#E60023] hover:bg-[#C50E1F]"
                    >
                      Try Again
                    </Button>
                    <Button 
                      onClick={this.handleNavigateToDashboard}
                      variant="outline"
                      className="w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}