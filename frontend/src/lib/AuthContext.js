import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('drivoai_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('drivoai_token'));
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function refreshMe() {
      if (!token) { setBootstrapped(true); return; }
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          setUser(data);
          localStorage.setItem('drivoai_user', JSON.stringify(data));
        }
      } catch {
        // ignore; interceptor handles 401
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }
    refreshMe();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('drivoai_token', data.access_token);
    localStorage.setItem('drivoai_refresh', data.refresh_token);
    localStorage.setItem('drivoai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name });
    localStorage.setItem('drivoai_token', data.access_token);
    localStorage.setItem('drivoai_refresh', data.refresh_token);
    localStorage.setItem('drivoai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('drivoai_refresh');
      if (refresh) await api.post('/auth/logout', { refresh_token: refresh });
    } catch {}
    localStorage.removeItem('drivoai_token');
    localStorage.removeItem('drivoai_refresh');
    localStorage.removeItem('drivoai_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem('drivoai_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, token, bootstrapped, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
