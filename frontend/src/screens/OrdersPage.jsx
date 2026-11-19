'use client';

import { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { customerOrderApi } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    customerOrderApi.list()
      .then(({ orders: result }) => { if (active) setOrders(result); })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load your orders.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="account-page orders-page">
    <header className="account-page-heading">
      <div><p className="eyebrow">ACCOUNT / ORDERS</p><h1>Your orders</h1><p className="muted">Track your Chi-White purchases and review order details.</p></div>
    </header>
    {error && <p className="error" role="alert">{error}</p>}
    {loading && <p className="muted" role="status">Loading your orders…</p>}
    {!loading && !error && !orders.length && <div className="panel orders-empty">
      <PackageCheck size={28} aria-hidden="true" /><h2>No orders yet</h2><p className="muted">Your completed checkouts will appear here.</p><Link className="secondary" href="/catalog">Explore the collection</Link>
    </div>}
    <div className="orders-list">
      {orders.map((order) => <article className="panel customer-order-card" key={order.id}>
        <header><div><span className="eyebrow">ORDER</span><h2>{order.orderNumber}</h2><small>{new Date(order.createdAt).toLocaleDateString()}</small></div><span className="order-status">{order.status}</span></header>
        <ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}><span>{item.name} · {item.size === 'ONE_SIZE' ? 'One size' : item.size} × {item.quantity}</span><strong>{formatZmw(item.lineTotal)}</strong></li>)}</ul>
        <footer><span>{order.paymentMethod.replaceAll('_', ' ')}</span><strong>Total {formatZmw(order.total)}</strong></footer>
      </article>)}
    </div>
  </section>;
}
