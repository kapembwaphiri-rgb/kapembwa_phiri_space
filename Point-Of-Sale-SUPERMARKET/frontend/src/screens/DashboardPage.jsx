'use client';

import { useEffect, useState } from 'react';
import { reportApi } from '../services/api.js';
import { ClipboardList } from 'lucide-react';
import { formatZmw } from '../utils/currency.js';
import ProductManager from '../components/ProductManager.jsx';
export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    reportApi.getSummary()
      .then(setSummary)
      .catch((requestError) => setError(requestError.message));
  }, []);
  return <>
    <div className="header"><div><div className="eyebrow">Manager workspace</div><h1>Today's pulse</h1><p className="muted">A concise view of sales health and stock attention.</p></div><button className="secondary" onClick={() => window.print()}><ClipboardList size={16} /> Generate report</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="grid stats">{[['Sales today', formatZmw(summary?.totalSales)], ['Transactions', summary?.orders || 0], ['Low-stock items', summary?.lowStock || 0], ['Top product', summary?.topProduct || 'Awaiting data']].map(([label, value]) => <div className="stat" key={label}><p>{label}</p><strong>{value}</strong></div>)}</div>
    <ProductManager />
  </>;
}
