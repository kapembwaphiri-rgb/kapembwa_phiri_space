'use client';

import { useEffect, useState } from 'react';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';

export default function StorefrontApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="app-loading">CHI-WHITE</div>;
  return <CartProvider><App /></CartProvider>;
}
