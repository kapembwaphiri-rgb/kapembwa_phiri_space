import { Plus, Shirt } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { formatZmw } from '../utils/currency.js';

export default function ProductCard({ product }) {
	const { addToCart } = useCart();
	const [added, setAdded] = useState(false);
	const [error, setError] = useState('');
	const stock = Number(product.stock_quantity ?? product.quantity ?? 0);
	const categoryLabel = product.category === 'SHIRT' ? 'Plain Shirts'
		: product.category === 'HOODIE' ? 'Plain Hoodies' : 'Designer Clothing';
	const handleAdd = async () => {
		setError('');
		try {
			await addToCart(product);
			setAdded(true);
			window.setTimeout(() => setAdded(false), 700);
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Unable to add this item.');
		}
	};
	return <article className="product">
		{product.image_url || product.image
			? <img className="product-image" src={product.image_url || product.image} alt={product.name} loading="lazy" />
			: <div className="product-image product-image-placeholder" aria-hidden="true"><Shirt size={42} strokeWidth={1.2} /></div>}
		<div className="product-heading"><h3>{product.name}</h3><span className="price">{formatZmw(product.price)}</span></div>
		<p className="muted product-description-text">{product.description || `Everyday quality · ${categoryLabel}`}</p>
		<p className={stock ? 'stock' : 'low'}>{stock ? `${stock} available` : 'Currently unavailable'}</p>
		{error && <p className="error" role="alert">{error}</p>}
		<button className={`product-add ${added ? 'product-add-success' : ''}`} onClick={() => void handleAdd()} disabled={!stock} aria-label={`Add ${product.name} to bag`}>{added ? 'Added to bag' : <>Add to bag <Plus size={14} /></>}</button>
	</article>;
}