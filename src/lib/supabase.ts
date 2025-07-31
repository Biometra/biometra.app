
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create Supabase client with fallback handling and error catching
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: (url, options = {}) => {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      }).catch(error => {
        if (error.name === 'AbortError') {
          console.error('Supabase request timed out');
          throw new Error('Request timed out');
        }
        console.error('Supabase fetch error:', error);
        throw error;
      });
    }
  }
});

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  try {
    return supabaseUrl !== 'https://placeholder.supabase.co' &&
           !supabaseUrl.includes('your-project-id') &&
           supabaseKey !== 'placeholder-key' &&
           supabaseUrl && 
           supabaseKey &&
           supabaseUrl.includes('supabase.co');
  } catch (error) {
    console.log('⚠️ Supabase configuration check failed');
    return false;
  }
}