import { Check, Plus, Shirt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { formatZmw } from '../utils/currency.js';

export default function ProductCard({ product }) {
	const { addToCart } = useCart();
	const [added, setAdded] = useState(false);
	const [selectedImage, setSelectedImage] = useState(0);
	const [selectedSize, setSelectedSize] = useState(product.sizes?.length === 1 && Number(product.sizes[0].quantity) > 0
		? product.sizes[0].size : '');
	const [error, setError] = useState('');
	const images = product.images?.length ? product.images : [product.image_url || product.image].filter(Boolean);
	const stock = Number(product.stock_quantity ?? product.quantity ?? 0);
	const variants = product.sizes || [{ size: 'ONE_SIZE', quantity: stock }];
	const selectedStock = Number(variants.find((variant) => variant.size === selectedSize)?.quantity ?? stock);
	useEffect(() => {
		setSelectedImage(0);
		setSelectedSize((current) => product.sizes?.some((variant) => variant.size === current && Number(variant.quantity) > 0)
			? current
			: product.sizes?.length === 1 && Number(product.sizes[0].quantity) > 0 ? product.sizes[0].size : '');
	}, [product.id, product.images?.length, product.image_url, product.sizes]);
	const categoryLabel = product.category === 'SHIRT' ? 'Plain Shirts'
		: product.category === 'HOODIE' ? 'Plain Hoodies' : 'Designer Clothing';
	const handleAdd = async () => {
		if (!selectedSize) {
			setError('Choose a size before adding this piece to your bag.');
			return;
		}
		setError('');
		try {
			await addToCart(product, selectedSize);
			setAdded(true);
			window.dispatchEvent(new CustomEvent('cart-item-added', { detail: { productName: product.name } }));
			window.setTimeout(() => setAdded(false), 1400);
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Unable to add this item.');
		}
	};
	return <article className={`product${added ? ' product-is-added' : ''}`}>
		{images.length
			? <>
				<img className="product-image" src={images[selectedImage] || images[0]} alt={product.name} loading="lazy" />
				{images.length > 1 && <div className="product-gallery-thumbnails" aria-label={`${product.name} images`}>
					{images.map((image, index) => <button
						key={image}
						className={`product-gallery-thumbnail${selectedImage === index ? ' is-selected' : ''}`}
						type="button"
						onClick={() => setSelectedImage(index)}
						aria-label={`View ${product.name} image ${index + 1}`}
						aria-pressed={selectedImage === index}
					><img src={image} alt="" loading="lazy" /></button>)}
				</div>}
			</>
			: <div className="product-image product-image-placeholder" aria-hidden="true"><Shirt size={42} strokeWidth={1.2} /></div>}
		<div className="product-heading"><h3>{product.name}</h3><span className="price">{formatZmw(product.price)}</span></div>
		<p className="muted product-description-text">{product.description || `Everyday quality · ${categoryLabel}`}</p>
		<div className="product-sizes" aria-label={`Available sizes for ${product.name}`}>
			<span className="product-size-label">Choose size</span>
			<div className="product-size-options">
				{variants.map((variant) => {
					const available = Number(variant.quantity) > 0;
					return <button
						key={variant.size}
						className={`product-size-option${selectedSize === variant.size ? ' selected' : ''}`}
						type="button"
						disabled={!available}
						aria-pressed={selectedSize === variant.size}
						aria-label={`${variant.size === 'ONE_SIZE' ? 'One size' : variant.size}${available ? '' : ', sold out'}`}
						onClick={() => { setSelectedSize(variant.size); setError(''); }}
					>{variant.size === 'ONE_SIZE' ? 'One size' : variant.size}</button>;
				})}
			</div>
		</div>
		<p className={selectedSize ? selectedStock ? 'stock' : 'low' : stock ? 'stock' : 'low'}>
			{selectedSize
				? selectedStock ? `${selectedStock} available in size ${selectedSize === 'ONE_SIZE' ? 'One size' : selectedSize}` : `Size ${selectedSize} is unavailable`
				: stock ? `${stock} in stock · select a size` : 'Currently unavailable'}
		</p>
		{error && <p className="error" role="alert">{error}</p>}
		<button className={`product-add ${added ? 'product-add-success' : ''}`} onClick={() => void handleAdd()} disabled={!stock || !selectedSize} aria-label={added ? `${product.name} added to bag` : !stock ? `${product.name} is sold out` : !selectedSize ? `Choose a size for ${product.name}` : `Add ${product.name} to bag`}>
			{added ? <>Added to bag <Check size={15} /></> : !stock ? 'Sold out' : !selectedSize ? <>Select a size <Plus size={14} /></> : <>Add to bag <Plus size={14} /></>}
		</button>
	</article>;
}