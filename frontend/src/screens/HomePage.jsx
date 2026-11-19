'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const shakeTimer = useRef(null);
  useEffect(() => () => clearTimeout(shakeTimer.current), []);
  const triggerShake = () => {
    clearTimeout(shakeTimer.current);
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
    shakeTimer.current = setTimeout(() => setShaking(false), 500);
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      const data = mode === 'signup'
        ? await authApi.register({ name, email, password })
        : await authApi.login({ email, password });
      localStorage.setItem('pos_token', data.token);
      localStorage.setItem('pos_user', JSON.stringify(data.user));
      await refreshCart();
      setSuccess(true);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
      onLogin(data.user);
      router.push(['MANAGER', 'SUPER_ADMIN'].includes(data.user.role) ? '/dashboard' : '/catalog');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };
  if (user) return <section><div className="eyebrow">Chi-White / {user.role === 'CUSTOMER' ? 'your account' : 'store workspace'}</div><h1>Welcome,<br /><em>{user.name.split(' ')[0]}.</em></h1><p className="muted">Explore our plain white essentials, hoodies, and designer pieces.</p><div className="grid welcome-actions"><button className="panel" onClick={() => router.push('/catalog')}><h2>Shop the collection</h2><p className="muted">Explore every piece.</p></button>{user.role === 'CUSTOMER' && <><button className="panel" onClick={() => router.push('/orders')}><h2>Your orders</h2><p className="muted">Review your purchases.</p></button><button className="panel" onClick={() => router.push('/account')}><h2>My account</h2><p className="muted">Manage your profile and security.</p></button></>}{user.role !== 'CUSTOMER' && <button className="panel" onClick={() => router.push('/checkout')}><h2>Go to checkout</h2><p className="muted">Review the bag and confirm an order.</p></button>}{['MANAGER', 'SUPER_ADMIN'].includes(user.role) && <button className="panel" onClick={() => router.push('/dashboard')}><h2>Open dashboard</h2><p className="muted">Review sales health and inventory.</p></button>}</div></section>;
  return <section className="auth-panel">
    <div className="eyebrow">Chi-White / {mode === 'signup' ? 'customer account' : 'secure access'}</div>
    <h1>{mode === 'signup' ? <>Join the<br /><em>collection.</em></> : <>Welcome back.<br /><em>Ready to style?</em></>}</h1>
    <p className="muted">{mode === 'signup' ? 'Create your account to browse and shop Chi-White.' : 'Sign in to explore the collection and manage your orders.'}</p>
    <form className={shaking ? 'auth-form auth-form-shake' : 'auth-form'} onSubmit={submit} onInvalid={triggerShake} aria-busy={submitting}>
      {mode === 'signup' && <div className="field"><label htmlFor="name">Name</label><input id="name" className="search" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" className="search" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={160} required />{mode === 'login' && <output className="field-hint" htmlFor="email" aria-live="polite" aria-atomic="true">Operator ID: {email || '—'}</output>}</div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" className="search" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => setCapsLockOn(event.getModifierState('CapsLock'))} onKeyUp={(event) => setCapsLockOn(event.getModifierState('CapsLock'))} onBlur={() => setCapsLockOn(false)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} aria-describedby={mode === 'signup' ? 'password-hint password-caps-lock' : 'password-caps-lock'} minLength={mode === 'signup' ? 12 : undefined} maxLength={72} required /><small id="password-caps-lock" className="field-hint auth-caps-warning" role="status" hidden={!capsLockOn}>Caps Lock is on.</small>{mode === 'signup' && <small id="password-hint" className="field-hint">Use at least 12 characters.</small>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary auth-submit" type="submit" disabled={submitting || success} aria-live="polite">{success ? <><svg className="auth-success-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg><span>{mode === 'signup' ? 'Account created' : 'Signed in'}</span></> : submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Chi-White?'} <Link href={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</Link></p>
  </section>;
}