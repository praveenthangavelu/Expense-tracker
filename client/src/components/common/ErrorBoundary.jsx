import { Component } from "react";
import Button from "./Button";

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F1117] p-6 text-center select-text">
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 max-w-lg shadow-[var(--shadow-lg)]">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-3 text-xs text-[var(--text-secondary)] font-medium max-w-sm mx-auto leading-normal">
              ExpenseFlow hit a rendering issue. Refreshing usually restores the app.
            </p>
            {this.state.error && (
              <pre className="mt-5 max-h-48 overflow-y-auto text-left text-[10px] font-mono text-[var(--flame)] bg-[var(--bg-base)] border border-[rgba(255,107,107,0.15)] p-4 rounded-xl whitespace-pre-wrap select-text scrollbar-none">
                {this.state.error.stack || this.state.error.toString()}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => window.location.reload()} variant="primary">
                Refresh
              </Button>
              <Button onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }} variant="ghost">
                Reset Session
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
