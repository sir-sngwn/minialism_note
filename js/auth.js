/**
 * Supabase Authentication & Session Manager for Noir Note
 * Connects directly to Supabase Auth API
 */

const AuthManager = {
  getClient() {
    const svc = (typeof SupabaseService !== 'undefined') ? SupabaseService : (typeof global !== 'undefined' ? global.SupabaseService : null);
    if (svc && svc.getClient) {
      return svc.getClient();
    }
    return null;
  },

  isConfigured() {
    const svc = (typeof SupabaseService !== 'undefined') ? SupabaseService : (typeof global !== 'undefined' ? global.SupabaseService : null);
    if (svc && svc.isConfigured) {
      return svc.isConfigured();
    }
    return false;
  },

  async signup(email, password, confirmPassword = null) {
    const cleanEmail = (email || '').trim();
    const cleanPass = password || '';

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
    }
    if (cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (confirmPassword !== null && cleanPass !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase credentials not configured. Please set your Supabase URL & Anon Key in js/supabase.js or .env.local.'
      };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: cleanPass
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || !data.user) {
        return { success: false, error: 'Signup failed. Please try again.' };
      }

      // If Supabase has email confirmation enabled, session might be null
      const isPendingConfirmation = !data.session && data.user.identities && data.user.identities.length > 0;

      return {
        success: true,
        user: data.user,
        session: data.session,
        email: data.user.email,
        pendingConfirmation: isPendingConfirmation,
        message: isPendingConfirmation
          ? 'Confirmation email sent! Please check your inbox to activate your account.'
          : 'Account created successfully!'
      };
    } catch (err) {
      console.error('Supabase signup exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during signup.' };
    }
  },

  async login(email, password) {
    const cleanEmail = (email || '').trim();
    const cleanPass = password || '';

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase credentials not configured. Please set your Supabase URL & Anon Key in js/supabase.js or .env.local.'
      };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        email: data.user.email
      };
    } catch (err) {
      console.error('Supabase login exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during login.' };
    }
  },

  async logout() {
    const client = this.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
  },

  async getCurrentUser() {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError || !session) return null;

      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) return null;

      return user;
    } catch (e) {
      return null;
    }
  },

  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data: { session } } = await client.auth.getSession();
      return session || null;
    } catch (e) {
      return null;
    }
  },

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (client && client.auth) {
      return client.auth.onAuthStateChange((event, session) => {
        if (typeof callback === 'function') {
          callback(event, session);
        }
      });
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};

if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
