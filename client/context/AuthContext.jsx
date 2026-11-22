'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TOKEN_KEY, STAFF_ROLES } from '@/lib/constants';

const AuthContext = createContext(null);

/**
 * Owns the current user and session lifecycle.
 * `loading` is true until token restoration has finished, so route guards can
 * avoid redirecting a valid user to /login on first paint.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const result = await api.getMe();
        if (!cancelled) setUser(result.user || null);
      } catch {
        // Invalid or expired token — discard it and start clean.
        if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const result = await api.login(email, password);
    setUser(result.user);
    return result;
  };

  const register = async (payload) => {
    const result = await api.register(payload);
    setUser(result.user);
    return result;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isStaff: STAFF_ROLES.includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
