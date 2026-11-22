'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
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
    setError(''); setBusy(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const demoLogin = async () => {
    setBusy(true);
    try {
      await login('admin@freightguard.ai', 'Admin@12345');
      router.push('/admin');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand"><div className="logo"><ShieldCheck size={21} /></div><strong>FreightGuard AI</strong></div>
        <h2>Welcome back</h2>
        <p className="sub">Sign in to your recovery workspace.</p>
        {error && <div className="alert error mb-16">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Email address</label><input className="form-control" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></div>
          <div className="field"><label>Password</label><input className="form-control" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {api.isDemo && (
          <div className="demo-hint">
            <strong>Demo mode</strong> — no backend configured. Use the button below to explore the full app including the admin panel.<br /><br />
            <button className="btn btn-outline btn-sm" onClick={demoLogin} disabled={busy}>Enter demo as Admin</button>
          </div>
        )}
        <div className="auth-switch">New here? <Link href="/register">Create an account</Link></div>
      </div>
    </div>
  );
}
