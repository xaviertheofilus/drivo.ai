import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, token, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
}
