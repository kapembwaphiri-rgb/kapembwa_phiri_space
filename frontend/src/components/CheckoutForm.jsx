export default function CheckoutForm({ customerName, setCustomerName, payment, setPayment, onSubmit, disabled }) {
  return <form id="checkout-form" onSubmit={onSubmit}>
    <div className="field">
      <label htmlFor="customer-name">Customer name</label>
      <input id="customer-name" className="search" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter customer name" minLength={2} maxLength={120} required />
    </div>
    <div className="field">
      <label htmlFor="payment-method">Payment method</label>
      <select id="payment-method" value={payment} onChange={(event) => setPayment(event.target.value)} disabled={disabled}>
        <option value="CASH_ON_DELIVERY">Cash on delivery</option>
        <option value="CARD" disabled>Debit / credit card (unavailable)</option>
        <option value="AIRTEL_MONEY" disabled>Airtel Money (unavailable)</option>
        <option value="MTN_MOBILE_MONEY" disabled>MTN Mobile Money (unavailable)</option>
      </select>
      <p className="muted">Online payments are temporarily unavailable. Choose cash on delivery.</p>
    </div>
  </form>;
}