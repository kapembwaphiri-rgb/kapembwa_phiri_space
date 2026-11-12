'use client';

import { useEffect, useState } from 'react';
import { Download, Receipt, WifiOff } from 'lucide-react';
import CheckoutForm from '../components/CheckoutForm.jsx';
import CartSidebar from '../components/CartSidebar.jsx';
import { useCart } from '../context/CartContext.jsx';
import { orderApi } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';
import { downloadReceipt } from '../utils/receipt.js';

export default function CheckoutPage() {
  const { cart, cartId, clearCart, cartError } = useCart();
  const [cashierName, setCashierName] = useState('Chi-White staff');
  const [customerName, setCustomerName] = useState('');
  const [payment, setPayment] = useState('CASH_ON_DELIVERY');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) setCashierName(JSON.parse(storedUser).name || 'Chi-White staff');
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    addEventListener('online', online);
    addEventListener('offline', offlineHandler);
    return () => {
      removeEventListener('online', online);
      removeEventListener('offline', offlineHandler);
    };
  }, []);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!cart.length || submitting) return;
    setError('');
    setMessage('');
    if (offline) {
      setError('Checkout needs an internet connection. Your bag has been kept.');
      return;
    }

    setSubmitting(true);
    try {
      const { order } = await orderApi.checkout({
        cartId,
        customer: { name: customerName },
        paymentMethod: payment
      });
      setLastSale({
        id: order.id,
        receiptNumber: order.orderNumber,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        items: order.items.map((item) => ({
          id: item.productId,
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        })),
        payment: { method: order.paymentMethod, reference: order.paymentReference },
        createdAt: new Date().toISOString()
      });
      setMessage(order.status === 'PROCESSING'
        ? 'Your order is confirmed. Payment is due on delivery.'
        : 'Your order is confirmed. Receipt ready.');
      await clearCart({ syncServer: false });
      window.dispatchEvent(new Event('inventory-updated'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to complete checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <div className="header">
      <div><div className="eyebrow">Chi-White / checkout</div><h1>Complete your order</h1><p className="muted">Review your bag and choose how to pay.</p></div>
      {offline && <div className="notice"><WifiOff size={15} style={{ verticalAlign: '-3px' }} /> Offline</div>}
    </div>
    {message && <div className="notice" role="status">{message}</div>}
    {error && <p className="error" role="alert">{error}</p>}
    {cartError && <p className="error" role="alert">{cartError}</p>}
    <div className="grid checkout">
      <section className="panel">
        <h2>Customer and payment</h2>
        <p className="muted">Add the customer details before confirming this order.</p>
        <CheckoutForm
          customerName={customerName}
          setCustomerName={setCustomerName}
          payment={payment}
          setPayment={setPayment}
          onSubmit={placeOrder}
          disabled={submitting || offline}
        />
      </section>
      <CartSidebar
        formId="checkout-form"
        disabled={submitting || offline}
        actionLabel={submitting ? 'Placing order…' : 'Confirm order'}
      />
    </div>
    {lastSale && <section className="panel receipt" aria-live="polite">
      <h2><Receipt size={20} style={{ verticalAlign: '-3px' }} /> Order summary</h2>
      <p className="muted">Order {lastSale.receiptNumber} · {customerName}</p>
      <div className="receipt-items">
        {lastSale.items.map((item) => <div className="cart-line" key={item.id}>
          <span>{item.name} × {item.quantity}</span><strong>{formatZmw(item.lineTotal)}</strong>
        </div>)}
      </div>
      <p className="muted">Subtotal: {formatZmw(lastSale.subtotal)} · Chi-White offer: −{formatZmw(lastSale.discount)}</p>
      <div className="total"><span>Total</span><strong>{formatZmw(lastSale.total)}</strong></div>
      <p className="muted">Payment: {lastSale.payment.method}</p>
      <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:scale-95 transition transform duration-150 ease-in-out" onClick={() => downloadReceipt(lastSale, { cashierName, customerName })}>
        <Download size={16} style={{ verticalAlign: '-3px' }} /> Download receipt
      </button>
    </section>}
  </>;
}
