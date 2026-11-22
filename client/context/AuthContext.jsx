'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fg_token') : null;
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.getMe();
        setUser(res.user || res.data);
      } catch {
        localStorage.removeItem('fg_token');
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.user);
    return res;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
