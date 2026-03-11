import { useMemo, useState } from 'react';
import type { AnalysisSession, BatchResponse, BatchResultItem, GeneratedResponse, Improvement, Sentiment, SentimentSummary, Tone } from '../types';
import { ToneSelector } from '../components/ToneSelector';
import { ResponseHistory } from '../components/ResponseHistory';
import { SentimentReport } from '../components/SentimentReport';
import { ImprovementSuggestions } from '../components/ImprovementSuggestions';
import { ReputationScore } from '../components/ReputationScore';
import { ReviewInsights } from '../components/ReviewInsights';
import { exportCsv } from '../utils/exportCsv';
import { getProfile, saveSession, addToInbox } from '../utils/storage';
import type { InboxReview } from '../types';

const DEFAULT_TONE: Tone = 'friendly';

// Quick-use response templates — no API call needed
const RESPONSE_TEMPLATES = [
  {
    title: '5-Star Thank You',
    scenario: 'Positive review, general praise',
    text: `Thank you so much for the wonderful review! We're thrilled you had a great experience with us. Your kind words mean the world to our team, and we can't wait to welcome you back soon!`,
  },
  {
    title: 'Food Complaint Response',
    scenario: 'Customer unhappy with food quality',
    text: `We're truly sorry that our food didn't meet your expectations. Quality is something we take very seriously, and we've shared your feedback directly with our kitchen team. We'd love the chance to make it right — please reach out to us so we can ensure your next visit is much better.`,
  },
  {
    title: 'Wait Time Apology',
    scenario: 'Customer frustrated by long wait',
    text: `We sincerely apologize for the long wait during your visit. We understand how valuable your time is, and this isn't the experience we aim to provide. We're actively working on improving our service speed during peak hours. We hope you'll give us another chance to show you what we're really about.`,
  },
  {
    title: 'Staff Behavior Apology',
    scenario: 'Complaint about rude or poor service',
    text: `We're deeply sorry about the service you received. Every guest deserves to be treated with respect and warmth, and we clearly fell short. We're addressing this directly with our team and conducting additional training. We'd love the opportunity to make this right.`,
  },
  {
    title: 'Mixed Review Response',
    scenario: 'Some positives, some negatives',
    text: `Thank you for your honest feedback! We're glad you enjoyed some aspects of your visit, and we take your concerns about the areas where we fell short very seriously. We're working on improvements and would love to see you again soon.`,
  },
  {
    title: 'Fake/Unfair Review',
    scenario: 'Review seems inaccurate or fake',
    text: `Thank you for taking the time to leave a review. We take all feedback seriously. However, we're unable to find a record matching the experience described. We'd love to learn more — please reach out to us directly so we can look into this further and address any genuine concerns.`,
  },
];

// ---- API helpers ----

async function generateReplyApi(reviewText: string, tone: Tone, businessName: string): Promise<{ sentiment: Sentiment; reply: string }> {
  const response = await fetch(`/api/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ reviewText, tone, businessName: businessName || undefined })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate response');
  }

  return response.json();
}

async function generateBatchApi(reviews: string[], tone: Tone, businessName: string): Promise<BatchResponse> {
  const response = await fetch(`/api/generate-replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ reviews, tone, businessName: businessName || undefined })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate batch responses');
  }

  return response.json();
}

// ---- Review parsing ----

function cleanReviewText(raw: string): string {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('\u201c') && s.endsWith('\u201d'))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseReviews(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const labelPattern = /Review\s*\d+\s*:/i;
  if (labelPattern.test(trimmed)) {
    const parts = trimmed.split(/Review\s*\d+\s*:\s*/i).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.map(cleanReviewText).filter(Boolean);
  }

  const byDoubleNewline = trimmed.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (byDoubleNewline.length > 1) return byDoubleNewline.map(cleanReviewText).filter(Boolean);

  const numberedPattern = /(?:^|\n)\s*\d+[\.\\)]\s+/;
  if (numberedPattern.test(trimmed)) {
    const parts = trimmed.split(/(?:^|\n)\s*\d+[\.\\)]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.map(cleanReviewText).filter(Boolean);
  }

  const bulletPattern = /(?:^|\n)\s*[-•]\s+/;
  if (bulletPattern.test(trimmed)) {
    const parts = trimmed.split(/(?:^|\n)\s*[-•]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.map(cleanReviewText).filter(Boolean);
  }

  return [cleanReviewText(trimmed)].filter(Boolean);
}

// ---- Page component ----

export const AnalyzePage = () => {
  const profile = getProfile();

  const [reviewText, setReviewText] = useState('');
  const [businessName, setBusinessName] = useState(profile?.name ?? '');
  const [tone, setTone] = useState<Tone>(profile?.defaultTone ?? DEFAULT_TONE);

  const [currentSentiment, setCurrentSentiment] = useState<Sentiment | null>(null);
  const [currentReply, setCurrentReply] = useState('');

  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);

  const [history, setHistory] = useState<GeneratedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const parsedReviews = useMemo(() => parseReviews(reviewText), [reviewText]);
  const isBatch = parsedReviews.length > 1;
  const canGenerate = useMemo(() => reviewText.trim().length > 0 && !isLoading, [reviewText, isLoading]);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsLoading(true);
    setError(null);
    setBatchResults([]);
    setSentimentSummary(null);
    setImprovements([]);
    setCurrentSentiment(null);
    setCurrentReply('');
    setProgress('');

    try {
      if (isBatch) {
        setProgress(`Processing ${parsedReviews.length} reviews...`);
        const data = await generateBatchApi(parsedReviews, tone, businessName.trim());

        setBatchResults(data.results);
        setSentimentSummary(data.sentimentSummary);
        setImprovements(data.improvements);

        const now = new Date().toISOString();
        const entries: GeneratedResponse[] = data.results
          .filter(r => !r.error)
          .map((r, i) => ({
            id: `${crypto.randomUUID()}-${i}`,
            createdAt: now,
            reviewText: r.reviewText,
            reply: r.reply,
            sentiment: r.sentiment,
            tone
          }));

        setHistory(prev => [...entries, ...prev].slice(0, 50));

        // Auto-save session to localStorage
        const session: AnalysisSession = {
          id: crypto.randomUUID(),
          createdAt: now,
          businessName: businessName.trim() || 'Unnamed Business',
          reviewCount: data.results.length,
          results: data.results,
          sentimentSummary: data.sentimentSummary,
          improvements: data.improvements,
          tone
        };
        saveSession(session);

        // Add to inbox for tracking
        const inboxItems: InboxReview[] = data.results
          .filter(r => !r.error)
          .map((r, i) => ({
            id: `${crypto.randomUUID()}-inbox-${i}`,
            createdAt: now,
            reviewText: r.reviewText,
            sentiment: r.sentiment,
            reply: r.reply,
            tone,
            businessName: businessName.trim() || 'Unnamed Business',
            status: 'reply_generated' as const,
          }));
        addToInbox(inboxItems);

        setProgress('');
      } else {
        const { sentiment, reply } = await generateReplyApi(reviewText.trim(), tone, businessName.trim());
        setCurrentSentiment(sentiment);
        setCurrentReply(reply);

        const entry: GeneratedResponse = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          reviewText: reviewText.trim(),
          reply,
          sentiment,
          tone
        };

        setHistory(prev => [entry, ...prev].slice(0, 50));

        // Add to inbox for tracking
        addToInbox([{
          id: `${crypto.randomUUID()}-inbox`,
          createdAt: entry.createdAt,
          reviewText: reviewText.trim(),
          sentiment,
          reply,
          tone,
          businessName: businessName.trim() || 'Unnamed Business',
          status: 'reply_generated' as const,
        }]);

        // Auto-save single review as a session too
        const session: AnalysisSession = {
          id: crypto.randomUUID(),
          createdAt: entry.createdAt,
          businessName: businessName.trim() || 'Unnamed Business',
          reviewCount: 1,
          results: [{ reviewText: reviewText.trim(), sentiment, reply }],
          sentimentSummary: {
            total: 1,
            positive: sentiment === 'positive' ? 1 : 0,
            neutral: sentiment === 'neutral' ? 1 : 0,
            negative: sentiment === 'negative' ? 1 : 0,
            positivePercent: sentiment === 'positive' ? 100 : 0,
            neutralPercent: sentiment === 'neutral' ? 100 : 0,
            negativePercent: sentiment === 'negative' ? 100 : 0,
          },
          improvements: [],
          tone
        };
        saveSession(session);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  const handleCopy = async (text?: string) => {
    const content = text ?? currentReply;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Failed to copy — please copy manually.');
    }
  };

  const handleExportCsv = () => {
    const items = batchResults.length > 0 ? batchResults : history.map(h => ({
      reviewText: h.reviewText,
      sentiment: h.sentiment,
      reply: h.reply
    }));
    if (items.length === 0) return;
    exportCsv(items, businessName || 'reviews');
    showToast('CSV exported successfully!');
  };

  const sentimentLabel: string | null = currentSentiment
    ? { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }[currentSentiment]
    : null;

  const hasResults = batchResults.length > 0 || currentReply.length > 0;

  return (
    <div className="page-analyze">
      <div className="page-header">
        <h1 className="page-title">Analyze Reviews</h1>
        <p className="page-subtitle">Paste customer reviews and generate AI-crafted responses instantly.</p>
      </div>

      {/* ---- Input + Output ---- */}
      <section className="card layout-main">
        <div className="layout-main-left">
          <div className="input-group">
            <label className="field-label" htmlFor="business-name">
              Business name
            </label>
            <div className="input-icon-wrap">
              <input
                id="business-name"
                className="text-input"
                type="text"
                placeholder="e.g. Joe's Coffee Shop"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="field-label" htmlFor="review-input">
              Customer reviews
              {isBatch && <span className="batch-badge">{parsedReviews.length} reviews detected</span>}
            </label>
            <textarea
              id="review-input"
              className="text-input"
              placeholder={'Paste one or more Google reviews here...\n\nSeparate multiple reviews with a blank line:\n\nGreat food and friendly staff!\n\nTerrible service, waited 45 minutes.'}
              rows={10}
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
            />
          </div>

          <ToneSelector value={tone} onChange={setTone} />

          {/* Quick Templates */}
          <div className="templates-section">
            <button
              type="button"
              className="templates-toggle"
              onClick={() => setShowTemplates(prev => !prev)}
            >
              <span>{showTemplates ? '▼' : '▶'}</span>
              Quick Templates — copy a ready-made response (no credits used)
            </button>
            {showTemplates && (
              <div className="templates-grid">
                {RESPONSE_TEMPLATES.map((tpl, i) => (
                  <div
                    key={i}
                    className="template-card"
                    onClick={() => {
                      const personalized = businessName.trim()
                        ? tpl.text + `\n\n— The ${businessName.trim()} Team`
                        : tpl.text;
                      navigator.clipboard.writeText(personalized)
                        .then(() => showToast(`"${tpl.title}" copied!`))
                        .catch(() => showToast('Failed to copy'));
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                  >
                    <p className="template-card-title">{tpl.title}</p>
                    <p className="template-card-preview">{tpl.scenario} — click to copy</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {isLoading
                ? 'Generating...'
                : isBatch
                  ? `Generate ${parsedReviews.length} Responses`
                  : 'Generate Response'}
            </button>

            {hasResults && (
              <button type="button" className="secondary-button" onClick={handleExportCsv}>
                Export CSV
              </button>
            )}
          </div>

          {progress && <p className="progress-text">{progress}</p>}
          {error && (
            error.toLowerCase().includes('limit reached') ? (
              <div className="upgrade-banner">
                <p className="upgrade-title">You've hit your free limit this month!</p>
                <p className="upgrade-desc">
                  You've used all 5 free reviews. Upgrade to Starter ($12/mo) for 30 reviews
                  or Pro ($29/mo) for unlimited reviews and advanced analytics.
                </p>
                <a href="/welcome#pricing" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '0.5rem' }}>
                  View Plans
                </a>
              </div>
            ) : (
              <p className="error-text">{error}</p>
            )
          )}
        </div>

        <div className="layout-main-right">
          {/* Single review result */}
          {!isBatch && !batchResults.length && (
            <>
              <div className="response-header">
                <h2>Suggested Reply</h2>
                {sentimentLabel && (
                  <span className={`pill pill-${currentSentiment ?? 'neutral'}`}>
                    {currentSentiment === 'positive' && '😊 '}
                    {currentSentiment === 'neutral' && '😐 '}
                    {currentSentiment === 'negative' && '😡 '}
                    {sentimentLabel}
                  </span>
                )}
              </div>

              <div className="response-box">
                {currentReply ? (
                  <p className="response-text">{currentReply}</p>
                ) : (
                  <p className="response-placeholder">
                    Your AI-crafted response will appear here once you paste a review and click Generate.
                  </p>
                )}
              </div>

              <div className="response-actions">
                <button
                  type="button"
                  className="secondary-button secondary-button-sm"
                  onClick={() => handleCopy()}
                  disabled={!currentReply}
                >
                  Copy Response
                </button>
              </div>
            </>
          )}

          {/* Batch results */}
          {batchResults.length > 0 && (
            <div className="batch-results">
              <h2 className="section-title">Generated Responses ({batchResults.length})</h2>
              <ul className="batch-list">
                {batchResults.map((item, i) => (
                  <li key={i} className="batch-item">
                    <div className="batch-item-header">
                      <span className={`pill pill-${item.sentiment}`}>
                        {item.sentiment === 'positive' && '😊 '}
                        {item.sentiment === 'neutral' && '😐 '}
                        {item.sentiment === 'negative' && '😡 '}
                        {item.sentiment.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => handleCopy(item.reply)}
                      >
                        Copy
                      </button>
                    </div>
                    <p className="batch-review">
                      {item.reviewText.slice(0, 140)}{item.reviewText.length > 140 ? '...' : ''}
                    </p>
                    <p className="batch-reply">{item.reply}</p>
                    {item.error && <p className="error-text">{item.error}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ---- Reputation Score ---- */}
      {sentimentSummary && sentimentSummary.total > 0 && (
        <section className="card">
          <ReputationScore summary={sentimentSummary} />
        </section>
      )}

      {/* ---- Sentiment Summary ---- */}
      {sentimentSummary && sentimentSummary.total > 0 && (
        <section className="card">
          <SentimentReport summary={sentimentSummary} />
        </section>
      )}

      {/* ---- Review Insights ---- */}
      {batchResults.length > 0 && (
        <section className="card">
          <ReviewInsights results={batchResults} />
        </section>
      )}

      {/* ---- Improvement Suggestions ---- */}
      {improvements.length > 0 && (
        <section className="card">
          <ImprovementSuggestions improvements={improvements} />
        </section>
      )}

      {/* ---- History ---- */}
      <section className="card">
        <ResponseHistory items={history} onExportCsv={handleExportCsv} />
      </section>

      {/* ---- Toast notification ---- */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
};
