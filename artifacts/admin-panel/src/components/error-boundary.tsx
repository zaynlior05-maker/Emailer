import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  resetKey?: any;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 border rounded-lg bg-destructive/10 border-destructive text-destructive">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm font-mono bg-background p-3 rounded mt-4 overflow-auto">
              {this.state.error?.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
