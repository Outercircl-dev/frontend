import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EventFormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('EventForm Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Form Loading Error
            </h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the create activity form. This might be due to a temporary issue.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => this.setState({ hasError: false })}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => {
                  this.setState({ hasError: false });
                  setTimeout(() => window.location.href = '/dashboard', 100);
                }}
                className="w-full bg-[#E60023] hover:bg-[#D50C22] text-white"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}