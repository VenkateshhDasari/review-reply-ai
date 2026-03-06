import type { SentimentSummary } from '../types';

export function computeScore(summary: SentimentSummary): number {
  if (summary.total === 0) return 0;
  const raw = (summary.positive * 1 + summary.neutral * 0.5 + summary.negative * -0.5);
  const max = summary.total;
  const normalized = ((raw + max) / (2 * max)) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

export function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}
