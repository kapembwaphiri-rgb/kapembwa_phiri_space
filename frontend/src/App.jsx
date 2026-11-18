'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './screens/HomePage.jsx';
import CatalogPage from './screens/CatalogPage.jsx';
import BagPage from './screens/BagPage.jsx';
import CheckoutPage from './screens/CheckoutPage.jsx';
import DashboardPage from './screens/DashboardPage.jsx';
import { useCart } from './context/CartContext.jsx';

export default function App() {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshCart } = useCart();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cached = localStorage.getItem('pos_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_token');
      }
    }
    setReady(true);
  }, []);
  const logout = () => {
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_token');
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
    router.push('/');
  };

  const manager = ['MANAGER', 'SUPER_ADMIN'].includes(user?.role);
  const categoryRoutes = {
    '/catalog/white-shirts': 'SHIRT',
    '/catalog/hoodies': 'HOODIE',
    '/catalog/designer': 'DESIGNER'
  };
  let page;
  if (pathname === '/' || pathname === '/catalog' || categoryRoutes[pathname]) {
    page = <CatalogPage initialCategory={categoryRoutes[pathname] || ''} />;
  } else if (pathname === '/login' || pathname === '/signup') {
    page = <HomePage user={user} onLogin={setUser} refreshCart={refreshCart} mode={pathname === '/signup' ? 'signup' : 'login'} />;
  } else if (pathname === '/bag') {
    page = <BagPage user={user} />;
  } else if (pathname === '/checkout') {
    page = user ? <CheckoutPage /> : null;
  } else if (pathname === '/dashboard') {
    page = manager ? <DashboardPage user={user} onLogout={logout} /> : null;
  }

  useEffect(() => {
    if (!ready) return;
    if (page) return;
    if (pathname === '/checkout' && !user) {
      router.replace('/login');
    } else if (pathname === '/dashboard' && !manager) {
      router.replace(user ? '/catalog' : '/login');
    } else if (pathname !== '/' && pathname !== '/login' && pathname !== '/signup') {
      router.replace('/');
    }
  }, [manager, page, pathname, ready, router, user]);

  if (!ready) return <div className="app-loading" role="status">Loading Chi-White…</div>;

  return <MainLayout user={user} onLogout={logout}>{page || <HomePage user={user} onLogin={setUser} refreshCart={refreshCart} />}</MainLayout>;
}