'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { VercelErrorHandler } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our error handler
    VercelErrorHandler.logError(error, 'REACT_ERROR_BOUNDARY');
    
    this.setState({
      error,
      errorInfo
    });

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorResponse = VercelErrorHandler.createErrorResponse(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries && errorResponse.error.retryable;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600">
                {errorResponse.error.message}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {errorResponse.error.code && (
                <div className="rounded-md bg-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-700">Error Code:</p>
                  <p className="text-sm text-gray-600">{errorResponse.error.code}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 rounded-md bg-gray-100 p-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const handleError = (error: Error) => {
    VercelErrorHandler.logError(error, 'ASYNC_ERROR');
    
    // In a real app, you might want to show a toast notification
    // or update some global error state
    throw error; // Re-throw to trigger error boundary
  };

  return { handleError };
}