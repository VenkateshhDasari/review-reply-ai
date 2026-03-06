import type { Improvement } from '../types';

interface ImprovementSuggestionsProps {
  improvements: Improvement[];
}

const categoryLabels: Record<string, string> = {
  kitchen_timing: 'Kitchen Timing & Wait Times',
  food_temperature: 'Food Temperature',
  food_quality: 'Food Quality & Taste',
  food_safety: 'Food Safety & Hygiene',
  staff_attitude: 'Staff Attitude & Service',
  order_accuracy: 'Order Accuracy',
  cleanliness: 'Restaurant Cleanliness',
  pricing_value: 'Pricing & Value',
  ambiance_noise: 'Ambiance & Noise Level',
  delivery_issues: 'Delivery Problems',
  // Legacy categories (backward compat)
  service: 'Customer Service',
  quality: 'Food Quality',
  pricing: 'Pricing & Value',
  communication: 'Communication & Follow-up',
};

export const ImprovementSuggestions = ({ improvements }: ImprovementSuggestionsProps) => {
  if (improvements.length === 0) return null;

  return (
    <div>
      <h2 className="section-title">Suggested Improvements</h2>
      <p className="muted-text" style={{ marginBottom: 12 }}>
        Based on patterns found in your negative and neutral reviews.
      </p>
      <ul className="improvement-list">
        {improvements.map(item => (
          <li key={item.category} className="improvement-item">
            <div className="improvement-header">
              <span className="improvement-category">
                {categoryLabels[item.category] ?? item.category}
              </span>
              <span className="improvement-count">
                {item.mentionCount} mention{item.mentionCount !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="improvement-suggestion">{item.suggestion}</p>
            {item.exampleSnippets.length > 0 && (
              <div className="improvement-examples">
                <span className="improvement-examples-label">From reviews:</span>
                {item.exampleSnippets.map((snippet, i) => (
                  <span key={i} className="improvement-snippet">"{snippet}..."</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
