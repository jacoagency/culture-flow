import Constants from 'expo-constants';

export interface Environment {
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  APP_ENV: 'development' | 'staging' | 'production';
  APP_VERSION: string;
  DEBUG_MODE: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_OFFLINE_MODE: boolean;
  ENABLE_GAMIFICATION: boolean;
  ENABLE_SOCIAL_FEATURES: boolean;
  SENTRY_DSN?: string;
  ANALYTICS_KEY?: string;
  EXPO_PROJECT_ID: string;
}

const getEnvironmentConfig = (): Environment => {
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  const extra = Constants.expoConfig?.extra;
  
  // Determine environment based on release channel
  let environment: Environment['APP_ENV'] = 'development';
  
  if (releaseChannel === 'production') {
    environment = 'production';
  } else if (releaseChannel === 'staging' || releaseChannel === 'preview') {
    environment = 'staging';
  }

  // Base configuration with environment variables
  const baseConfig: Environment = {
    API_BASE_URL: (process.env.API_BASE_URL || 'http://192.168.1.76:3001') + '/api/v1',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://192.168.1.76:3001',
    APP_ENV: environment,
    APP_VERSION: Constants.expoConfig?.version || '1.0.0',
    DEBUG_MODE: __DEV__,
    LOG_LEVEL: __DEV__ ? 'debug' : 'error',
    ENABLE_OFFLINE_MODE: true,
    ENABLE_GAMIFICATION: true,
    ENABLE_SOCIAL_FEATURES: true,
    EXPO_PROJECT_ID: extra?.eas?.projectId || '',
  };

  // Environment-specific overrides
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        API_BASE_URL: 'https://api.culturaflow.com/api/v1',
        WEBSOCKET_URL: 'wss://api.culturaflow.com',
        DEBUG_MODE: false,
        LOG_LEVEL: 'error',
        SENTRY_DSN: extra?.SENTRY_DSN,
        ANALYTICS_KEY: extra?.ANALYTICS_KEY,
      };
    
    case 'staging':
      return {
        ...baseConfig,
        API_BASE_URL: 'https://api-staging.culturaflow.com/api/v1',
        WEBSOCKET_URL: 'wss://api-staging.culturaflow.com',
        DEBUG_MODE: false,
        LOG_LEVEL: 'info',
        SENTRY_DSN: extra?.SENTRY_DSN_STAGING,
        ANALYTICS_KEY: extra?.ANALYTICS_KEY_STAGING,
      };
    
    default:
      return baseConfig;
  }
};

export const config = getEnvironmentConfig();

export default config;