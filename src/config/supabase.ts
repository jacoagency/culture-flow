import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Try multiple sources for environment variables
let supabaseUrl: string;
let supabaseAnonKey: string;

// For mobile: try expo config first, then fallback to env vars
if (Platform.OS === 'web') {
  supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
} else {
  // For mobile: use expo constants
  supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
  supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
}

console.log('🔧 Supabase Config:', {
  platform: Platform.OS,
  hasUrl: !!supabaseUrl,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'undefined',
  hasKey: !!supabaseAnonKey,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined',
});

if (!supabaseUrl || !supabaseAnonKey) {
  const error = `Supabase credentials missing. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`;
  console.error('❌', error);
  throw new Error(error);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Mobile-specific configurations
    ...(Platform.OS !== 'web' && {
      storage: undefined, // Let React Native handle storage
    }),
  },
  global: {
    headers: {
      'X-Client-Info': `cultura-flow-${Platform.OS}`,
    },
  },
  // Add timeout and retry configuration for mobile
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Test connection on initialization
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection test failed:', error.message);
  } else {
    console.log('✅ Supabase connection test successful');
  }
}).catch((err) => {
  console.error('❌ Supabase connection test error:', err);
});

export default supabase;