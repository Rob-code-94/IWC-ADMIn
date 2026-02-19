
import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary component to catch rendering errors in the component tree.
 */
// Using React.Component and a constructor to ensure proper type inheritance of props and state from the base class
export class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Explicitly declare state and props to resolve TypeScript errors where inherited properties are not recognized on the class instance.
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Explicitly initialize state in the constructor for robust type resolution
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // Check for error state to show fallback UI
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
          <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md">
            <h1 className="text-2xl font-bold mb-2 text-slate-900">Something went wrong.</h1>
            <p className="text-slate-500">Please refresh the page or contact support.</p>
            <button 
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors"
            >
                Reload Page
            </button>
          </div>
        </div>
      );
    }

    // Accessing children from props inherited from the base React.Component class
    return this.props.children;
  }
}
