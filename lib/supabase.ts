import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Only import the polyfill on native — web has built-in URL support
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
  );
}

// On web (browser): use localStorage so sessions survive page refreshes.
// On native (Expo Go / APK) or SSR (Node.js): use in-memory storage.
const memoryStorage: Record<string, string> = {};

// Guard: localStorage is not available during SSR (static export runs in Node.js)
const canUseLocalStorage =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined';

const storage = canUseLocalStorage
  ? {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    }
  : {
      getItem: async (key: string) => memoryStorage[key] ?? null,
      setItem: async (key: string, value: string) => { memoryStorage[key] = value; },
      removeItem: async (key: string) => { delete memoryStorage[key]; },
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web: detect the #access_token fragment in the URL (needed for
    // password-reset and OAuth redirect flows).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
