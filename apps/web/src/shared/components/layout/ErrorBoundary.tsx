// apps/web/src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";

type Props = { fallback?: ReactNode; children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: send to your logger
    console.error("ErrorBoundary caught an error", { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main role="main" aria-live="assertive" className="p-4">
            <h2>Something went wrong.</h2>
            <p>Please reload the page, or try again later.</p>
          </main>
        )
      );
    }
    return this.props.children;
  }
}
