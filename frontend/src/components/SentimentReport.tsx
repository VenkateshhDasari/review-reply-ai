import type { SentimentSummary } from '../types';

interface SentimentReportProps {
  summary: SentimentSummary;
}

export const SentimentReport = ({ summary }: SentimentReportProps) => {
  return (
    <div>
      <div className="sentiment-section-header">
        <h2 className="section-title">Sentiment Overview</h2>
        <p className="section-subtitle">How your customers feel about their experience</p>
      </div>

      <div className="sentiment-grid">
        <div className="sentiment-stat sentiment-stat-positive">
          <span className="sentiment-stat-icon">😊</span>
          <span className="sentiment-stat-value">{summary.positive}</span>
          <span className="sentiment-stat-label">Positive</span>
          <span className="sentiment-stat-percent">{summary.positivePercent}%</span>
        </div>
        <div className="sentiment-stat sentiment-stat-neutral">
          <span className="sentiment-stat-icon">😐</span>
          <span className="sentiment-stat-value">{summary.neutral}</span>
          <span className="sentiment-stat-label">Neutral</span>
          <span className="sentiment-stat-percent">{summary.neutralPercent}%</span>
        </div>
        <div className="sentiment-stat sentiment-stat-negative">
          <span className="sentiment-stat-icon">😡</span>
          <span className="sentiment-stat-value">{summary.negative}</span>
          <span className="sentiment-stat-label">Negative</span>
          <span className="sentiment-stat-percent">{summary.negativePercent}%</span>
        </div>
        <div className="sentiment-stat sentiment-stat-total">
          <span className="sentiment-stat-icon">📊</span>
          <span className="sentiment-stat-value">{summary.total}</span>
          <span className="sentiment-stat-label">Total</span>
          <span className="sentiment-stat-percent">100%</span>
        </div>
      </div>

      {summary.total > 0 && (
        <div className="sentiment-bar">
          {summary.positivePercent > 0 && (
            <div
              className="sentiment-bar-segment sentiment-bar-positive"
              style={{ width: `${summary.positivePercent}%` }}
              title={`Positive: ${summary.positivePercent}%`}
            />
          )}
          {summary.neutralPercent > 0 && (
            <div
              className="sentiment-bar-segment sentiment-bar-neutral"
              style={{ width: `${summary.neutralPercent}%` }}
              title={`Neutral: ${summary.neutralPercent}%`}
            />
          )}
          {summary.negativePercent > 0 && (
            <div
              className="sentiment-bar-segment sentiment-bar-negative"
              style={{ width: `${summary.negativePercent}%` }}
              title={`Negative: ${summary.negativePercent}%`}
            />
          )}
        </div>
      )}
    </div>
  );
};
