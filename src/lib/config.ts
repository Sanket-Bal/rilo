import Constants from 'expo-constants';

// Supabase - Read directly from process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase credentials.\n` +
    `EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'set' : 'NOT SET'}\n` +
    `EXPO_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'set' : 'NOT SET'}\n` +
    `Check .env file in project root.`
  );
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

// App Info
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'RILO';
export const APP_TAGLINE = process.env.EXPO_PUBLIC_APP_TAGLINE || 'The Airbnb for Bikes';

// Support & Contact
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@rilo.app';
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE || '1800-RILO-HELP';

// Design Tokens
export const COLORS = {
  PRIMARY_RED: process.env.EXPO_PUBLIC_PRIMARY_RED || '#E8241A',
  DARK_BG: process.env.EXPO_PUBLIC_DARK_BG || '#1A1A1A',
  LIGHT_BG: process.env.EXPO_PUBLIC_LIGHT_BG || '#FFFFFF',
  LIGHT_GRAY: process.env.EXPO_PUBLIC_LIGHT_GRAY || '#F5F5F5',
};

// Validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials. Check .env.local file.');
}
