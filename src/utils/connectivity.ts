import { supabase } from '../config/supabase';
import { Platform } from 'react-native';

export interface ConnectivityResult {
  isConnected: boolean;
  supbbaseReachable: boolean;
  error?: string;
  details?: {
    platform: string;
    hasUrl: boolean;
    hasKey: boolean;
    authTest?: string;
    networkError?: string;
  };
}

export async function testConnectivity(): Promise<ConnectivityResult> {
  const result: ConnectivityResult = {
    isConnected: false,
    supbbaseReachable: false,
    details: {
      platform: Platform.OS,
      hasUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  };

  try {
    console.log('🔍 Testing connectivity...');
    
    // Test 1: Basic Supabase auth test
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      result.error = `Auth test failed: ${error.message}`;
      result.details!.authTest = error.message;
      console.error('❌ Auth test failed:', error.message);
      return result;
    }

    console.log('✅ Auth test passed');
    result.details!.authTest = 'success';

    // Test 2: Try a simple query
    try {
      const { data: testData, error: queryError } = await supabase
        .from('cultural_content')
        .select('id')
        .limit(1);

      if (queryError) {
        result.error = `Query test failed: ${queryError.message}`;
        console.error('❌ Query test failed:', queryError.message);
        return result;
      }

      console.log('✅ Query test passed, found content:', !!testData?.length);
      result.isConnected = true;
      result.supbbaseReachable = true;

    } catch (queryError: any) {
      result.error = `Network error: ${queryError.message}`;
      result.details!.networkError = queryError.message;
      console.error('❌ Network error:', queryError.message);
    }

  } catch (generalError: any) {
    result.error = `General connectivity error: ${generalError.message}`;
    console.error('❌ General connectivity error:', generalError);
  }

  console.log('🔍 Connectivity test result:', result);
  return result;
}

export function logEnvironmentInfo() {
  console.log('🌍 Environment Info:', {
    platform: Platform.OS,
    hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    urlPreview: process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    keyPreview: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  });
}