import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    this.setState({ errorInfo });

    // Log to error reporting service (Sentry, etc.) in production
    if (process.env.NODE_ENV === 'production') {
      // Error tracking service integration can be added here when ready
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    // @ts-expect-error TS(2339): Property 'hasError' does not exist on type 'Readon... Remove this comment to see the full error message
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-slate-600 text-lg">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            // @ts-expect-error TS(2339): Property 'error' does not exist on type 'Readonly<... Remove this comment to see the full error message
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <summary className="cursor-pointer font-semibold text-red-900 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="text-sm text-red-800 font-mono">
                  // @ts-expect-error TS(2339): Property 'error' does not exist on type 'Readonly<... Remove this comment to see the full error message
                  <p className="font-bold mb-2">{this.state.error.toString()}</p>
                  <pre className="whitespace-pre-wrap text-xs">
                    // @ts-expect-error TS(2339): Property 'errorInfo' does not exist on type 'Reado... Remove this comment to see the full error message
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/shop'}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors focus:ring-4 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    // @ts-expect-error TS(2339): Property 'children' does not exist on type 'Readon... Remove this comment to see the full error message
    return this.props.children;
  }
}

export default ErrorBoundary;