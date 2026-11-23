'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2>Welcome back</h2>
      <p className="sub">Sign in to your recovery workspace.</p>
      {!api.isConfigured && (
        <div className="alert error mb-16" role="alert">
          Backend is not configured. Set <span className="mono">NEXT_PUBLIC_API_URL</span> and
          rebuild the client.
        </div>
      )}
      {error && <div className="alert error mb-16">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            className="form-control"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="form-control"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="auth-switch">
        New here? <Link href="/register">Create an account</Link>
      </div>
    </AuthShell>
  );
}
