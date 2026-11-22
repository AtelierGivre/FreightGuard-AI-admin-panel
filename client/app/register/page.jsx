'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) { setError(err.message || 'Registration failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand"><div className="logo"><ShieldCheck size={21} /></div><strong>FreightGuard AI</strong></div>
        <h2>Create your account</h2>
        <p className="sub">Start auditing invoices in under 5 minutes.</p>
        {error && <div className="alert error mb-16">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Full name</label><input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Nair" /></div>
          <div className="field"><label>Company name</label><input className="form-control" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Harborline Imports" /></div>
          <div className="field"><label>Email address</label><input className="form-control" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></div>
          <div className="field"><label>Password</label><input className="form-control" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
