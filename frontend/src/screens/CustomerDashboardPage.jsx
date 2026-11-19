'use client';

import Link from 'next/link';
import { ArrowRight, PackageCheck, UserRound } from 'lucide-react';

export default function CustomerDashboardPage({ user }) {
  return <section className="account-page customer-dashboard-page">
    <header className="account-page-heading">
      <div><p className="eyebrow">CHI-WHITE / YOUR ACCOUNT</p><h1>Welcome back, {user?.name?.split(' ')[0] || 'there'}.</h1><p className="muted">Your orders and account details, all in one place.</p></div>
    </header>
    <div className="customer-account-cards">
      <Link href="/orders" className="panel customer-account-card">
        <span className="customer-account-icon"><PackageCheck size={20} aria-hidden="true" /></span>
        <span><strong>Your orders</strong><small>Review your recent purchases and order details.</small></span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
      <Link href="/profile" className="panel customer-account-card">
        <span className="customer-account-icon"><UserRound size={20} aria-hidden="true" /></span>
        <span><strong>Profile &amp; security</strong><small>Update your details, profile photo, and password.</small></span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  </section>;
}
