import * as Sentry from '@sentry/react-native';
import { config } from '../config/environment';

// Sentry Configuration
export const initializeMonitoring = () => {
  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.APP_ENV,
      debug: config.DEBUG_MODE,
      enableAutoSessionTracking: true,
      enableAutoPerformanceTracing: true,
      enableWatchdogTerminationTracking: false, // Not needed for mobile
      tracesSampleRate: config.APP_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: config.APP_ENV === 'production' ? 0.1 : 1.0,
      beforeSend: (event, hint) => {
        // Filter out development errors in production
        if (config.APP_ENV === 'production' && event.environment !== 'production') {
          return null;
        }

        // Filter sensitive information
        if (event.exception) {
          event.exception.values?.forEach(exception => {
            if (exception.stacktrace?.frames) {
              exception.stacktrace.frames.forEach(frame => {
                // Remove sensitive data from stack traces
                if (frame.filename?.includes('node_modules')) {
                  frame.filename = frame.filename.split('node_modules/')[1];
                }
              });
            }
          });
        }

        return event;
      },
      integrations: [
        new Sentry.ReactNativeTracing({
          enableUserInteractionTracing: true,
          enableNativeFramesTracking: true,
          enableAppStartTracking: true,
        }),
      ],
    });
  }
};

// Analytics tracking
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (config.DEBUG_MODE) {
    console.log('📊 Analytics Event:', eventName, properties);
  }
  
  // Add your analytics service here (e.g., Mixpanel, Amplitude, Firebase Analytics)
  if (config.ANALYTICS_KEY) {
    // Example: Analytics.track(eventName, properties);
  }
};

// User identification for Sentry
export const identifyUser = (userId: string, email?: string, username?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

// Custom error logging
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('❌ Error:', error.message, error.stack);
  
  if (config.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }
};

// Performance monitoring
export const startTransaction = (name: string, operation?: string) => {
  if (config.SENTRY_DSN) {
    return Sentry.startTransaction({
      name,
      op: operation || 'navigation',
    });
  }
  return null;
};

// Breadcrumb tracking
export const addBreadcrumb = (message: string, category?: string, level?: Sentry.SeverityLevel) => {
  if (config.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category: category || 'default',
      level: level || 'info',
      timestamp: Date.now() / 1000,
    });
  }
};

// Screen tracking
export const trackScreen = (screenName: string, properties?: Record<string, any>) => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
  
  addBreadcrumb(`Navigated to ${screenName}`, 'navigation', 'info');
};

// User action tracking
export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  trackEvent('user_action', {
    action,
    ...properties,
  });
  
  addBreadcrumb(`User action: ${action}`, 'user', 'info');
};

// Network error tracking
export const trackNetworkError = (url: string, method: string, statusCode?: number, error?: string) => {
  const errorData = {
    url,
    method,
    status_code: statusCode,
    error_message: error,
  };
  
  trackEvent('network_error', errorData);
  
  if (config.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext('network', errorData);
      scope.setLevel('error');
      Sentry.captureMessage(`Network error: ${method} ${url}`, 'error');
    });
  }
};

// Feature usage tracking
export const trackFeatureUsage = (featureName: string, properties?: Record<string, any>) => {
  trackEvent('feature_usage', {
    feature: featureName,
    ...properties,
  });
};

// Performance metrics
export const trackPerformance = (metric: string, value: number, unit?: string) => {
  trackEvent('performance_metric', {
    metric,
    value,
    unit: unit || 'ms',
  });
  
  if (config.SENTRY_DSN) {
    Sentry.setMeasurement(metric, value, unit || 'millisecond');
  }
};

// App lifecycle tracking
export const trackAppState = (state: 'active' | 'background' | 'inactive') => {
  trackEvent('app_state_change', { state });
  addBreadcrumb(`App state: ${state}`, 'lifecycle', 'info');
};

// Error boundary helper
export const captureErrorBoundary = (error: Error, errorInfo: any) => {
  console.error('React Error Boundary:', error, errorInfo);
  
  if (config.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
      });
      scope.setLevel('fatal');
      Sentry.captureException(error);
    });
  }
};

export default {
  initializeMonitoring,
  trackEvent,
  identifyUser,
  logError,
  startTransaction,
  addBreadcrumb,
  trackScreen,
  trackUserAction,
  trackNetworkError,
  trackFeatureUsage,
  trackPerformance,
  trackAppState,
  captureErrorBoundary,
};