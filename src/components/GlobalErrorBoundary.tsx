import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * Global Error Boundary for the entire application
 * Catches unhandled errors and provides user-friendly error recovery
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Global Error Boundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    this.setState({ errorInfo });
    
    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (optional)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would integrate with error tracking services like Sentry, LogRocket, etc.
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: this.getRelevantLocalStorage()
    };

    console.log('Error Report:', errorReport);
    
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, errorReport);
  };

  private getRelevantLocalStorage = () => {
    try {
      const relevantKeys = ['gemini-api-keys', 'selected-model', 'current-conversation'];
      const storage: Record<string, unknown> = {};
      
      relevantKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          // Sanitize sensitive data
          if (key === 'gemini-api-keys') {
            storage[key] = '[REDACTED]';
          } else {
            storage[key] = value;
          }
        }
      });
      
      return storage;
    } catch {
      return {};
    }
  };

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: ''
    });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-200 rounded-t-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 rounded-full p-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-red-800">
                    Something went wrong
                  </h1>
                  <p className="text-sm text-red-600 mt-1">
                    Error ID: {this.state.errorId}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. An unexpected error occurred while running the application. 
                The error has been logged and our team will investigate the issue.
              </p>

              {/* Error Details */}
              {this.state.error && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 flex items-center space-x-2">
                    <Bug className="h-4 w-4" />
                    <span>Show technical details</span>
                  </summary>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Error Message:</h4>
                      <p className="text-sm text-red-600 font-mono">{this.state.error.message}</p>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Stack Trace:</h4>
                        <pre className="text-xs bg-gray-100 p-3 rounded border overflow-x-auto text-gray-800 max-h-40 overflow-y-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Component Stack:</h4>
                        <pre className="text-xs bg-gray-100 p-3 rounded border overflow-x-auto text-gray-800 max-h-32 overflow-y-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Recovery Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Page</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg p-4">
              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please try refreshing the page or clearing your browser cache.
                For additional support, contact our team with the Error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for reporting errors manually from functional components
 */
export const useErrorReporter = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error('Manual error report:', { error, context });
    
    // Report to error tracking service
    // errorTrackingService.captureException(error, { context });
  }, []);

  return reportError;
};