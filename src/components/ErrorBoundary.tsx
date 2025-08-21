import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { captureErrorBoundary, trackEvent } from '../services/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Log to monitoring services
    captureErrorBoundary(error, errorInfo);
    
    // Track error event
    trackEvent('error_boundary_triggered', {
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    trackEvent('error_boundary_retry', {
      error_message: this.state.error?.message,
    });
  };

  handleReportIssue = () => {
    trackEvent('error_boundary_report_issue', {
      error_message: this.state.error?.message,
    });
    
    // Here you could open an email client or feedback form
    console.log('User wants to report issue');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              We encountered an unexpected error. Don't worry, your progress is saved.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleReportIssue}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.message}
                </Text>
                <Text style={styles.debugText}>
                  {this.state.error?.stack}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const withErrorBoundary = (WrappedComponent: React.ComponentType<any>) => {
  return function WithErrorBoundaryComponent(props: any) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default ErrorBoundary;