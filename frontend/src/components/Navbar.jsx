'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import CartDrawer from './CartDrawer.jsx';

const categories = [
  { label: 'Plain Shirts', href: '/catalog/white-shirts' },
  { label: 'Plain hoodies', href: '/catalog/hoodies' },
  { label: 'Designer', href: '/catalog/designer' },
  { label: 'Shop all', href: '/catalog' }
];

export default function Navbar({ user, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const bagButtonRef = useRef(null);
  const itemCount = cart.reduce((total, item) => total + Number(item.quantity), 0);
  const showBack = pathname !== '/' && pathname !== '/catalog';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const showCart = () => setCartOpen(true);
    window.addEventListener('cart-item-added', showCart);
    return () => window.removeEventListener('cart-item-added', showCart);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/catalog?search=${encodeURIComponent(query)}` : '/catalog');
  };

  const closeCart = useCallback(() => {
    setCartOpen(false);
    requestAnimationFrame(() => bagButtonRef.current?.focus());
  }, []);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/catalog');
  };

  return <header className="site-header">
    <div className="header-main">
      <div className="header-search-area">
        {showBack && <button className="back-button" type="button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} /><span>Back</span>
        </button>}
        <button className="header-action menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="category-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="header-action-label">Menu</span>
        </button>
        <form className="header-search" role="search" onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search the collection" placeholder="Search" />
          <button type="submit" aria-label="Submit search"><span className="header-search-submit">Go</span></button>
        </form>
      </div>

      <Link href="/" className="brand-lockup" aria-label="Chi-White home">
        <span className="brand-name">CHI-WHITE</span>
      </Link>

      <div className="header-actions">
        <details className="account-menu">
          <summary className="header-action" aria-label="Account options">
            <UserRound size={19} strokeWidth={1.6} /><span className="header-action-label">{user ? 'Account' : 'Sign in'}</span>
          </summary>
          <div className="account-popover">
            {user ? <>
              <span className="account-name">{user.name}</span>
              {['MANAGER', 'SUPER_ADMIN'].includes(user.role) && <Link href="/dashboard">Dashboard</Link>}
              <button type="button" onClick={onLogout}>Sign out</button>
            </> : <>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create an account</Link>
            </>}
          </div>
        </details>
        <button ref={bagButtonRef} className="header-action bag-action" type="button" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${itemCount} items`} aria-haspopup="dialog">
          <span className="header-action-icon"><ShoppingBag size={19} strokeWidth={1.6} /><span className="cart-count">{itemCount}</span></span>
          <span className="header-action-label">Bag</span>
        </button>
      </div>
    </div>
    <nav id="category-navigation" className={`category-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Clothing categories">
      {categories.map((category) => <Link
        key={category.href}
        href={category.href}
        className={pathname === category.href ? 'category-link active' : 'category-link'}
        onClick={() => setMenuOpen(false)}
      >{category.label}</Link>)}
      {user && <Link href="/checkout" className="category-link" onClick={() => setMenuOpen(false)}>Checkout</Link>}
    </nav>
    <CartDrawer open={cartOpen} onClose={closeCart} user={user} />
  </header>;
}