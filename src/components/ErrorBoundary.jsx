"use client";
import React from "react";
import PropTypes from "prop-types";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <svg 
              className="h-8 w-8 text-red-500 mr-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h2 className="text-lg font-semibold text-red-800">
              {this.props.componentName || "Component"} Error
            </h2>
          </div>
          
          <p className="text-red-700 mb-4">
            {this.props.fallbackMessage || "Something went wrong with this component. Please try refreshing the page or uploading your file again."}
          </p>

          {this.props.showDetails && this.state.error && (
            <details className="bg-red-100 p-3 rounded border border-red-300 text-sm">
              <summary className="cursor-pointer font-medium text-red-800 mb-2">
                Error Details (Click to expand)
              </summary>
              <div className="text-red-700 whitespace-pre-wrap font-mono text-xs">
                <strong>Error:</strong> {this.state.error.toString()}
                <br />
                <strong>Stack trace:</strong>
                {this.state.errorInfo.componentStack}
              </div>
            </details>
          )}

          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  componentName: PropTypes.string,
  fallbackMessage: PropTypes.string,
  showDetails: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

// Functional wrapper for easier use
export const withErrorBoundary = (Component, options = {}) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary 
        componentName={options.componentName || Component.displayName || Component.name}
        fallbackMessage={options.fallbackMessage}
        showDetails={options.showDetails || false}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary;