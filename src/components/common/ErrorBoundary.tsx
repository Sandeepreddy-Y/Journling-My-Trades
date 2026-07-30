import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Uncaught App Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-slide-up">
          <div className="bg-bg-card border border-loss/30 bg-loss/[0.04] rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-loss/10 text-loss flex items-center justify-center mx-auto border border-loss/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-text-bright tracking-tight">Something Went Wrong</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                An unexpected UI rendering error occurred. Don't worry, your trading data is saved safely in the system.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/40 border border-white/[0.06] p-3.5 rounded-xl text-left font-mono text-[11px] text-loss overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] text-text-secondary hover:text-text-bright text-xs font-semibold rounded-xl transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
