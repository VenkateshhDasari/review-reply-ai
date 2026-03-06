import type { SentimentSummary } from '../types';

interface ReputationScoreProps {
  summary: SentimentSummary;
}

function computeScore(summary: SentimentSummary): number {
  if (summary.total === 0) return 0;

  // Weighted formula:
  // positive = +1, neutral = +0.5, negative = -0.5
  // Max possible = total * 1 => normalize to 0-100
  const raw = (summary.positive * 1 + summary.neutral * 0.5 + summary.negative * -0.5);
  const max = summary.total;
  const normalized = ((raw + max) / (2 * max)) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

export const ReputationScore = ({ summary }: ReputationScoreProps) => {
  const score = computeScore(summary);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  // SVG circle math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="reputation-card">
      <div className="reputation-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle className="reputation-ring-bg" cx="60" cy="60" r={radius} />
          <circle
            className="reputation-ring-fill"
            cx="60"
            cy="60"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="reputation-ring-label">
          <span className="reputation-score-value" style={{ color }}>{score}</span>
          <span className="reputation-score-max">/ 100</span>
        </div>
      </div>

      <div className="reputation-details">
        <div>
          <h2 className="reputation-title">Reputation Health</h2>
          <p className="reputation-subtitle">Based on sentiment analysis of your reviews</p>
        </div>
        <div className="reputation-metrics">
          <div className="reputation-metric">
            <span className="reputation-metric-label">Overall Rating</span>
            <span className="reputation-metric-value" style={{ color }}>{label}</span>
          </div>
          <div className="reputation-metric">
            <span className="reputation-metric-label">Positive Rate</span>
            <span className="reputation-metric-value" style={{ color: '#6ee7b7' }}>
              {summary.positivePercent}%
            </span>
          </div>
          <div className="reputation-metric">
            <span className="reputation-metric-label">Negative Rate</span>
            <span className="reputation-metric-value" style={{ color: '#fca5a5' }}>
              {summary.negativePercent}%
            </span>
          </div>
          <div className="reputation-metric">
            <span className="reputation-metric-label">Reviews Analyzed</span>
            <span className="reputation-metric-value">{summary.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
