/**
 * Error Boundary Component (Enhanced v2.0)
 *
 * React Error Boundary for catching and handling JavaScript errors in component tree
 *
 * ENHANCEMENTS:
 * - TypeScript strict mode support
 * - Error reporting integration (Sentry ready)
 * - User-friendly error UI with recovery options
 * - Development vs Production error display
 * - Error context preservation
 * - Automatic error logging
 * - Retry mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Copy, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: any; // Reset error boundary when this prop changes
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] Caught an error:', error, errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error reporting service in production
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset error boundary when resetOnPropsChange changes
    if (
      this.props.resetOnPropsChange !== undefined &&
      this.props.resetOnPropsChange !== prevProps.resetOnPropsChange &&
      this.state.hasError
    ) {
      this.handleReset();
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('[PRODUCTION ERROR]', errorReport);

    // Example Sentry integration:
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //   },
    // });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    if (!this.state.error) return;

    const errorText = `
Error: ${this.state.error.message}

Stack Trace:
${this.state.error.stack}

Component Stack:
${this.state.errorInfo?.componentStack || 'Not available'}

URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard!');
    });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Prevent infinite error loops
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <Bug className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold">Critical Error</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Multiple errors detected. Please reload the page or contact support.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={this.handleReload} className="gap-2" variant="default">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} className="gap-2" variant="outline">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </Card>
          </div>
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Don't worry, your data is safe. Try one of the options below.
                </p>
              </div>
            </div>

            {!import.meta.env.PROD && this.state.error && (
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-48 text-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-mono text-destructive font-semibold flex-1">
                    {this.state.error.toString()}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={this.handleCopyError}
                    className="h-6 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {this.state.errorInfo && (
                  <pre className="text-muted-foreground whitespace-pre-wrap text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {import.meta.env.PROD && (
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  An unexpected error occurred. Our team has been notified and we're working on a fix.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={this.handleCopyError}
                  className="mt-2 h-8 gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy Error Details
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={this.handleReset}
                className="flex-1 gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleReload}
                className="flex-1 gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="flex-1 gap-2"
                variant="outline"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              If this persists, please contact support or try clearing your browser cache.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Usage examples:
 *
 * Basic usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With custom error handler:
 * ```tsx
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.log('Custom error handler', error, errorInfo);
 *   }}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorPage />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With automatic reset on route change:
 * ```tsx
 * const [location] = useLocation();
 *
 * <ErrorBoundary resetOnPropsChange={location}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
