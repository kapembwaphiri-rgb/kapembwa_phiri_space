import { useCallback, useEffect, useState } from 'react';
import { productApi } from '../services/api.js';
import { formatZmw } from '../utils/currency.js';

const emptyProduct = {
  sku: '',
  name: '',
  description: '',
  category: 'SHIRT',
  price: '',
  stock: '',
  reorder_level: '10',
  image_url: ''
};

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const resetForm = () => {
    setForm(emptyProduct);
    setEditingId(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      reorder_level: Number(form.reorder_level),
      image_url: form.image_url.trim() || null
    };
    try {
      if (editingId) await productApi.update(editingId, payload);
      else await productApi.create(payload);
      await loadProducts();
      resetForm();
      setMessage(editingId ? 'Product updated.' : 'Product added to the collection.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      reorder_level: String(product.reorder_level),
      image_url: product.image_url || ''
    });
    setError('');
    setMessage('');
  };

  const deactivateProduct = async (product) => {
    if (!window.confirm(`Remove ${product.name} from the active collection?`)) return;
    setError('');
    setMessage('');
    try {
      await productApi.remove(product.id);
      await loadProducts();
      if (editingId === product.id) resetForm();
      setMessage('Product removed from the active collection.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to remove product.');
    }
  };

  return <section className="panel product-manager">
    <div className="product-manager-heading">
        <div><h2>Manage products</h2><p className="muted">Add and maintain white essentials, hoodies, and designer pieces.</p></div>
      {editingId && <button className="secondary" type="button" onClick={resetForm}>Cancel edit</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <form className="product-manager-form" onSubmit={submit}>
      <div className="product-form-grid">
        <div className="field"><label htmlFor="product-sku">SKU</label><input id="product-sku" className="search" name="sku" value={form.sku} onChange={changeField} maxLength={40} required /></div>
        <div className="field"><label htmlFor="product-name">Name</label><input id="product-name" className="search" name="name" value={form.name} onChange={changeField} maxLength={160} required /></div>
        <div className="field"><label htmlFor="product-category">Category</label><select id="product-category" name="category" value={form.category} onChange={changeField}><option value="SHIRT">Plain white shirt</option><option value="HOODIE">Hoodie</option><option value="DESIGNER">Designer clothing</option></select></div>
        <div className="field"><label htmlFor="product-price">Price (ZMW)</label><input id="product-price" className="search" name="price" type="number" min="0" step="0.01" value={form.price} onChange={changeField} required /></div>
        <div className="field"><label htmlFor="product-stock">Stock</label><input id="product-stock" className="search" name="stock" type="number" min="0" step="1" value={form.stock} onChange={changeField} required /></div>
        <div className="field"><label htmlFor="product-reorder">Reorder level</label><input id="product-reorder" className="search" name="reorder_level" type="number" min="0" step="1" value={form.reorder_level} onChange={changeField} required /></div>
        <div className="field"><label htmlFor="product-image">Image URL</label><input id="product-image" className="search" name="image_url" type="url" value={form.image_url} onChange={changeField} /></div>
        <div className="field"><label htmlFor="product-description">Description</label><textarea id="product-description" className="search product-description" name="description" value={form.description} onChange={changeField} maxLength={5000} /></div>
      </div>
      <button className="primary product-manager-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}</button>
    </form>

    {loading ? <p className="muted" role="status">Loading inventory…</p> : !products.length
      ? <p className="muted">No active products yet. Add the first piece above.</p>
      : <div className="product-manager-table-wrap"><table className="table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead><tbody>
        {products.map((product) => <tr key={product.id}>
          <td><strong>{product.name}</strong></td><td>{product.sku}</td><td>{product.category}</td>
          <td className={product.quantity <= product.reorder_level ? 'low' : ''}>{product.quantity}</td>
          <td>{formatZmw(product.price)}</td>
          <td className="product-actions"><button className="secondary" type="button" onClick={() => editProduct(product)}>Edit</button><button className="danger" type="button" onClick={() => void deactivateProduct(product)}>Remove</button></td>
        </tr>)}
      </tbody></table></div>}
  </section>;
}
