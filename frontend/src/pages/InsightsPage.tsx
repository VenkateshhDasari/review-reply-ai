import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../utils/storage';
import { ReputationScore } from '../components/ReputationScore';
import { SentimentReport } from '../components/SentimentReport';
import { ReviewInsights } from '../components/ReviewInsights';
import { ImprovementSuggestions } from '../components/ImprovementSuggestions';
import type { BatchResultItem, Improvement, SentimentSummary } from '../types';

export const InsightsPage = () => {
  const sessions = getSessions();

  const aggregated = useMemo(() => {
    if (sessions.length === 0) return null;

    // Aggregate sentiment
    let positive = 0, neutral = 0, negative = 0;
    const allResults: BatchResultItem[] = [];
    const improvementMap: Record<string, Improvement> = {};

    for (const s of sessions) {
      positive += s.sentimentSummary.positive;
      neutral += s.sentimentSummary.neutral;
      negative += s.sentimentSummary.negative;

      for (const r of s.results) {
        allResults.push(r);
      }

      for (const imp of s.improvements) {
        if (improvementMap[imp.category]) {
          improvementMap[imp.category].mentionCount += imp.mentionCount;
          // merge unique snippets
          const existing = new Set(improvementMap[imp.category].exampleSnippets);
          for (const snip of imp.exampleSnippets) {
            if (!existing.has(snip)) {
              improvementMap[imp.category].exampleSnippets.push(snip);
            }
          }
        } else {
          improvementMap[imp.category] = { ...imp, exampleSnippets: [...imp.exampleSnippets] };
        }
      }
    }

    const total = positive + neutral + negative;
    const sentimentSummary: SentimentSummary = {
      total,
      positive,
      neutral,
      negative,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
    };

    const improvements = Object.values(improvementMap).sort((a, b) => b.mentionCount - a.mentionCount);

    return { sentimentSummary, allResults, improvements };
  }, [sessions]);

  if (!aggregated) {
    return (
      <div className="page-insights">
        <div className="page-header">
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Aggregated trends across all your analysis sessions.</p>
        </div>
        <section className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <h3>No data yet</h3>
            <p className="muted-text">Run your first analysis to see aggregated insights here.</p>
            <Link to="/analyze" className="primary-button" style={{ marginTop: 12, display: 'inline-block' }}>
              Analyze Reviews
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-insights">
      <div className="page-header">
        <h1 className="page-title">Insights</h1>
        <p className="page-subtitle">
          Aggregated data across {sessions.length} session{sessions.length !== 1 ? 's' : ''} ({aggregated.sentimentSummary.total} reviews).
        </p>
      </div>

      {/* Reputation Score */}
      <section className="card">
        <ReputationScore summary={aggregated.sentimentSummary} />
      </section>

      {/* Sentiment Overview */}
      <section className="card">
        <SentimentReport summary={aggregated.sentimentSummary} />
      </section>

      {/* Review Insights */}
      {aggregated.allResults.length > 0 && (
        <section className="card">
          <ReviewInsights results={aggregated.allResults} />
        </section>
      )}

      {/* Improvement Suggestions */}
      {aggregated.improvements.length > 0 && (
        <section className="card">
          <ImprovementSuggestions improvements={aggregated.improvements} />
        </section>
      )}
    </div>
  );
};
