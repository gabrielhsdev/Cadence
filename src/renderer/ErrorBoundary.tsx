import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it and shows a recoverable fallback
 * instead of a blank window. (Note: React error boundaries do not catch errors
 * thrown in async event handlers — those still reject their own promises; this
 * guards the render tree.)
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[renderer] uncaught error:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="empty-state" style={{ maxWidth: 480, margin: '80px auto' }}>
        <h3>Something went wrong</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          The app hit an unexpected error and stopped rendering this view.
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-word' }}>
          {this.state.error.message}
        </p>
        <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
