import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi, getCartId } from '../services/api.js';

const CartContext = createContext(null);
const emptySummary = { subtotal: 0, discount: 0, total: 0, eligibleQuantity: 0, promotionApplied: false };
const guestCartKey = 'chi_guest_cart';

function readGuestCart() {
  const saved = JSON.parse(localStorage.getItem(guestCartKey) || '[]');
  if (!Array.isArray(saved)) throw new Error('Your saved bag is invalid. Clear it and try again.');
  return saved;
}

function saveGuestCart(items) {
  localStorage.setItem(guestCartKey, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [cartError, setCartError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartId] = useState(getCartId);

  const applyCart = useCallback((response) => {
    setCart(response.cart.items);
    setSummary({
      subtotal: Number(response.cart.subtotal),
      discount: Number(response.cart.discount),
      total: Number(response.cart.total),
      eligibleQuantity: Number(response.cart.eligibleQuantity),
      promotionApplied: response.cart.promotionApplied
    });
  }, []);

  const applyGuestCart = useCallback((items) => {
    setCart(items);
    const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const eligibleQuantity = items.reduce((sum, item) => {
      return sum + (['SHIRT', 'HOODIE'].includes(String(item.category).toUpperCase())
        ? Number(item.quantity)
        : 0);
    }, 0);
    setSummary({
      subtotal: Math.round(subtotal * 100) / 100,
      discount: 0,
      total: Math.round(subtotal * 100) / 100,
      eligibleQuantity,
      promotionApplied: false
    });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem('pos_token')) {
      try {
        applyGuestCart(readGuestCart());
        setCartError('');
      } catch (error) {
        setCartError(error instanceof Error ? error.message : 'Unable to load your saved bag.');
      }
      return;
    }

    setLoading(true);
    try {
      const guestItems = readGuestCart();
      for (const item of guestItems) {
        await cartApi.add(item.id, Number(item.quantity), cartId);
        const remaining = readGuestCart().filter((savedItem) => savedItem.id !== item.id);
        saveGuestCart(remaining);
        applyGuestCart(remaining);
      }
      applyCart(await cartApi.get(cartId));
      setCartError('');
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to load your cart.');
    } finally {
      setLoading(false);
    }
  }, [applyCart, applyGuestCart, cartId]);

  useEffect(() => {
    void refreshCart();
    window.addEventListener('auth-changed', refreshCart);
    return () => window.removeEventListener('auth-changed', refreshCart);
  }, [refreshCart]);

  const runCartRequest = useCallback(async (request) => {
    setCartError('');
    try {
      applyCart(await request());
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to update your cart.');
      throw error;
    }
  }, [applyCart]);

  const addToCart = useCallback((product) => {
    if (localStorage.getItem('pos_token')) return runCartRequest(() => cartApi.add(product.id, 1, cartId));
    const items = readGuestCart();
    const existing = items.find((item) => item.id === product.id);
    const stock = Number(product.stock_quantity ?? product.quantity ?? 0);
    if (Number(existing?.quantity || 0) >= stock) {
      throw new Error(`Not enough stock available for ${product.name}.`);
    }
    const next = existing
      ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { ...product, price: Number(product.price), stock_quantity: stock, quantity: 1 }];
    saveGuestCart(next);
    applyGuestCart(next);
    return Promise.resolve();
  }, [applyGuestCart, cartId, runCartRequest]);

  const changeQuantity = useCallback((id, delta) => {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return Promise.resolve();
    const quantity = item.quantity + delta;
    if (!localStorage.getItem('pos_token')) {
      const items = readGuestCart().flatMap((savedItem) => {
        if (savedItem.id !== id) return [savedItem];
        return quantity < 1 ? [] : [{ ...savedItem, quantity }];
      });
      saveGuestCart(items);
      applyGuestCart(items);
      return Promise.resolve();
    }
    return runCartRequest(() => quantity < 1
      ? cartApi.remove(id, cartId)
      : cartApi.update(id, quantity, cartId));
  }, [applyGuestCart, cart, cartId, runCartRequest]);

  const clearCart = useCallback(async ({ syncServer = true } = {}) => {
    if (!localStorage.getItem('pos_token')) {
      saveGuestCart([]);
      applyGuestCart([]);
      setCartError('');
      return;
    }
    if (syncServer) {
      await runCartRequest(() => cartApi.clear(cartId));
      return;
    }
    saveGuestCart([]);
    setCart([]);
    setSummary(emptySummary);
    setCartError('');
  }, [applyGuestCart, cartId, runCartRequest]);

  const value = useMemo(() => ({
    cart,
    cartId,
    cartError,
    loading,
    addToCart,
    changeQuantity,
    clearCart,
    refreshCart,
    subtotal: summary.subtotal,
    discount: summary.discount,
    total: summary.total,
    eligibleQuantity: summary.eligibleQuantity,
    promotionApplied: summary.promotionApplied
  }), [cart, cartId, cartError, loading, addToCart, changeQuantity, clearCart, refreshCart, summary]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}