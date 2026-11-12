'use client';

import { useEffect, useState } from 'react';
import { Search, WifiOff } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { productApi } from '../services/api.js';

export default function CatalogPage({ initialCategory = '' }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { cartError } = useCart();
  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    productApi.list({ search, category })
      .then((data) => { if (active) setProducts(data.products); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    const online = () => setOffline(false); const offlineHandler = () => setOffline(true);
    addEventListener('online', online);
    addEventListener('offline', offlineHandler);
    const inventoryUpdated = () => {
      productApi.list({ search, category })
        .then((data) => setProducts(data.products))
        .catch((requestError) => setError(requestError.message));
    };
    addEventListener('inventory-updated', inventoryUpdated);
    return () => {
      active = false;
      removeEventListener('online', online);
      removeEventListener('offline', offlineHandler);
      removeEventListener('inventory-updated', inventoryUpdated);
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