'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Protected({ children, roles }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, loading, router, roles]);

  if (loading)
    return (
      <div className="auth-page">
        <div className="text-muted">Loading…</div>
      </div>
    );
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return children;
}
