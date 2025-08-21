import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RenderingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Rendering Error Boundary caught an error:', error, errorInfo);
    
    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                内容渲染出错
              </h3>
              <p className="text-sm text-red-700 mb-4">
                渲染过程中发生错误，可能是由于内容格式问题。请检查内容格式或重试。
              </p>
              
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800 mb-2">
                    查看错误详情
                  </summary>
                  <pre className="text-xs bg-red-100 p-3 rounded border border-red-200 overflow-x-auto text-red-800">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </details>
              )}
              
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>重新渲染</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useRenderingErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    console.error('Rendering error:', error, errorInfo);
    
    // You can add error reporting here
    // reportError(error, errorInfo);
  }, []);

  return handleError;
}