import { Receipt } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { formatZmw } from '../utils/currency.js';

export default function CartSidebar({ formId, disabled = false, actionLabel = 'Place order' }) {
	const { cart, cartError, changeQuantity, subtotal, discount, total, eligibleQuantity, promotionApplied } = useCart();
	const remaining = Math.max(0, 4 - eligibleQuantity);
	return <aside className="cart">
		<div className="cart-summary-heading"><h2>Your bag</h2><span className="muted">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
		{cartError && <p className="error" role="alert">{cartError}</p>}
		{!cart.length
			? <p className="muted cart-empty">Your bag is ready for its first piece.</p>
			: cart.map((product) => <div className="cart-line" key={`${product.id}-${product.size || 'ONE_SIZE'}`}>
				<div><strong>{product.name}</strong><small>Size: {product.size === 'ONE_SIZE' ? 'One size' : product.size} · {formatZmw(product.price)} each</small></div>
				<div className="qty" aria-label={`${product.name} quantity`}>
					<button type="button" onClick={() => changeQuantity(product.id, -1, product.size || 'ONE_SIZE').catch(() => undefined)} aria-label={`Remove one ${product.name}`}>-</button>
					<span aria-live="polite">{product.quantity}</span>
					<button type="button" onClick={() => changeQuantity(product.id, 1, product.size || 'ONE_SIZE').catch(() => undefined)} disabled={product.quantity >= Number(product.stock_quantity ?? product.quantity)} aria-label={`Add one ${product.name}`}>+</button>
				</div>
			</div>)}
		{cart.length > 0 && <>
			<div className={promotionApplied ? 'bulk-offer active' : 'bulk-offer'}>
				<strong>{promotionApplied ? 'Chi-White offer applied' : 'A little more, a little less'}</strong>
				<span>{promotionApplied ? `You save ${formatZmw(discount)} on your order.` : `Add ${remaining} more ${remaining === 1 ? 'piece' : 'pieces'} to unlock 20% off.`}</span>
			</div>
			<div className="total"><span>Subtotal</span><strong>{formatZmw(subtotal)}</strong></div>
			{discount > 0 && <div className="cart-line cart-discount"><span>Chi-White offer</span><strong>−{formatZmw(discount)}</strong></div>}
			<div className="total"><span>Total</span><strong>{formatZmw(total)}</strong></div>
		</>}
		<button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:scale-95 transition transform duration-150 ease-in-out primary cart-checkout" disabled={!cart.length || disabled} type="submit" form={formId}>
			<Receipt size={16} style={{ verticalAlign: '-3px' }} /> {actionLabel}
		</button>
	</aside>;
}