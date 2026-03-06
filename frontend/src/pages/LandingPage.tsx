import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getWaitlistEmail, saveWaitlistEmail } from '../utils/storage';

export const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(!!getWaitlistEmail());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        saveWaitlistEmail(email.trim());
        setSubmitted(true);
        if (data.position) setWaitlistCount(data.position);
      } else {
        setError(data.error || data.message || 'Something went wrong');
      }
    } catch {
      setError('Could not connect to server. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing">
      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-nav-logo">ReviewReply AI</span>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
            <Link to="/" className="landing-nav-cta">Open Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-badge">Built for Restaurants</div>
        <h1 className="landing-hero-title">
          Turn Bad Reviews Into<br />
          <span className="landing-hero-gradient">Loyal Customers</span>
        </h1>
        <p className="landing-hero-subtitle">
          AI-powered response generator built specifically for restaurants.
          Analyze sentiment, craft professional replies, and discover actionable
          insights from your Google reviews — in seconds, not hours.
        </p>
        <div className="landing-hero-actions">
          <Link to="/analyze" className="landing-btn-primary">
            Try Free — 15 Reviews/Month
          </Link>
          <a href="#pricing" className="landing-btn-secondary">
            View Pricing
          </a>
        </div>
        <p className="landing-hero-note">No credit card required. Start analyzing reviews today.</p>
      </section>

      {/* Social proof */}
      <section className="landing-proof">
        <div className="landing-proof-inner">
          <div className="landing-proof-stat">
            <span className="landing-proof-number">50+</span>
            <span className="landing-proof-label">Response Templates</span>
          </div>
          <div className="landing-proof-divider" />
          <div className="landing-proof-stat">
            <span className="landing-proof-number">10</span>
            <span className="landing-proof-label">Restaurant Categories</span>
          </div>
          <div className="landing-proof-divider" />
          <div className="landing-proof-stat">
            <span className="landing-proof-number">&lt; 2s</span>
            <span className="landing-proof-label">Per Response</span>
          </div>
          <div className="landing-proof-divider" />
          <div className="landing-proof-stat">
            <span className="landing-proof-number">PDF</span>
            <span className="landing-proof-label">Reports Included</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <h2 className="landing-section-title">
          Everything Your Restaurant Needs
        </h2>
        <p className="landing-section-subtitle">
          Purpose-built tools that understand the restaurant industry.
        </p>

        <div className="landing-features">
          <div className="landing-feature-card">
            <span className="landing-feature-icon">🍽️</span>
            <h3 className="landing-feature-title">Restaurant-Smart Replies</h3>
            <p className="landing-feature-desc">
              Our AI understands food service. It detects mentions of food quality,
              wait times, staff behavior, and crafts replies that reference specific
              issues — not generic templates.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-icon">📊</span>
            <h3 className="landing-feature-title">Sentiment Analysis</h3>
            <p className="landing-feature-desc">
              Instantly see how customers feel about your food, service, ambiance,
              and pricing. Track your reputation score over time.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-icon">🔍</span>
            <h3 className="landing-feature-title">Actionable Insights</h3>
            <p className="landing-feature-desc">
              10 restaurant-specific categories highlight exactly what to fix —
              kitchen timing, food temperature, order accuracy, cleanliness, and more.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-icon">📄</span>
            <h3 className="landing-feature-title">PDF Reports</h3>
            <p className="landing-feature-desc">
              Generate branded PDF analysis reports to share with your team,
              investors, or use in staff meetings to drive improvements.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-icon">🎯</span>
            <h3 className="landing-feature-title">Lead Finder</h3>
            <p className="landing-feature-desc">
              Discover restaurants in any city that are struggling with reviews.
              Perfect for agencies and consultants who offer review management services.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-icon">📥</span>
            <h3 className="landing-feature-title">Batch Processing</h3>
            <p className="landing-feature-desc">
              Paste 20 reviews at once. Get instant sentiment analysis, categorized
              insights, and professional responses for every single one.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-subtitle">Three simple steps to better reviews.</p>

        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3 className="landing-step-title">Paste Reviews</h3>
            <p className="landing-step-desc">
              Copy reviews from Google and paste them into ReviewReply AI. We detect multiple reviews automatically.
            </p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3 className="landing-step-title">Analyze & Generate</h3>
            <p className="landing-step-desc">
              Our AI analyzes sentiment, detects specific topics (food, staff, pricing), and generates contextual replies.
            </p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3 className="landing-step-title">Respond & Improve</h3>
            <p className="landing-step-desc">
              Copy responses to Google, export reports, and use insights to improve your restaurant operations.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section">
        <h2 className="landing-section-title">Simple, Transparent Pricing</h2>
        <p className="landing-section-subtitle">Start free. Upgrade when you need more.</p>

        <div className="landing-pricing">
          <div className="landing-price-card">
            <div className="landing-price-header">
              <h3 className="landing-price-name">Free</h3>
              <div className="landing-price-amount">
                <span className="landing-price-dollar">$0</span>
                <span className="landing-price-period">/month</span>
              </div>
            </div>
            <ul className="landing-price-features">
              <li>15 reviews per month</li>
              <li>Sentiment analysis</li>
              <li>Restaurant-smart replies</li>
              <li>Basic insights</li>
              <li>CSV export</li>
            </ul>
            <Link to="/analyze" className="landing-price-btn">Get Started Free</Link>
          </div>

          <div className="landing-price-card landing-price-card--popular">
            <div className="landing-price-popular-badge">Most Popular</div>
            <div className="landing-price-header">
              <h3 className="landing-price-name">Starter</h3>
              <div className="landing-price-amount">
                <span className="landing-price-dollar">$19</span>
                <span className="landing-price-period">/month</span>
              </div>
            </div>
            <ul className="landing-price-features">
              <li>100 reviews per month</li>
              <li>Everything in Free</li>
              <li>PDF reports</li>
              <li>Advanced insights dashboard</li>
              <li>Priority support</li>
              <li>Lead Finder (5 searches/day)</li>
            </ul>
            <button type="button" className="landing-price-btn landing-price-btn--primary" onClick={() => document.getElementById('waitlist-email')?.focus()}>
              Join Waitlist
            </button>
          </div>

          <div className="landing-price-card">
            <div className="landing-price-header">
              <h3 className="landing-price-name">Pro</h3>
              <div className="landing-price-amount">
                <span className="landing-price-dollar">$49</span>
                <span className="landing-price-period">/month</span>
              </div>
            </div>
            <ul className="landing-price-features">
              <li>Unlimited reviews</li>
              <li>Everything in Starter</li>
              <li>Multi-location support</li>
              <li>Unlimited Lead Finder</li>
              <li>White-label PDF reports</li>
              <li>API access</li>
            </ul>
            <button type="button" className="landing-price-btn" onClick={() => document.getElementById('waitlist-email')?.focus()}>
              Join Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="landing-section">
        <div className="landing-waitlist-card">
          <h2 className="landing-waitlist-title">
            Get Early Access
          </h2>
          <p className="landing-waitlist-subtitle">
            Join the waitlist for Starter and Pro plans. Free tier is available now.
          </p>

          {submitted ? (
            <div className="landing-waitlist-success">
              <span className="landing-waitlist-check">✓</span>
              <p>You&apos;re on the list! We&apos;ll notify you when paid plans launch.</p>
              {waitlistCount && <p className="landing-waitlist-position">Position #{waitlistCount}</p>}
            </div>
          ) : (
            <form className="landing-waitlist-form" onSubmit={handleSubmit}>
              <input
                id="waitlist-email"
                type="email"
                className="landing-waitlist-input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="landing-waitlist-btn" disabled={submitting}>
                {submitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}
          {error && <p className="landing-waitlist-error">{error}</p>}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">ReviewReply AI</span>
          <span className="landing-footer-copy">Built for restaurants that care about their reputation.</span>
        </div>
      </footer>
    </div>
  );
};
