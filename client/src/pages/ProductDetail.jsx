import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

function Stars({ value }) {
  const full = Math.round(value);
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [form, setForm] = useState({ rating: 5, text: '' });
  const [error, setError] = useState('');

  const loadReviews = () => api.listReviews(id).then((d) => setReviews(d.reviews));

  const loadSummary = () => {
    setSummaryLoading(true);
    api
      .getSummary(id)
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setSummaryLoading(false));
  };

  const refresh = () => {
    api.getProduct(id).then(setProduct).catch((e) => setError(e.message));
    loadReviews();
    loadSummary();
  };

  useEffect(refresh, [id]);

  const addReview = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.addReview(id, { rating: Number(form.rating), text: form.text });
      setForm({ rating: 5, text: '' });
      // Writing a review invalidated the summary cache server-side; refetch.
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeReview = async (reviewId) => {
    try {
      await api.deleteReview(id, reviewId);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeProduct = async () => {
    if (!confirm('Delete this product and all its reviews?')) return;
    try {
      await api.deleteProduct(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!product) return <p className="muted">Loading…</p>;

  return (
    <div className="detail">
      <button className="link-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="detail-head">
        <div>
          <span className="tag">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="rating-row">
            <Stars value={product.ratingAvg} />
            <span className="muted">
              {product.ratingAvg || 0} · {product.reviewCount} review
              {product.reviewCount === 1 ? '' : 's'}
            </span>
          </div>
          <p>{product.description}</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-danger btn-sm" onClick={removeProduct}>
            Delete item
          </button>
        )}
      </div>

      <section className="card summary">
        <div className="summary-head">
          <h2>✨ AI Summary</h2>
          {summary?.generatedBy && (
            <span className="muted small">via {summary.generatedBy}</span>
          )}
        </div>
        {summaryLoading && <p className="muted">Summarizing reviews…</p>}
        {summary && !summaryLoading && (
          <>
            <p className="verdict">{summary.verdict}</p>
            <div className="pros-cons">
              <div>
                <h4 className="pro">Pros</h4>
                <ul>{summary.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
              <div>
                <h4 className="con">Cons</h4>
                <ul>{summary.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            </div>
          </>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      {user ? (
        <form className="card" onSubmit={addReview}>
          <h3>Write a review</h3>
          <label>
            Rating
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} ★</option>
              ))}
            </select>
          </label>
          <textarea
            placeholder="Share your experience…"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            required
          />
          <button className="btn">Post review</button>
        </form>
      ) : (
        <p className="muted">Log in to write a review.</p>
      )}

      <section className="reviews">
        <h3>{reviews.length} Review{reviews.length === 1 ? '' : 's'}</h3>
        {reviews.map((r) => (
          <div className="card review" key={r._id}>
            <div className="review-head">
              <strong>{r.author?.name || 'Anonymous'}</strong>
              <Stars value={r.rating} />
            </div>
            <p>{r.text}</p>
            {user && (user.role === 'admin' || user.id === r.author?._id) && (
              <button className="link-btn danger" onClick={() => removeReview(r._id)}>
                Delete
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
