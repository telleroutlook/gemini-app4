import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    error: null,
    errorId: '',
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging with context
    const errorDetails = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        errorId: this.state.errorId,
      },
    };

    // Log to console for development
    console.group('🚨 React Error Boundary');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Full Context:', errorDetails);
    console.groupEnd();

    // Send error to monitoring service (implement your own)
    this.reportError(errorDetails);

    // Show user-friendly error message
    toast.error('Something went wrong! The error has been reported.', {
      duration: 8000,
      icon: '🚨',
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = async (errorDetails: any) => {
    try {
      // You can integrate with services like Sentry, LogRocket, or custom endpoint
      // Example implementation:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorDetails)
      // });
      
      // For now, just store locally for debugging
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(errorDetails);
      localStorage.setItem('app_errors', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));

      toast.success('Retrying...', { duration: 2000, icon: '🔄' });
    } else {
      toast.error('Max retries reached. Please refresh the page.', {
        duration: 10000,
        icon: '⚠️',
      });
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private getErrorDescription = (error: Error): string => {
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This might be due to a network issue or outdated cache.';
    }
    
    if (error.message.includes('Loading chunk')) {
      return 'Code splitting chunk failed to load. Try refreshing the page.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network connection issue detected. Please check your internet connection.';
    }
    
    if (error.message.includes('out of memory')) {
      return 'The application ran out of memory. Try closing other tabs and refreshing.';
    }

    return 'An unexpected error occurred in the application.';
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const errorDescription = this.getErrorDescription(this.state.error);

      return (
        <div className=\"min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8\">
          <div className=\"sm:mx-auto sm:w-full sm:max-w-md\">
            <div className=\"bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10\">
              <div className=\"text-center\">
                <div className=\"mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100\">
                  <AlertTriangle className=\"h-6 w-6 text-red-600\" />
                </div>
                
                <h2 className=\"mt-4 text-lg font-medium text-gray-900\">
                  Oops! Something went wrong
                </h2>
                
                <p className=\"mt-2 text-sm text-gray-600\">
                  {errorDescription}
                </p>
                
                <div className=\"mt-4 p-3 bg-gray-50 rounded-md text-left\">
                  <div className=\"flex items-start\">
                    <Bug className=\"h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0\" />
                    <div>
                      <p className=\"text-xs font-medium text-gray-900\">
                        Error Details:
                      </p>
                      <p className=\"text-xs text-gray-600 mt-1 font-mono break-all\">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      <p className=\"text-xs text-gray-500 mt-1\">
                        ID: {this.state.errorId}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className=\"mt-6 flex flex-col sm:flex-row gap-3 justify-center\">
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      className=\"inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
                    >
                      <RefreshCw className=\"h-4 w-4 mr-2\" />
                      Try Again ({this.maxRetries - this.state.retryCount} left)
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleRefresh}
                    className=\"inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
                  >
                    <RefreshCw className=\"h-4 w-4 mr-2\" />
                    Refresh Page
                  </button>
                </div>
                
                <div className=\"mt-4 pt-4 border-t border-gray-200\">
                  <p className=\"text-xs text-gray-500\">
                    If this problem persists, please contact support with Error ID: {this.state.errorId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}