'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../services/api.js';

export default function HomePage({ user, onLogin, refreshCart, mode = 'login' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = mode === 'signup'
        ? await authApi.register({ name, email, password })
        : await authApi.login({ email, password });
      localStorage.setItem('pos_token', data.token);
      localStorage.setItem('pos_user', JSON.stringify(data.user));
      onLogin(data.user);
      await refreshCart();
      router.push('/catalog');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };
  if (user) return <section><div className="eyebrow">Chi-White / {user.role === 'CUSTOMER' ? 'your account' : 'store workspace'}</div><h1>Welcome,<br /><em>{user.name.split(' ')[0]}.</em></h1><p className="muted">Explore our plain white essentials, hoodies, and designer pieces.</p><div className="grid welcome-actions"><button className="panel" onClick={() => router.push('/catalog')}><h2>Shop the collection</h2><p className="muted">Explore every piece.</p></button>{user.role !== 'CUSTOMER' && <button className="panel" onClick={() => router.push('/checkout')}><h2>Go to checkout</h2><p className="muted">Review the bag and confirm an order.</p></button>}{['MANAGER', 'SUPER_ADMIN'].includes(user.role) && <button className="panel" onClick={() => router.push('/dashboard')}><h2>Open dashboard</h2><p className="muted">Review sales health and inventory.</p></button>}</div></section>;
  return <section className="auth-panel">
    <div className="eyebrow">Chi-White / {mode === 'signup' ? 'customer account' : 'secure access'}</div>
    <h1>{mode === 'signup' ? <>Join the<br /><em>collection.</em></> : <>Welcome back.<br /><em>Ready to style?</em></>}</h1>
    <p className="muted">{mode === 'signup' ? 'Create your account to browse and shop Chi-White.' : 'Sign in to explore the collection and manage your orders.'}</p>
    <form onSubmit={submit}>
      {mode === 'signup' && <div className="field"><label htmlFor="name">Name</label><input id="name" className="search" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" className="search" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={160} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" className="search" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} maxLength={72} required />{mode === 'signup' && <small className="field-hint">Use at least 12 characters.</small>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Chi-White?'} <Link href={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</Link></p>
  </section>;
}