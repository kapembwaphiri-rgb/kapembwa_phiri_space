'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

const categories = [
  { label: 'Plain Shirts', href: '/catalog/white-shirts' },
  { label: 'Plain hoodies', href: '/catalog/hoodies' },
  { label: 'Designer', href: '/catalog/designer' },
  { label: 'Shop all', href: '/catalog' }
];

export default function Navbar({ user, onLogout }) {
  const pathname = usePathname();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = cart.reduce((total, item) => total + Number(item.quantity), 0);

  return <header className="site-header">
    <div className="header-main">
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
      </div>

      <Link href="/" className="brand-lockup" aria-label="Chi-White home">
        <span className="angel-mark"><Image src="/fallen-angel.jpg" alt="" fill sizes="34px" priority /></span>
        <span className="brand-name">CHI-WHITE</span>
      </Link>

      <Link className="header-action bag-action" href="/bag" aria-label={`Shopping bag, ${itemCount} items`}>
        <span className="header-action-icon"><ShoppingBag size={19} strokeWidth={1.6} /><span className="cart-count">{itemCount}</span></span>
        <span className="header-action-label">Bag</span>
      </Link>

      <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="category-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
    </div>
    <nav id="category-navigation" className={`category-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Clothing categories">
      {categories.map((category) => <Link
        key={category.href}
        href={category.href}
        className={pathname === category.href ? 'category-link active' : 'category-link'}
        onClick={() => setMenuOpen(false)}
      >{category.label}</Link>)}
      {user && <Link href="/checkout" className="category-link mobile-checkout" onClick={() => setMenuOpen(false)}>Checkout</Link>}
    </nav>
  </header>;
}