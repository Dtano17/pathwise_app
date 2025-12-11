import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Trigger error haptic on native platforms
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Error }).catch(err =>
        console.warn('[Haptics] Failed to trigger error haptic:', err)
      );

      // Log to native console with more context
      console.error('[Mobile Error]', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        platform: Capacitor.getPlatform()
      });
    }

    // Log to error reporting service (e.g., Sentry) in production
    if (import.meta.env.PROD) {
      // TODO: Send to error reporting service
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
      });
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
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

            {/* Show platform info */}
            <div className="text-xs text-muted-foreground text-center">
              {Capacitor.isNativePlatform() ? (
                <p>Platform: {Capacitor.getPlatform()} • Native App</p>
              ) : (
                <p>Platform: Web Browser</p>
              )}
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-48 text-xs">
                <p className="font-mono text-destructive font-semibold mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-muted-foreground whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
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
