'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, ChevronRight,
  CircleDollarSign, ClipboardList, Download, FileBarChart, LayoutDashboard,
  Menu, Moon, Package, Search, Settings, ShieldCheck, ShoppingBag, Sun,
  Users, X
} from 'lucide-react';
import { reportApi } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';
import ProductManager from '../components/ProductManager.jsx';

const navigation = [
  { section: 'WORKSPACE' },
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, available: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, available: true },
  { section: 'CATALOG & SALES' },
  { id: 'products', label: 'Products', icon: Package, available: true },
  { id: 'inventory', label: 'Inventory', icon: Boxes, available: true },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, available: true },
  { id: 'customers', label: 'Customers', icon: Users, available: true },
  { section: 'GROW YOUR STORE' },
  { id: 'messages', label: 'Messages', icon: Activity },
  { id: 'marketing', label: 'Marketing', icon: BarChart3 },
  { id: 'discounts', label: 'Discounts', icon: CircleDollarSign },
  { id: 'reviews', label: 'Reviews', icon: ShieldCheck },
  { section: 'REPORTING' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, available: true },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const initialDashboard = {
  metrics: {
    salesToday: 0, salesThisWeek: 0, salesThisMonth: 0, totalRevenue: 0,
    pendingOrders: 0, completedOrders: 0, cancelledOrders: 0, returnedOrders: 0,
    totalProducts: 0, outOfStockProducts: 0, lowStockProducts: 0,
    activeCustomers: 0, newCustomersThisWeek: 0
  },
  trends: { today: null, week: null, month: null },
  salesSeries: [],
  products: [],
  orderStatuses: []
};

function Trend({ value }) {
  if (value === null || value === undefined) {
    return <span className="seller-trend is-neutral">No prior-period data</span>;
  }
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`seller-trend ${positive ? 'is-positive' : 'is-negative'}`}>
    <Icon size={14} aria-hidden="true" /> {Math.abs(value)}% <span>vs prior period</span>
  </span>;
}

function SalesChart({ series, range }) {
  const width = 760;
  const height = 250;
  const padding = { top: 18, right: 12, bottom: 40, left: 62 };
  const values = series.map((point) => point.sales);
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = series.map((point, index) => {
    const x = padding.left + (series.length <= 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (point.sales / maxValue) * chartHeight;
    return { ...point, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = points.length ? `${padding.left},${padding.top + chartHeight} ${line} ${padding.left + chartWidth},${padding.top + chartHeight}` : '';
  const labelStep = range === '7d' ? 1 : range === '30d' ? 5 : 2;
  const formatBucket = (value) => {
    const date = new Date(value);
    return range === '12m'
      ? date.toLocaleDateString(undefined, { month: 'short' })
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return <div className="seller-chart-scroll">
    {series.length
      ? <svg className="seller-sales-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Sales trend for the last ${range === '7d' ? '7 days' : range === '30d' ? '30 days' : '12 months'}`}>
        {[0, 1, 2, 3].map((step) => {
          const y = padding.top + (chartHeight / 3) * step;
          const value = maxValue * (1 - step / 3);
          return <g key={step}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="seller-chart-gridline" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" className="seller-chart-axis">{formatZmw(value)}</text>
          </g>;
        })}
        <polygon points={area} className="seller-chart-area" />
        <polyline points={line} className="seller-chart-line" />
        {points.map((point, index) => <g key={point.bucket}>
          <title>{`${formatBucket(point.bucket)}: ${formatZmw(point.sales)}`}</title>
          <circle cx={point.x} cy={point.y} r="4" className="seller-chart-dot" />
          {index % labelStep === 0 && <text x={point.x} y={height - 12} textAnchor="middle" className="seller-chart-axis">{formatBucket(point.bucket)}</text>}
        </g>)}
      </svg>
      : <div className="seller-empty-chart">Sales activity will appear here when your first order is recorded.</div>}
  </div>;
}

function downloadCsv(dashboard) {
  const rows = [
    ['Chi-White seller report'],
    ['Metric', 'Value'],
    ['Sales today', dashboard.metrics.salesToday],
    ['Sales this week', dashboard.metrics.salesThisWeek],
    ['Sales this month', dashboard.metrics.salesThisMonth],
    ['Total revenue', dashboard.metrics.totalRevenue],
    ['Pending orders', dashboard.metrics.pendingOrders],
    ['Completed orders', dashboard.metrics.completedOrders],
    ['Cancelled orders', dashboard.metrics.cancelledOrders],
    ['Returned orders', dashboard.metrics.returnedOrders],
    ['Active products', dashboard.metrics.totalProducts],
    ['Out of stock products', dashboard.metrics.outOfStockProducts],
    ['Active customers', dashboard.metrics.activeCustomers],
    [],
    ['Sales trend'],
    ['Date', 'Sales (ZMW)'],
    ...dashboard.salesSeries.map((point) => [new Date(point.bucket).toLocaleDateString(), point.sales]),
    [],
    ['Product performance'],
    ['Product', 'Category', 'Units sold', 'Revenue (ZMW)', 'Current stock'],
    ...dashboard.products.map((product) => [product.name, product.category, product.units_sold, product.revenue, product.stock_quantity])
  ];
  const csv = rows.map((row) => row.map((value) => {
    let field = String(value ?? '');
    if (/^[\t\r ]*[=+\-@]/.test(field)) field = `'${field}`;
    return `"${field.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `chi-white-seller-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [range, setRange] = useState('7d');
  const [section, setSection] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (selectedRange = range) => {
    setLoading(true);
    setError('');
    try {
      const result = await reportApi.getDashboard(selectedRange);
      setDashboard(result);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load seller analytics.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadDashboard(range);
  }, [loadDashboard, range]);

  useEffect(() => {
    const refresh = () => { void loadDashboard(); };
    window.addEventListener('inventory-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('inventory-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadDashboard]);

  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem('chi_seller_theme') === 'dark');
    } catch {
      setDarkMode(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chi_seller_theme', darkMode ? 'dark' : 'light');
    } catch {
      setError('Theme preference could not be saved in this browser.');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavOpen]);

  const productMetrics = useMemo(() => new Map(
    dashboard.products.map((product) => [product.id, product])
  ), [dashboard.products]);

  const navTo = (id) => {
    if (navigation.find((item) => item.id === id)?.available) {
      setSection(id === 'analytics' ? 'overview' : id);
      setMobileNavOpen(false);
    }
  };

  const sectionName = navigation.find((item) => item.id === section)?.label || 'Dashboard';
  const metrics = dashboard.metrics;
  const lowStock = dashboard.products.filter((product) => product.stock_quantity > 0 && product.stock_quantity <= 10);
  const outOfStock = dashboard.products.filter((product) => product.stock_quantity <= 0);

  return <div className={`seller-dashboard${darkMode ? ' seller-theme-dark' : ''}`}>
    <a className="seller-skip-link" href="#seller-main-content">Skip to dashboard content</a>
    {mobileNavOpen && <button className="seller-mobile-scrim" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close seller navigation" />}
    <aside className={`seller-sidebar${mobileNavOpen ? ' is-mobile-open' : ''}`} aria-label="Seller workspace navigation">
      <a className="seller-brand" href="/dashboard">
        <span className="seller-brand-mark">C</span>
        <span><strong>CHI-WHITE</strong><small>SELLER STUDIO</small></span>
      </a>
      <div className="seller-store-switcher">
        <span className="seller-store-avatar">{(user?.name || 'C').charAt(0).toUpperCase()}</span>
        <span><strong>{user?.name || 'Store owner'}</strong><small>{user?.role === 'SUPER_ADMIN' ? 'Platform admin' : 'Seller account'}</small></span>
        <ChevronRight size={15} aria-hidden="true" />
      </div>
      <nav className="seller-nav">
        {navigation.map((item, index) => item.section
          ? <p className="seller-nav-section" key={item.section}>{item.section}</p>
          : <button
            type="button"
            key={item.id}
            className={`seller-nav-link${section === item.id || (item.id === 'analytics' && section === 'overview') ? ' is-active' : ''}${!item.available ? ' is-disabled' : ''}`}
            onClick={() => navTo(item.id)}
            disabled={!item.available}
            aria-current={section === item.id ? 'page' : undefined}
            title={!item.available ? `${item.label} is not available in this store yet` : undefined}
          >
            <item.icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
            {!item.available && <span className="seller-nav-soon">Soon</span>}
          </button>)}
      </nav>
      <div className="seller-sidebar-bottom">
        <div className="seller-plan-card"><span>SELLER WORKSPACE</span><p>Performance and catalog tools for Chi-White.</p></div>
        <button type="button" className="seller-signout" onClick={onLogout}><X size={15} /> Sign out</button>
      </div>
    </aside>

    <div className="seller-main">
      <header className="seller-topbar">
        <button type="button" className="seller-mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open seller navigation" aria-expanded={mobileNavOpen}><Menu size={20} /></button>
        <div className="seller-breadcrumb"><span>Seller workspace</span><ChevronRight size={14} /><strong>{sectionName}</strong></div>
        <div className="seller-top-actions">
          <button type="button" className="seller-icon-button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button type="button" className="seller-refresh" onClick={() => void loadDashboard()} disabled={loading}>
            <Activity size={15} /> {loading ? 'Updating…' : 'Refresh'}
          </button>
          <span className="seller-user-avatar" aria-label={user?.name}>{(user?.name || 'C').charAt(0).toUpperCase()}</span>
        </div>
      </header>

      <main className="seller-content" id="seller-main-content">
        <div className="seller-page-heading">
          <div>
            <p className="seller-eyebrow">CHI-WHITE / BUSINESS OVERVIEW</p>
            <h1>{section === 'overview' || section === 'analytics' ? 'Your store at a glance' : sectionName}</h1>
            <p className="seller-subtitle">
              {section === 'overview' || section === 'analytics'
                ? 'A clear view of sales, orders, stock and customer growth.'
                : section === 'products' ? 'Manage your active collection, prices, imagery and size-level stock.'
                  : section === 'inventory' ? 'Review available stock and identify products that need attention.'
                    : section === 'orders' ? 'Track recorded order volumes and their current statuses.'
                      : section === 'customers' ? 'Understand registered customer-account totals and recent sign-ups.'
                        : 'Export the sales and product data currently tracked by your store.'}
            </p>
          </div>
          <div className="seller-heading-actions">
            {lastUpdated && <span className="seller-updated">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" className="seller-export-button" onClick={() => downloadCsv(dashboard)}><Download size={15} /> Export CSV</button>
          </div>
        </div>

        {error && <p className="seller-error" role="alert">{error}</p>}

        {(section === 'overview' || section === 'analytics') && <>
          <section className="seller-kpis seller-kpis-primary" aria-label="Sales performance">
            <article className="seller-kpi-card">
              <span className="seller-kpi-icon is-violet"><CircleDollarSign size={19} /></span>
              <p>Sales today</p><strong>{formatZmw(metrics.salesToday)}</strong><Trend value={dashboard.trends.today} />
            </article>
            <article className="seller-kpi-card">
              <span className="seller-kpi-icon is-blue"><BarChart3 size={19} /></span>
              <p>Sales this week</p><strong>{formatZmw(metrics.salesThisWeek)}</strong><Trend value={dashboard.trends.week} />
            </article>
            <article className="seller-kpi-card">
              <span className="seller-kpi-icon is-green"><Activity size={19} /></span>
              <p>Sales this month</p><strong>{formatZmw(metrics.salesThisMonth)}</strong><Trend value={dashboard.trends.month} />
            </article>
            <article className="seller-kpi-card">
              <span className="seller-kpi-icon is-amber"><CircleDollarSign size={19} /></span>
              <p>Total revenue</p><strong>{formatZmw(metrics.totalRevenue)}</strong>
              <span className="seller-kpi-caption">Completed sales and paid orders</span>
            </article>
          </section>

          <section className="seller-kpis seller-kpis-secondary" aria-label="Store health">
            {[
              ['Pending orders', metrics.pendingOrders, 'is-amber'],
              ['Completed orders', metrics.completedOrders, 'is-green'],
              ['Cancelled orders', metrics.cancelledOrders, 'is-rose'],
              ['Returned orders', metrics.returnedOrders, 'is-violet'],
              ['Total products', metrics.totalProducts, 'is-blue'],
              ['Out of stock', metrics.outOfStockProducts, 'is-rose'],
              ['Active customers', metrics.activeCustomers, 'is-violet'],
              ['New customers this week', metrics.newCustomersThisWeek, 'is-green']
            ].map(([label, value, color]) => <article className="seller-mini-kpi" key={label}>
              <span className={`seller-mini-dot ${color}`} />
              <span>{label}</span><strong>{loading ? '—' : value}</strong>
            </article>)}
          </section>

          <div className="seller-analytics-grid">
            <section className="seller-panel seller-chart-panel">
              <div className="seller-panel-heading">
                <div><h2>Sales analytics</h2><p>Recorded sales and placed orders over time</p></div>
                <div className="seller-range-tabs" role="group" aria-label="Sales chart range">
                  {[['7d', '7D'], ['30d', '30D'], ['12m', '12M']].map(([value, label]) => <button key={value} type="button" className={range === value ? 'is-selected' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}
                </div>
              </div>
              <SalesChart series={dashboard.salesSeries} range={range} />
            </section>

            <section className="seller-panel seller-order-panel">
              <div className="seller-panel-heading"><div><h2>Order activity</h2><p>Current recorded order statuses</p></div><ClipboardList size={18} /></div>
              <div className="seller-order-total"><strong>{metrics.pendingOrders + metrics.completedOrders + metrics.cancelledOrders}</strong><span>orders in the store</span></div>
              {[
                ['Pending', metrics.pendingOrders, 'is-amber'],
                ['Completed', metrics.completedOrders, 'is-green'],
                ['Cancelled', metrics.cancelledOrders, 'is-rose'],
                ['Returns recorded', metrics.returnedOrders, 'is-violet']
              ].map(([label, value, color]) => <div className="seller-status-row" key={label}>
                <span><i className={`seller-status-dot ${color}`} />{label}</span><strong>{value}</strong>
              </div>)}
              <p className="seller-panel-footnote">Order acceptance, dispatch and delivery updates are not currently available in the order system.</p>
            </section>
          </div>

          <div className="seller-analytics-grid seller-bottom-grid">
            <section className="seller-panel">
              <div className="seller-panel-heading"><div><h2>Top products</h2><p>Ranked by units sold; all-time</p></div><button className="seller-text-action" onClick={() => setSection('products')}>View products <ChevronRight size={14} /></button></div>
              {dashboard.products.length
                ? <div className="seller-top-products">{dashboard.products.slice(0, 5).map((product, index) => <div className="seller-top-product" key={product.id}>
                  <span className="seller-product-rank">{String(index + 1).padStart(2, '0')}</span>
                  {product.image_url ? <img src={product.image_url} alt="" /> : <span className="seller-product-placeholder"><Package size={17} /></span>}
                  <span className="seller-product-info"><strong>{product.name}</strong><small>{product.category} · {product.units_sold} sold</small></span>
                  <strong className="seller-product-revenue">{formatZmw(product.revenue)}</strong>
                </div>)}</div>
                : <div className="seller-inline-empty">Product performance will show after your first sale.</div>}
            </section>

            <section className="seller-panel">
              <div className="seller-panel-heading"><div><h2>Inventory attention</h2><p>{metrics.lowStockProducts} products at or below reorder level</p></div><button className="seller-text-action" onClick={() => setSection('inventory')}>Manage stock <ChevronRight size={14} /></button></div>
              <div className="seller-stock-summary">
                <div><span className="seller-stock-indicator is-rose" /><span>Out of stock</span><strong>{metrics.outOfStockProducts}</strong></div>
                <div><span className="seller-stock-indicator is-amber" /><span>Low stock</span><strong>{metrics.lowStockProducts}</strong></div>
              </div>
              {lowStock.length || outOfStock.length
                ? <div className="seller-attention-list">{[...outOfStock, ...lowStock].slice(0, 4).map((product) => <div key={product.id}>
                  <span>{product.name}</span><strong className={product.stock_quantity <= 0 ? 'is-out' : 'is-low'}>{product.stock_quantity <= 0 ? 'Out of stock' : `${product.stock_quantity} left`}</strong>
                </div>)}</div>
                : <p className="seller-stock-clear">All active products currently have stock above the low-stock threshold.</p>}
            </section>
          </div>

          <section className="seller-data-notice">
            <ShieldCheck size={18} />
            <div><strong>Analytics you can trust</strong><p>Customer behavior, product views, searches, reviews, sentiment, location, profit, and marketing performance are not tracked by the current system. These metrics are intentionally not estimated.</p></div>
          </section>
        </>}

        {section === 'products' && <ProductManager productMetrics={productMetrics} />}

        {section === 'inventory' && <section className="seller-panel seller-inventory-panel">
          <div className="seller-panel-heading"><div><h2>Inventory overview</h2><p>Current product availability and size-level stock</p></div><span className="seller-stock-summary-total">{metrics.totalProducts} active products</span></div>
          {dashboard.products.length
            ? <div className="seller-table-wrap"><table className="seller-table">
              <thead><tr><th>Product</th><th>Category</th><th>Size availability</th><th>Total stock</th><th>Status</th></tr></thead>
              <tbody>{dashboard.products.map((product) => <tr key={product.id}>
                <td><div className="seller-table-product">{product.image_url ? <img src={product.image_url} alt="" /> : <span><Package size={16} /></span>}<strong>{product.name}</strong></div></td>
                <td>{product.category}</td>
                <td>{product.sizes?.filter((size) => Number(size.quantity) > 0).map((size) => `${size.size === 'ONE_SIZE' ? 'One size' : size.size}: ${size.quantity}`).join(' · ') || 'No available sizes'}</td>
                <td>{product.stock_quantity}</td>
                <td><span className={`seller-stock-badge ${product.stock_quantity <= 0 ? 'is-out' : product.stock_quantity <= 10 ? 'is-low' : 'is-in-stock'}`}>{product.stock_quantity <= 0 ? 'Out of stock' : product.stock_quantity <= 10 ? 'Low stock' : 'In stock'}</span></td>
              </tr>)}</tbody>
            </table></div>
            : <div className="seller-inline-empty">There are no active products to display.</div>}
        </section>}

        {section === 'orders' && <div className="seller-section-stack">
          <section className="seller-kpis seller-kpis-secondary">
            {[
              ['Pending orders', metrics.pendingOrders, 'is-amber'],
              ['Completed orders', metrics.completedOrders, 'is-green'],
              ['Cancelled orders', metrics.cancelledOrders, 'is-rose'],
              ['Returned orders', metrics.returnedOrders, 'is-violet']
            ].map(([label, value, color]) => <article className="seller-mini-kpi" key={label}><span className={`seller-mini-dot ${color}`} /><span>{label}</span><strong>{value}</strong></article>)}
          </section>
          <section className="seller-data-notice"><ShoppingBag size={18} /><div><strong>Order lifecycle tools are not connected yet</strong><p>The API records checkout orders and completed point-of-sale sales, but does not yet expose an order list or accept, reject, ship, deliver, or return-status workflow. The counts above reflect the records that are available.</p></div></section>
        </div>}

        {section === 'customers' && <div className="seller-section-stack">
          <section className="seller-kpis seller-kpis-primary">
            <article className="seller-kpi-card"><span className="seller-kpi-icon is-violet"><Users size={19} /></span><p>Active customer accounts</p><strong>{metrics.activeCustomers}</strong><span className="seller-kpi-caption">Registered accounts marked active</span></article>
            <article className="seller-kpi-card"><span className="seller-kpi-icon is-green"><Activity size={19} /></span><p>New this week</p><strong>{metrics.newCustomersThisWeek}</strong><span className="seller-kpi-caption">Registered accounts created this week</span></article>
          </section>
          <section className="seller-data-notice"><Users size={18} /><div><strong>Customer directory and behavior analytics are not available</strong><p>The current system does not provide a seller-facing customer directory, messaging, customer location, browsing events, or campaign consent data.</p></div></section>
        </div>}

        {section === 'reports' && <div className="seller-section-stack">
          <section className="seller-panel seller-report-panel">
            <div className="seller-panel-heading"><div><h2>Store performance report</h2><p>Export metrics and product performance currently available in the system.</p></div><FileBarChart size={20} /></div>
            <div className="seller-report-items">
              <div><span>Sales report</span><small>Daily, weekly and monthly sales plus trend series</small><strong>Available</strong></div>
              <div><span>Product report</span><small>Units sold, recorded revenue and current stock</small><strong>Available</strong></div>
              <div><span>Inventory report</span><small>Active product and size availability data</small><strong>Available</strong></div>
              <div><span>Customer, review and location reports</span><small>These events and data are not currently collected</small><strong className="seller-unavailable">Not tracked</strong></div>
            </div>
            <button type="button" className="seller-export-button" onClick={() => downloadCsv(dashboard)}><Download size={15} /> Download CSV report</button>
            <button type="button" className="seller-export-button seller-print-button" onClick={() => window.print()}><FileBarChart size={15} /> Print / save as PDF</button>
          </section>
        </div>}

        {loading && <div className="seller-loading-overlay" role="status">Refreshing store performance…</div>}
        <footer className="seller-footer"><span>CHI-WHITE SELLER STUDIO</span><span>{user?.role === 'SUPER_ADMIN' ? 'Platform administrator access' : 'Seller workspace'} · Data from the current store records</span></footer>
      </main>
    </div>
  </div>;
}
