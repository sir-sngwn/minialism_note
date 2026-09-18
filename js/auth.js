/**
 * Client-Side Authentication & Session Manager for Noir Note
 * Secure SHA-256 password hashing with isolated account persistence
 */

const USERS_STORAGE_KEY = 'noir_users_v1';
const SESSION_STORAGE_KEY = 'noir_active_session_v1';

const AuthManager = {
  async hashPassword(password) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + ':noir_salt_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Simple fallback for node testing environments where subtle crypto might not be initialized
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash);
    }
  },

  getUsers() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to read users from localStorage:', e);
      return {};
    }
  },

  saveUsers(users) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage:', e);
    }
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem(SESSION_STORAGE_KEY);
      return user && user.trim() ? user.trim() : null;
    } catch (e) {
      return null;
    }
  },

  setSession(username) {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, username);
    } catch (e) {
      console.error('Failed to set active session:', e);
    }
  },

  logout() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove active session:', e);
    }
  },

  async signup(username, password, confirmPassword = null) {
    const cleanUser = (username || '').trim();
    const cleanPass = password || '';

    if (!cleanUser) {
      return { success: false, error: 'Please enter a username.' };
    }
    if (cleanUser.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters.' };
    }
    if (!/^[a-zA-Z0-9_\-\uAC00-\uD7A3]+$/.test(cleanUser)) {
      return { success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores.' };
    }
    if (cleanPass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    if (confirmPassword !== null && cleanPass !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const users = this.getUsers();
    const existingKey = Object.keys(users).find(k => k.toLowerCase() === cleanUser.toLowerCase());
    if (existingKey) {
      return { success: false, error: 'An account with this username already exists.' };
    }

    const passwordHash = await this.hashPassword(cleanPass);
    users[cleanUser] = {
      username: cleanUser,
      passwordHash: passwordHash,
      createdAt: Date.now()
    };

    this.saveUsers(users);
    this.setSession(cleanUser);

    return { success: true, user: cleanUser };
  },

  async login(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = password || '';

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const users = this.getUsers();
    const matchingKey = Object.keys(users).find(k => k.toLowerCase() === cleanUser.toLowerCase());
    if (!matchingKey) {
      return { success: false, error: 'User not found. Please create an account.' };
    }

    const userObj = users[matchingKey];
    const passwordHash = await this.hashPassword(cleanPass);

    if (userObj.passwordHash !== passwordHash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    this.setSession(userObj.username);
    return { success: true, user: userObj.username };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
