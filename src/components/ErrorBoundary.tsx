"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar errores en componentes hijos
 * Muestra UI de fallback en lugar de pantalla blanca
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Callback opcional para logging externo
    this.props.onError?.(error, errorInfo);

    this.setState({
      hasError: error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Usar fallback personalizado si se proporciona
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
          <Card className="max-w-md w-full shadow-lg border-red-200 dark:border-red-900">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-800 dark:text-red-200">
                Algo salió mal
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                Ha ocurrido un error inesperado. No te preocupes, tus datos están seguros.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <details className="space-y-2">
                <summary className="cursor-pointer font-medium text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
                  Ver detalles técnicos
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                  {this.state.hasError.message}
                </pre>
              </details>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
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

export default ErrorBoundary;
