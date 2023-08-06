import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

const CATEGORIES = ['movies', 'books', 'electronics', 'restaurants'];

function Stars({ value }) {
  const full = Math.round(value);
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export default function ProductList() {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [] });
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'movies', description: '' });

  const load = () => {
    api
      .listProducts({ category, q })
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(load, [category, q]);

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct(newItem);
      setNewItem({ name: '', category: 'movies', description: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <header className="hero">
        <h1>What are people really saying?</h1>
        <p className="muted">
          Browse movies, books, electronics and restaurants — each with an
          AI-generated pros &amp; cons summary distilled from real reviews.
        </p>
      </header>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chips">
          <button className={!category ? 'chip active' : 'chip'} onClick={() => setCategory('')}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? 'chip active' : 'chip'}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {user && (
          <button className="btn btn-sm" onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? 'Cancel' : '+ Add item'}
          </button>
        )}
      </div>

      {showAdd && (
        <form className="card add-form" onSubmit={addProduct}>
          <input
            placeholder="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            required
          />
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="Short description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          />
          <button className="btn">Save</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      <div className="grid">
        {data.items.map((p) => (
          <Link to={`/products/${p._id}`} key={p._id} className="card product-card">
            <span className="tag">{p.category}</span>
            <h3>{p.name}</h3>
            <p className="muted clamp">{p.description || 'No description yet.'}</p>
            <div className="rating-row">
              <Stars value={p.ratingAvg} />
              <span className="muted">
                {p.ratingAvg || 0} · {p.reviewCount} review{p.reviewCount === 1 ? '' : 's'}
              </span>
            </div>
          </Link>
        ))}
        {!data.items.length && !error && <p className="muted">No items found.</p>}
      </div>
    </>
  );
}
