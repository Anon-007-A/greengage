import React from 'react';
import { logger } from '@/lib/logger';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log error with production-safe logger
    try {
      logger.error('ErrorBoundary caught error:', error?.message || error, info);
    } catch (e) {
      // fallback: swallow
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded">
          <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          <p className="text-sm text-red-700 mt-2">An unexpected error occurred while rendering this section.</p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm"
            >
              Reload
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(this.state.error))}
              className="px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded text-sm"
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
