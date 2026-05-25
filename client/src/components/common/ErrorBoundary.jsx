import { Component } from "react";

import Button from "./Button";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F1117] p-6 text-center">
          <div className="glass max-w-md rounded-3xl p-8">
            <h1 className="font-display text-3xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-slate-400">
              ExpenseFlow hit a rendering issue. Refreshing usually restores the app.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
