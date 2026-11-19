'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './screens/HomePage.jsx';
import CatalogPage from './screens/CatalogPage.jsx';
import BagPage from './screens/BagPage.jsx';
import CheckoutPage from './screens/CheckoutPage.jsx';
import DashboardPage from './screens/DashboardPage.jsx';
import CustomerDashboardPage from './screens/CustomerDashboardPage.jsx';
import OrdersPage from './screens/OrdersPage.jsx';
import ProfilePage from './screens/ProfilePage.jsx';
import { useCart } from './context/CartContext.jsx';
import { authApi } from './services/api.js';

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
        const cachedUser = JSON.parse(cached);
        setUser(cachedUser);
        if (localStorage.getItem('pos_token')) {
          authApi.profile()
            .then(({ profile }) => {
              const synchronizedUser = { ...cachedUser, ...profile };
              setUser(synchronizedUser);
              localStorage.setItem('pos_user', JSON.stringify(synchronizedUser));
            })
            .catch((error) => {
              if (error instanceof Error && /401|expired|invalid/i.test(error.message)) {
                localStorage.removeItem('pos_user');
                localStorage.removeItem('pos_token');
                setUser(null);
              }
            });
        }
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

  const updateProfile = useCallback((profile) => {
    setUser((current) => current ? { ...current, ...profile } : current);
  }, []);
  useEffect(() => {
    if (user) localStorage.setItem('pos_user', JSON.stringify(user));
  }, [user]);

  const manager = ['MANAGER', 'SUPER_ADMIN'].includes(user?.role);
  const customer = user?.role === 'CUSTOMER';
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
    page = user ? <CheckoutPage user={user} /> : null;
  } else if (pathname === '/dashboard') {
    page = manager ? <DashboardPage user={user} onLogout={logout} /> : null;
  } else if (pathname === '/account') {
    page = customer ? <CustomerDashboardPage user={user} /> : null;
  } else if (pathname === '/orders') {
    page = customer ? <OrdersPage /> : null;
  } else if (pathname === '/profile') {
    page = user ? <ProfilePage user={user} onProfileUpdate={updateProfile} /> : null;
  }

  useEffect(() => {
    if (!ready) return;
    if (page) return;
    if (['/checkout', '/profile', '/account', '/orders'].includes(pathname) && !user) {
      router.replace('/login');
    } else if (['/dashboard', '/account', '/orders'].includes(pathname) && !manager && !customer) {
      router.replace(user ? '/catalog' : '/login');
    } else if (pathname !== '/' && pathname !== '/login' && pathname !== '/signup') {
      router.replace('/');
    }
  }, [customer, manager, page, pathname, ready, router, user]);

  if (!ready) return <div className="app-loading" role="status">Loading Chi-White…</div>;

  return <MainLayout user={user} onLogout={logout}>{page || <HomePage user={user} onLogin={setUser} refreshCart={refreshCart} />}</MainLayout>;
}