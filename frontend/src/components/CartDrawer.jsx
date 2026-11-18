'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Minus, Plus, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { formatZmw } from '../utils/currency.js';

export default function CartDrawer({ open, onClose, user }) {
  const { cart, cartError, changeQuantity, subtotal, discount, total, eligibleQuantity, promotionApplied } = useCart();
  const closeButtonRef = useRef(null);
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  const remaining = Math.max(0, 4 - eligibleQuantity);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const drawer = closeButtonRef.current?.closest('[role="dialog"]');
      const focusable = drawer?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return <div className="cart-drawer-layer">
    <button className="cart-drawer-backdrop" type="button" onClick={onClose} aria-label="Close shopping bag" tabIndex={-1} />
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <div className="cart-drawer-header">
        <div>
          <span className="eyebrow">CHI-WHITE</span>
          <h2 id="cart-drawer-title">Your bag <span>({itemCount})</span></h2>
        </div>
        <button ref={closeButtonRef} className="drawer-icon-button" type="button" onClick={onClose} aria-label="Close shopping bag"><X size={21} /></button>
      </div>

      {cartError && <p className="error" role="alert">{cartError}</p>}
      {cart.length > 0 && <div className={promotionApplied ? 'drawer-promotion is-active' : 'drawer-promotion'}>
        <strong>{promotionApplied ? '20% offer unlocked' : 'A little more, a little less'}</strong>
        <span>{promotionApplied
          ? `You saved ${formatZmw(discount)} on your order.`
          : `Add ${remaining} more eligible ${remaining === 1 ? 'piece' : 'pieces'} to unlock 20% off.`}</span>
        <div className="drawer-progress" aria-label={`${Math.min(eligibleQuantity, 4)} of 4 eligible pieces`}>
          <span style={{ width: `${Math.min(eligibleQuantity / 4, 1) * 100}%` }} />
        </div>
        <small>{Math.min(eligibleQuantity, 4)} / 4 eligible pieces</small>
      </div>}

      <div className="cart-drawer-items">
        {!cart.length
          ? <div className="drawer-empty"><p>Your bag is waiting for its first piece.</p><Link className="secondary" href="/catalog" onClick={onClose}>Explore the collection</Link></div>
          : cart.map((item) => <article className="drawer-item" key={`${item.id}-${item.size || 'ONE_SIZE'}`}>
            {item.image_url
              ? <img src={item.image_url} alt="" loading="lazy" />
              : <div className="drawer-item-placeholder" aria-hidden="true">CHI-WHITE</div>}
            <div className="drawer-item-details">
              <span className="drawer-item-category">{item.category}</span>
              <strong>{item.name}</strong>
              <span className="drawer-item-size">Size: {item.size === 'ONE_SIZE' ? 'One size' : item.size}</span>
              <span>{formatZmw(item.price)} each</span>
              <div className="drawer-quantity" aria-label={`${item.name} quantity`}>
                <button type="button" onClick={() => void changeQuantity(item.id, -1, item.size || 'ONE_SIZE').catch(() => undefined)} aria-label={`Remove one ${item.name}, size ${item.size || 'one size'}`}><Minus size={13} /></button>
                <span aria-live="polite">{item.quantity}</span>
                <button type="button" onClick={() => void changeQuantity(item.id, 1, item.size || 'ONE_SIZE').catch(() => undefined)} disabled={item.quantity >= Number(item.stock_quantity ?? item.quantity)} aria-label={`Add one ${item.name}, size ${item.size || 'one size'}`}><Plus size={13} /></button>
              </div>
            </div>
            <strong className="drawer-line-total">{formatZmw(Number(item.price) * Number(item.quantity))}</strong>
          </article>)}
      </div>

      {cart.length > 0 && <div className="cart-drawer-summary">
        <div><span>Subtotal</span><strong>{formatZmw(subtotal)}</strong></div>
        {discount > 0 && <div className="drawer-discount"><span>20% clothing offer</span><strong>−{formatZmw(discount)}</strong></div>}
        <div className="drawer-total"><span>Total</span><strong>{formatZmw(total)}</strong></div>
        <p>Delivery details are confirmed during checkout.</p>
        <Link className="primary drawer-checkout" href={user ? '/checkout' : '/login'} onClick={onClose}>
          {user ? 'Continue to checkout' : 'Sign in to checkout'} <ArrowRight size={16} />
        </Link>
        <Link className="drawer-view-bag" href="/bag" onClick={onClose}>View bag details</Link>
      </div>}
    </aside>
  </div>;
}
