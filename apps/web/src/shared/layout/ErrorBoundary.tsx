// apps/web/src/components/ErrorBoundary.tsx
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { errorLogger } from "@/lib/utils/errorLogger";

type Props = { fallback?: ReactNode; children: ReactNode };
type State = { hasError: boolean; error?: Error; errorId?: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log error with context and return error ID
    errorLogger.logReactError(error, {
      componentStack: info.componentStack ?? '',
    });

    // Generate a simple error ID for user reference
    const errorId = `ERR-${Date.now().toString(36)}`;

    // Store error ID in state to show to user
    this.setState({ errorId });

    // Only log to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error", { error, info, errorId });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main role="main" aria-live="assertive" className="p-4">
            <h2>Something went wrong.</h2>
            <p>Please reload the page, or try again later.</p>
            {this.state.errorId && (
              <p className="text-sm text-gray-500 mt-2">
                Error ID: <code>{this.state.errorId}</code>
                <br />
                Please include this ID if contacting support.
              </p>
            )}
          </main>
        )
      );
    }
    return this.props.children;
  }
}
