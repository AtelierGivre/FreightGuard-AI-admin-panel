'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2>Create your account</h2>
      <p className="sub">Start auditing invoices in under five minutes.</p>
      {error && <div className="alert error mb-16">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            className="form-control"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Priya Nair"
          />
        </div>
        <div className="field">
          <label htmlFor="register-company">Company name</label>
          <input
            id="register-company"
            className="form-control"
            autoComplete="organization"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="Harborline Imports"
          />
        </div>
        <div className="field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            className="form-control"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
          />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <div className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </AuthShell>
  );
}
