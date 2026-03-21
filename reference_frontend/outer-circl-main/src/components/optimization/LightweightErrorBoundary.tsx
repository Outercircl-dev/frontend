import React from 'react';

interface LightweightErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Ultra-lightweight error boundary for critical path components
export class LightweightErrorBoundary extends React.Component<LightweightErrorBoundaryProps, State> {
  constructor(props: LightweightErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('LightweightErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Something went wrong</p>
        </div>
      );
    }

    return this.props.children;
  }
}