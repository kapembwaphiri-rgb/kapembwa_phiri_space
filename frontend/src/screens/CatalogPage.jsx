'use client';

import { useEffect, useState } from 'react';
import { Search, WifiOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { productApi } from '../services/api.js';

function newestFirst(products) {
  return [...products].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export default function CatalogPage({ initialCategory = '' }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { cartError } = useCart();
  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const updateProducts = () => productApi.list({ search, category })
      .then((data) => {
        if (!active) return;
        setProducts(newestFirst(data.products));
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load products.');
      });
    updateProducts().finally(() => { if (active) setLoading(false); });
    const online = () => setOffline(false); const offlineHandler = () => setOffline(true);
    const refresh = () => { void updateProducts(); };
    const refreshWhenVisible = () => { if (!document.hidden) refresh(); };
    const refreshInterval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    addEventListener('online', online);
    addEventListener('offline', offlineHandler);
    addEventListener('inventory-updated', refresh);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      removeEventListener('online', online);
      removeEventListener('offline', offlineHandler);
      removeEventListener('inventory-updated', refresh);
    };
  }, [search, category]);
  const heading = category === 'SHIRT' ? 'Plain shirts'
    : category === 'HOODIE' ? 'Plain hoodies'
      : category === 'DESIGNER' ? 'Designer clothing' : 'The collection';
  return <>
    {offline && <div className="notice"><WifiOff size={15} style={{ verticalAlign: '-3px' }} /> Offline · reconnect to load products and update your cart.</div>}
    {error && <p className="error" role="alert">{error}</p>}
    {cartError && <p className="error" role="alert">{cartError}</p>}
    <section className="product-collection">
      <div className="catalog-filters">
        <div className="catalog-heading"><div className="eyebrow">CHI-WHITE / ZAMBIA</div><h1>{heading}</h1></div>
        <div className="catalog-search">
          <Search size={17} aria-hidden="true" />
          <input className="search" placeholder="Search by name, SKU, or description" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" />
        </div>
        <label className="catalog-category-label">
          Category
          <select className="search" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All products</option>
            <option value="SHIRT">Plain white shirts</option>
            <option value="HOODIE">Hoodies</option>
            <option value="DESIGNER">Designer clothes</option>
          </select>
        </label>
      </div>
      <p className="collection-note">Plain white essentials, considered hoodies, and selected designer pieces.</p>
      {loading && <p className="muted" role="status">Loading the collection…</p>}
      {!loading && !error && !products.length && <div className="empty-products"><h2>No products found</h2><p className="muted">Try another search or check back when the collection is updated.</p></div>}
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  </>;
}