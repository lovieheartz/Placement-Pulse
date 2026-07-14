import React from 'react';

/**
 * Catches any render-time crash and shows a readable message instead of a blank
 * white page. Without this, one bad property access (e.g. reading .label off an
 * undefined lookup) unmounts the whole React tree and the user just sees white.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render crash caught by ErrorBoundary:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl">
          <h1 className="text-lg font-bold text-foreground">Something broke on this page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The page hit an unexpected error. This is usually a stale backend — restart the server
            and reload. The details below help pin it down.
          </p>

          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-destructive whitespace-pre-wrap">
            {String(error?.message || error)}
          </pre>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Reload page
            </button>
            <button
              onClick={() => { this.setState({ error: null }); window.history.back(); }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
