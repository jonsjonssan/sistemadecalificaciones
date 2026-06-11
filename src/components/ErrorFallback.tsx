"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { clientLogger } from "@/lib/logger-client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const name = this.props.componentName ?? "Unknown";
    clientLogger.error(`ErrorBoundary caught in ${name}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
          <Card className="max-w-md w-full shadow-lg border-status-error/20 border-status-error/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-status-error text-status-error/70" />
              </div>
              <CardTitle className="text-red-800 dark:text-red-200">
                Algo sali&oacute; mal
              </CardTitle>
              <CardDescription className="text-status-error text-status-error/70">
                Ha ocurrido un error inesperado. No te preocupes, tus datos est&aacute;n seguros.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <details className="space-y-2">
                <summary className="cursor-pointer font-medium text-red-700 text-status-error/70 hover:text-red-800 dark:hover:text-red-200">
                  Ver detalles t&eacute;cnicos
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-status-error-muted bg-status-error-muted p-3 text-xs text-status-error text-status-error/70 border border-status-error/20 border-status-error/30">
                  {this.state.hasError.message}
                </pre>
              </details>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
              <Button onClick={this.handleGoHome} className="flex-1 bg-red-600 hover:bg-red-700">
                <Home className="mr-2 h-4 w-4" />
                Ir al inicio
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { componentName?: string; fallback?: ReactNode }
): React.FC<P> {
  const displayName = options?.componentName ?? Component.displayName ?? Component.name ?? "Unknown";
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary componentName={displayName} fallback={options?.fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}

export default ErrorBoundary;
