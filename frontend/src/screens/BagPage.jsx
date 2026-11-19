'use client';

import Link from 'next/link';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';

export default function BagPage({ user }) {
  const { cart, cartError, changeQuantity, subtotal } = useCart();

  return <section className="bag-page">
    <div className="eyebrow">CHI-WHITE / YOUR BAG</div>
    <h1>Your bag</h1>
    {cartError && <p className="error" role="alert">{cartError}</p>}
    {!cart.length
      ? <div className="bag-empty"><p className="muted">Your bag is waiting for its first piece.</p><Link className="secondary" href="/catalog">Explore the collection</Link></div>
      : <>
        <div className="bag-items">
          {cart.map((item) => <article className="bag-item" key={`${item.id}-${item.size || 'ONE_SIZE'}`}>
            {item.image_url
              ? <img src={assetUrl(item.image_url)} alt="" loading="lazy" />
              : <div className="bag-item-placeholder" aria-hidden="true">CHI-WHITE</div>}
            <div className="bag-item-details">
              <span className="tag">{item.category}</span>
              <h2>{item.name}</h2>
              <span className="bag-item-size">Size: {item.size === 'ONE_SIZE' ? 'One size' : item.size}</span>
              <span className="muted">{formatZmw(item.price)} each</span>
              <div className="qty" aria-label={`${item.name} quantity`}>
                <button type="button" onClick={() => void changeQuantity(item.id, -1, item.size || 'ONE_SIZE').catch(() => undefined)} aria-label={`Remove one ${item.name}`}>−</button>
                <span aria-live="polite">{item.quantity}</span>
                <button type="button" onClick={() => void changeQuantity(item.id, 1, item.size || 'ONE_SIZE').catch(() => undefined)} disabled={item.quantity >= Number(item.stock_quantity ?? item.quantity)} aria-label={`Add one ${item.name}`}>+</button>
              </div>
            </div>
            <strong>{formatZmw(Number(item.price) * Number(item.quantity))}</strong>
          </article>)}
        </div>
        <div className="bag-total"><span>Subtotal</span><strong>{formatZmw(subtotal)}</strong></div>
        <p className="muted">Delivery and any eligible offer are confirmed at checkout.</p>
        {user
          ? <Link className="primary bag-continue" href="/checkout">Continue to checkout</Link>
          : <div className="bag-signin">
            <p className="muted">Sign in or create an account to continue to checkout. Your bag will be saved.</p>
            <Link className="primary bag-continue" href="/login">Sign in to checkout</Link>
            <Link href="/signup">Create an account</Link>
          </div>}
      </>}
  </section>;
}
