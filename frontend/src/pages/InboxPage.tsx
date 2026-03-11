import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInboxReviews, updateInboxStatus, deleteInboxReview } from '../utils/storage';
import type { InboxReview, ReviewStatus } from '../types';

type FilterTab = 'all' | 'needs_reply' | 'reply_generated' | 'posted';

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  needs_reply: { label: 'Needs Reply', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  reply_generated: { label: 'Reply Ready', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  posted: { label: 'Posted', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
};

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😡',
};

export const InboxPage = () => {
  const [reviews, setReviews] = useState<InboxReview[]>(getInboxReviews());
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const counts = useMemo(() => ({
    all: reviews.length,
    needs_reply: reviews.filter(r => r.status === 'needs_reply').length,
    reply_generated: reviews.filter(r => r.status === 'reply_generated').length,
    posted: reviews.filter(r => r.status === 'posted').length,
  }), [reviews]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    return reviews.filter(r => r.status === filter);
  }, [reviews, filter]);

  const handleStatusChange = (id: string, status: ReviewStatus) => {
    updateInboxStatus(id, status);
    setReviews(getInboxReviews());
    showToast(status === 'posted' ? 'Marked as posted!' : 'Status updated!');
  };

  const handleDelete = (id: string) => {
    deleteInboxReview(id);
    setReviews(getInboxReviews());
    showToast('Review removed from inbox.');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Failed to copy — please copy manually.');
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'needs_reply', label: `Needs Reply (${counts.needs_reply})` },
    { key: 'reply_generated', label: `Reply Ready (${counts.reply_generated})` },
    { key: 'posted', label: `Posted (${counts.posted})` },
  ];

  return (
    <div className="page-inbox">
      <div className="page-header">
        <h1 className="page-title">Review Inbox</h1>
        <p className="page-subtitle">
          Track every review from analysis to posted reply. Never miss a response.
        </p>
      </div>

      {/* Stats bar */}
      <div className="inbox-stats">
        <div className="inbox-stat">
          <span className="inbox-stat-value" style={{ color: '#f59e0b' }}>{counts.needs_reply}</span>
          <span className="inbox-stat-label">Awaiting Reply</span>
        </div>
        <div className="inbox-stat">
          <span className="inbox-stat-value" style={{ color: '#3b82f6' }}>{counts.reply_generated}</span>
          <span className="inbox-stat-label">Reply Ready</span>
        </div>
        <div className="inbox-stat">
          <span className="inbox-stat-value" style={{ color: '#10b981' }}>{counts.posted}</span>
          <span className="inbox-stat-label">Posted</span>
        </div>
        <div className="inbox-stat">
          <span className="inbox-stat-value">{counts.all}</span>
          <span className="inbox-stat-label">Total</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="inbox-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`inbox-tab ${filter === tab.key ? 'inbox-tab--active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review list */}
      {filtered.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📬</span>
            <h3>{reviews.length === 0 ? 'Your inbox is empty' : 'No reviews match this filter'}</h3>
            <p className="muted-text">
              {reviews.length === 0
                ? 'Reviews you analyze will automatically appear here for tracking.'
                : 'Try a different filter to see your reviews.'}
            </p>
            {reviews.length === 0 && (
              <Link to="/analyze" className="primary-button" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>
                Analyze Reviews
              </Link>
            )}
          </div>
        </section>
      ) : (
        <ul className="inbox-list">
          {filtered.map(review => {
            const isExpanded = expandedId === review.id;
            const config = STATUS_CONFIG[review.status];

            return (
              <li key={review.id} className="inbox-item card">
                <div
                  className="inbox-item-header"
                  onClick={() => setExpandedId(isExpanded ? null : review.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setExpandedId(isExpanded ? null : review.id)}
                >
                  <div className="inbox-item-left">
                    <span className={`pill pill-${review.sentiment}`}>
                      {SENTIMENT_EMOJI[review.sentiment]} {review.sentiment}
                    </span>
                    <span className="inbox-item-preview">
                      {review.reviewText.slice(0, 100)}{review.reviewText.length > 100 ? '...' : ''}
                    </span>
                  </div>
                  <div className="inbox-item-right">
                    <span
                      className="inbox-status-badge"
                      style={{ color: config.color, background: config.bg }}
                    >
                      {config.label}
                    </span>
                    <span className="inbox-item-date">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="inbox-item-expand">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="inbox-item-details">
                    <div className="inbox-detail-section">
                      <h4 className="inbox-detail-title">Customer Review</h4>
                      <p className="inbox-detail-text">{review.reviewText}</p>
                    </div>

                    <div className="inbox-detail-section">
                      <h4 className="inbox-detail-title">Generated Reply</h4>
                      <p className="inbox-detail-text inbox-detail-reply">{review.reply}</p>
                    </div>

                    <div className="inbox-detail-meta">
                      <span className="muted-text">
                        {review.businessName} &middot; {review.tone} tone &middot;{' '}
                        {new Date(review.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {review.postedAt && (
                        <span className="muted-text" style={{ color: '#10b981' }}>
                          Posted {new Date(review.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <div className="inbox-item-actions">
                      <button
                        type="button"
                        className="secondary-button secondary-button-sm"
                        onClick={() => handleCopy(review.reply)}
                      >
                        Copy Reply
                      </button>

                      {review.status !== 'posted' && (
                        <button
                          type="button"
                          className="primary-button primary-button-sm"
                          onClick={() => handleStatusChange(review.id, 'posted')}
                        >
                          Mark as Posted
                        </button>
                      )}

                      {review.status === 'posted' && (
                        <button
                          type="button"
                          className="secondary-button secondary-button-sm"
                          onClick={() => handleStatusChange(review.id, 'reply_generated')}
                        >
                          Unmark Posted
                        </button>
                      )}

                      <button
                        type="button"
                        className="danger-button-sm"
                        onClick={() => handleDelete(review.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
};
