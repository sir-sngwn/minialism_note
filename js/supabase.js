/**
 * Supabase Client Initializer for Noir Note (Browser & Node)
 * Uses official @supabase/supabase-js
 */

const SUPABASE_CONFIG = {
  // Replace these with your Supabase Project URL & Anon Public Key from Supabase Dashboard
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key-here',

  STORAGE_URL_KEY: 'noir_supabase_url',
  STORAGE_ANON_KEY: 'noir_supabase_anon_key'
};

const SupabaseService = {
  client: null,

  getUrl() {
    if (typeof window !== 'undefined' && window.NEXT_PUBLIC_SUPABASE_URL) {
      return window.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SUPABASE_CONFIG.STORAGE_URL_KEY);
      if (stored && stored.startsWith('http')) return stored.trim();
    }
    return SUPABASE_CONFIG.url;
  },

  getAnonKey() {
    if (typeof window !== 'undefined' && window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SUPABASE_CONFIG.STORAGE_ANON_KEY);
      if (stored && stored.length > 20) return stored.trim();
    }
    return SUPABASE_CONFIG.anonKey;
  },

  isConfigured() {
    const url = this.getUrl();
    const key = this.getAnonKey();
    return !!(
      url &&
      !url.includes('your-project-id') &&
      url.startsWith('https://') &&
      key &&
      !key.includes('your-anon-key')
    );
  },

  setCredentials(url, anonKey) {
    if (url && anonKey) {
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_URL_KEY, url.trim());
      localStorage.setItem(SUPABASE_CONFIG.STORAGE_ANON_KEY, anonKey.trim());
      this.client = null;
      return this.getClient();
    }
    return null;
  },

  getClient() {
    if (this.client) return this.client;

    const url = this.getUrl();
    const key = this.getAnonKey();

    if (!this.isConfigured()) {
      return null;
    }

    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
      this.client = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return this.client;
    }

    if (typeof require !== 'undefined') {
      try {
        const { createClient } = require('@supabase/supabase-js');
        this.client = createClient(url, key);
        return this.client;
      } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
      }
    }

    return null;
  }
};

if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
}
if (typeof global !== 'undefined') {
  global.SupabaseService = SupabaseService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseService;
}
