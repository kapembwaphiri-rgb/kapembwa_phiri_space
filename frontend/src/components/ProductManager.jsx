import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Search, X } from 'lucide-react';
import { assetUrl, productApi } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'];
const defaultSizes = () => sizeOptions
  .filter((size) => size !== 'ONE_SIZE')
  .map((size) => ({ size, quantity: '0' }));

const emptyProduct = {
  sku: '',
  name: '',
  description: '',
  category: 'SHIRT',
  price: '',
  sizes: defaultSizes(),
  reorder_level: '10',
  images: []
};

const maxProductImages = 10;
const maxImageBytes = 5 * 1024 * 1024;
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ProductManager({ productMetrics = new Map() }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [imageItems, setImageItems] = useState([]);
  const [draggingImages, setDraggingImages] = useState(false);
  const formRef = useRef(null);
  const imageInputRef = useRef(null);
  const previewUrlsRef = useRef(new Set());

  useEffect(() => () => {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
  }, []);

  const visibleProducts = useMemo(() => products
    .filter((product) => !categoryFilter || product.category === categoryFilter)
    .filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'stock') return Number(a.quantity) - Number(b.quantity) || a.name.localeCompare(b.name);
      if (sortBy === 'sales') return Number(productMetrics.get(b.id)?.units_sold || 0) - Number(productMetrics.get(a.id)?.units_sold || 0);
      return a.name.localeCompare(b.name);
    }), [products, categoryFilter, search, sortBy, productMetrics]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productApi.list();
      setProducts(result.products);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const changeField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const releasePreviewUrls = () => {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    previewUrlsRef.current.clear();
  };

  const resetForm = () => {
    releasePreviewUrls();
    setForm(emptyProduct);
    setImageItems([]);
    setEditingId(null);
  };

  const addImages = (fileList) => {
    const files = Array.from(fileList);
    const invalidType = files.some((file) => !acceptedImageTypes.has(file.type));
    const tooLarge = files.some((file) => file.size > maxImageBytes);
    const validFiles = files.filter((file) => acceptedImageTypes.has(file.type) && file.size <= maxImageBytes);
    if (invalidType || tooLarge) {
      setError('Use JPG, PNG, or WebP images no larger than 5 MB each.');
    } else {
      setError('');
    }
    if (!validFiles.length) return;
    if (imageItems.length + validFiles.length > maxProductImages) {
      setError(`A product can have up to ${maxProductImages} images.`);
      return;
    }
    const nextImages = validFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrlsRef.current.add(preview);
      return { id: crypto.randomUUID(), file, preview };
    });
    setImageItems((current) => [...current, ...nextImages]);
    setMessage('');
  };

  const moveImage = (index, direction) => {
    setImageItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };

  const removeImage = (imageId) => {
    const image = imageItems.find((item) => item.id === imageId);
    if (image?.file) {
      URL.revokeObjectURL(image.preview);
      previewUrlsRef.current.delete(image.preview);
    }
    setImageItems((current) => current.filter((item) => item.id !== imageId));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.sizes.length) {
      setError('Select at least one size and set its available stock.');
      return;
    }
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = new FormData();
      for (const field of ['sku', 'name', 'description', 'category', 'price', 'reorder_level']) {
        payload.append(field, form[field]);
      }
      payload.append('sizes', JSON.stringify(form.sizes.map((variant) => ({
        ...variant,
        quantity: Number(variant.quantity)
      }))));
      let uploadIndex = 0;
      payload.append('image_order', JSON.stringify(imageItems.map((image) => image.file
        ? { type: 'upload', index: uploadIndex++ }
        : { type: 'existing', value: image.url })));
      for (const image of imageItems) {
        if (image.file) payload.append('images', image.file);
      }
      if (editingId) await productApi.update(editingId, payload, setUploadProgress);
      else await productApi.create(payload, setUploadProgress);
      await loadProducts();
      window.dispatchEvent(new Event('inventory-updated'));
      resetForm();
      setMessage(editingId ? 'Product updated.' : 'Product added to the collection.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save product.');
    } finally {
      setUploadProgress(null);
      setSaving(false);
    }
  };

  const editProduct = (product) => {
    releasePreviewUrls();
    setEditingId(product.id);
    const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
    setImageItems(images.map((url, index) => ({ id: `${product.id}-${index}`, url, preview: assetUrl(url) })));
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: String(product.price),
      sizes: product.sizes?.length
        ? product.sizes.map((variant) => ({ size: variant.size, quantity: String(variant.quantity) }))
        : [{ size: 'ONE_SIZE', quantity: String(product.stock ?? product.quantity ?? 0) }],
      reorder_level: String(product.reorder_level),
      images
    });
    setError('');
    setMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const duplicateProduct = (product) => {
    releasePreviewUrls();
    setEditingId(null);
    const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
    setImageItems(images.map((url, index) => ({ id: `${product.id}-copy-${index}`, url, preview: assetUrl(url) })));
    setForm({
      sku: '',
      name: `${product.name} copy`,
      description: product.description || '',
      category: product.category,
      price: String(product.price),
      sizes: product.sizes?.length
        ? product.sizes.map((variant) => ({ size: variant.size, quantity: '0' }))
        : [{ size: 'ONE_SIZE', quantity: '0' }],
      reorder_level: String(product.reorder_level),
      images
    });
    setError('');
    setMessage('Product details copied. Enter a unique SKU and set the stock for each size.');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleSize = (size, enabled) => {
    setForm((current) => ({
      ...current,
      sizes: enabled
        ? [...current.sizes, { size, quantity: '0' }]
        : current.sizes.filter((variant) => variant.size !== size)
    }));
  };

  const changeSizeStock = (size, quantity) => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.map((variant) => variant.size === size ? { ...variant, quantity } : variant)
    }));
  };

  const deactivateProduct = async (product) => {
    if (!window.confirm(`Archive ${product.name}? It will be hidden from the active collection.`)) return;
    setError('');
    setMessage('');
    try {
      await productApi.remove(product.id);
      await loadProducts();
      window.dispatchEvent(new Event('inventory-updated'));
      if (editingId === product.id) resetForm();
      setSelectedProducts((current) => current.filter((id) => id !== product.id));
      setMessage('Product archived from the active collection.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to remove product.');
    }
  };

  const archiveSelected = async () => {
    if (!selectedProducts.length || !window.confirm(`Archive ${selectedProducts.length} selected products?`)) return;
    setSaving(true);
    setError('');
    const archived = [];
    try {
      for (const id of selectedProducts) {
        await productApi.remove(id);
        archived.push(id);
      }
      setMessage(`${archived.length} product${archived.length === 1 ? '' : 's'} archived.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Archived ${archived.length} products; unable to archive the rest.`);
    } finally {
      await loadProducts();
      setSelectedProducts((current) => current.filter((id) => !archived.includes(id)));
      if (archived.length) window.dispatchEvent(new Event('inventory-updated'));
      setSaving(false);
    }
  };

  const toggleProduct = (id, checked) => {
    setSelectedProducts((current) => checked
      ? [...new Set([...current, id])]
      : current.filter((productId) => productId !== id));
  };

  const toggleAllVisible = (checked) => {
    setSelectedProducts((current) => checked
      ? [...new Set([...current, ...visibleProducts.map((product) => product.id)])]
      : current.filter((id) => !visibleProducts.some((product) => product.id === id)));
  };

  return <section className="panel product-manager">
    <div className="product-manager-heading">
        <div><h2>Manage products</h2><p className="muted">Add and maintain white essentials, hoodies, and designer pieces.</p></div>
      {editingId && <button className="secondary" type="button" onClick={resetForm}>Cancel edit</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <form ref={formRef} className="product-manager-form" onSubmit={submit}>
      <div className="product-form-grid">
        <div className="field"><label htmlFor="product-sku">SKU</label><input id="product-sku" className="search" name="sku" value={form.sku} onChange={changeField} maxLength={40} required /></div>
        <div className="field"><label htmlFor="product-name">Name</label><input id="product-name" className="search" name="name" value={form.name} onChange={changeField} maxLength={160} required /></div>
        <div className="field"><label htmlFor="product-category">Category</label><select id="product-category" name="category" value={form.category} onChange={changeField}><option value="SHIRT">Plain white shirt</option><option value="HOODIE">Hoodie</option><option value="DESIGNER">Designer clothing</option></select></div>
        <div className="field"><label htmlFor="product-price">Price (ZMW)</label><input id="product-price" className="search" name="price" type="number" min="0" step="0.01" value={form.price} onChange={changeField} required /></div>
        <div className="field"><label htmlFor="product-reorder">Reorder level</label><input id="product-reorder" className="search" name="reorder_level" type="number" min="0" step="1" value={form.reorder_level} onChange={changeField} required /></div>
        <div className="field"><label htmlFor="product-description">Description</label><textarea id="product-description" className="search product-description" name="description" value={form.description} onChange={changeField} maxLength={5000} /></div>
      </div>
      <fieldset className="product-images-fieldset">
        <legend>Product images</legend>
        <p className="muted">Drop up to {maxProductImages} JPG, PNG, or WebP images. Each image can be up to 5 MB.</p>
        <label
          className={`product-image-dropzone${draggingImages ? ' is-dragging' : ''}`}
          htmlFor="product-images"
          onDragOver={(event) => { event.preventDefault(); setDraggingImages(true); }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDraggingImages(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDraggingImages(false);
            addImages(event.dataTransfer.files);
          }}
        >
          <input
            ref={imageInputRef}
            id="product-images"
            className="product-image-file-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            disabled={saving}
            onChange={(event) => {
              addImages(event.target.files);
              event.target.value = '';
            }}
            aria-describedby="product-image-help"
          />
          <ImagePlus size={24} aria-hidden="true" />
          <strong>Drag and drop product images here</strong>
          <span>or click to browse your device</span>
          <small id="product-image-help">First image is used as the product cover.</small>
        </label>
        {uploadProgress !== null && <div className="upload-progress" role="status" aria-live="polite">
          <span>Uploading images {uploadProgress}%</span><progress aria-label="Product image upload progress" max="100" value={uploadProgress}>{uploadProgress}%</progress>
        </div>}
        {imageItems.length > 0 && <div className="product-image-previews" aria-label="Product image previews">
          {imageItems.map((image, index) => <figure className="product-image-preview" key={image.id}>
            <img src={image.preview} alt={`${form.name || 'Product'} image ${index + 1}`} />
            <figcaption>{index === 0 ? 'Cover image' : `Image ${index + 1}`}</figcaption>
            <div className="product-image-preview-actions">
              <button type="button" className="secondary" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label={`Move image ${index + 1} earlier`}><ArrowUp size={14} /></button>
              <button type="button" className="secondary" onClick={() => moveImage(index, 1)} disabled={index === imageItems.length - 1} aria-label={`Move image ${index + 1} later`}><ArrowDown size={14} /></button>
              <button type="button" className="danger" onClick={() => removeImage(image.id)} aria-label={`Remove image ${index + 1}`}><X size={14} /></button>
            </div>
          </figure>)}
        </div>}
      </fieldset>
      <fieldset className="size-stock-fieldset">
        <legend>Sizes &amp; stock by size</legend>
        <p className="muted">Choose which sizes to sell and enter the quantity available for each.</p>
        <div className="size-stock-grid">
          {sizeOptions.map((size) => {
            const variant = form.sizes.find((item) => item.size === size);
            const displaySize = size === 'ONE_SIZE' ? 'One size' : size;
            return <div className={`size-stock-row${variant ? ' is-enabled' : ''}`} key={size}>
              <label htmlFor={`size-enabled-${size}`}>
                <input id={`size-enabled-${size}`} type="checkbox" checked={Boolean(variant)} onChange={(event) => toggleSize(size, event.target.checked)} />
                <span>{displaySize}</span>
              </label>
              <input
                id={`size-stock-${size}`}
                type="number"
                min="0"
                step="1"
                value={variant?.quantity ?? '0'}
                onChange={(event) => changeSizeStock(size, event.target.value)}
                disabled={!variant}
                aria-label={`${displaySize} stock quantity`}
              />
            </div>;
          })}
        </div>
      </fieldset>
      <button className="primary product-manager-submit" type="submit" disabled={saving}>{saving ? uploadProgress === null ? 'Saving…' : `Uploading ${uploadProgress}%…` : editingId ? 'Save changes' : 'Add product'}</button>
    </form>

    <div className="product-list-toolbar">
      <label className="product-list-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or SKU" aria-label="Search products" /></label>
      <label className="product-list-filter">Category
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter products by category">
          <option value="">All categories</option><option value="SHIRT">Plain shirts</option><option value="HOODIE">Hoodies</option><option value="DESIGNER">Designer</option>
        </select>
      </label>
      <label className="product-list-filter">Sort
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products">
          <option value="name">Name A–Z</option><option value="stock">Lowest stock</option><option value="sales">Best sellers</option>
        </select>
      </label>
      {selectedProducts.length > 0 && <button className="danger product-bulk-action" type="button" disabled={saving} onClick={() => void archiveSelected()}>Archive selected ({selectedProducts.length})</button>}
    </div>
    {loading ? <p className="muted" role="status">Loading inventory…</p> : !products.length
      ? <p className="muted">No active products yet. Add the first piece above.</p>
      : !visibleProducts.length ? <p className="muted">No products match these filters.</p>
      : <div className="product-manager-table-wrap"><table className="table"><thead><tr>
        <th><input type="checkbox" checked={visibleProducts.length > 0 && visibleProducts.every((product) => selectedProducts.includes(product.id))} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Select all visible products" /></th>
        <th>Product</th><th>SKU</th><th>Category</th><th>Stock by size</th><th>Units sold</th><th>Revenue</th><th>Price</th><th>Status</th><th>Actions</th>
      </tr></thead><tbody>
        {visibleProducts.map((product) => {
          const metrics = productMetrics.get(product.id);
          return <tr key={product.id}>
          <td><input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={(event) => toggleProduct(product.id, event.target.checked)} aria-label={`Select ${product.name}`} /></td>
          <td><span className="manager-product-name">{product.image_url ? <img src={assetUrl(product.image_url)} alt="" /> : <span className="manager-product-placeholder">CW</span>}<strong>{product.name}</strong></span></td><td>{product.sku}</td><td>{product.category}</td>
          <td className={product.quantity <= product.reorder_level ? 'low' : ''}>
            {product.sizes?.length
              ? product.sizes.filter((variant) => Number(variant.quantity) > 0).map((variant) => `${variant.size === 'ONE_SIZE' ? 'One size' : variant.size}: ${variant.quantity}`).join(' · ') || 'Out of stock'
              : product.quantity}
          </td><td>{metrics?.units_sold ?? 0}</td><td>{formatZmw(metrics?.revenue ?? 0)}</td>
          <td>{formatZmw(product.price)}</td><td>{product.quantity <= 0 ? 'Out of stock' : product.quantity <= product.reorder_level ? 'Low stock' : 'Active'}</td>
          <td className="product-actions"><button className="secondary" type="button" onClick={() => editProduct(product)}>Edit</button><button className="secondary" type="button" onClick={() => duplicateProduct(product)}>Duplicate</button><button className="danger" type="button" onClick={() => void deactivateProduct(product)}>Archive</button></td>
        </tr>;
        })}
      </tbody></table></div>}
  </section>;
}
