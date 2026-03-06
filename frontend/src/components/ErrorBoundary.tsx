import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: '2rem', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', color: '#f87171', marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '420px' }}>
            An unexpected error occurred. You can try reloading the page or resetting the app state.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={this.handleReset}
            >
              Try Again
            </button>
          </div>
          {this.state.error && (
            <pre style={{
              marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px', color: '#94a3b8', fontSize: '0.75rem',
              maxWidth: '600px', overflow: 'auto', textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
