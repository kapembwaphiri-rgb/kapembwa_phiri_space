'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Menu, Moon, ShoppingBag, Sun, UserRound, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import CartDrawer from './CartDrawer.jsx';
import ProfileMenu from './ProfileMenu.jsx';

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
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
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
      <div className="header-nav-area">
        {showBack && <button className="back-button" type="button" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} /><span>Back</span>
        </button>}
        <button className="header-action menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="category-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="header-action-label">Menu</span>
        </button>
      </div>

      <Link href="/" className="brand-lockup" aria-label="Chi-White home">
        <span className="brand-name">CHI-WHITE</span>
      </Link>

      <div className="header-actions">
        <button type="button" className="header-action theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={theme === 'dark'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="header-action-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        {user
          ? <ProfileMenu user={user} onLogout={onLogout} />
          : <Link className="header-action" href="/login" aria-label="Sign in"><UserRound size={19} /><span className="header-action-label">Sign in</span></Link>}
        <button ref={bagButtonRef} className="header-action bag-action" type="button" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${itemCount} items`} aria-haspopup="dialog">
          <span className="header-action-icon"><ShoppingBag size={19} strokeWidth={1.6} /><span className="cart-count">{itemCount}</span></span>
          <span className="header-action-label">Bag</span>
        </button>
      </div>
    </div>
    <nav id="category-navigation" className={`category-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
      {categories.map((category) => <Link
        key={category.href}
        href={category.href}
        className={pathname === category.href ? 'category-link active' : 'category-link'}
        onClick={() => setMenuOpen(false)}
      >{category.label}</Link>)}
      {user?.role === 'CUSTOMER' && <>
        <Link href="/account" className="category-link" onClick={() => setMenuOpen(false)}>My account</Link>
        <Link href="/orders" className="category-link" onClick={() => setMenuOpen(false)}>My orders</Link>
      </>}
    </nav>
    <CartDrawer open={cartOpen} onClose={closeCart} user={user} />
  </header>;
}