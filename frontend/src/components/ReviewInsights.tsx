import type { BatchResultItem } from '../types';

interface ReviewInsightsProps {
  results: BatchResultItem[];
}

interface InsightItem {
  text: string;
  count: number;
}

function extractInsights(results: BatchResultItem[]): {
  complaints: InsightItem[];
  strengths: InsightItem[];
} {
  const complaintKeywords: Record<string, string> = {
    // Wait times & speed
    slow: 'Slow service',
    wait: 'Long wait times',
    waiting: 'Long wait times',
    'took forever': 'Long wait times',
    '30 minutes': 'Long wait times',
    '45 minutes': 'Long wait times',
    'an hour': 'Long wait times',
    // Food temperature
    cold: 'Cold food served',
    lukewarm: 'Cold food served',
    'not hot': 'Cold food served',
    // Food quality
    stale: 'Stale / old food',
    bland: 'Bland / tasteless food',
    tasteless: 'Bland / tasteless food',
    undercooked: 'Undercooked food',
    raw: 'Undercooked food',
    overcooked: 'Overcooked / burnt food',
    burnt: 'Overcooked / burnt food',
    soggy: 'Soggy / poor texture',
    greasy: 'Too greasy',
    // Staff issues
    rude: 'Rude / unfriendly staff',
    unfriendly: 'Rude / unfriendly staff',
    attitude: 'Staff attitude issues',
    ignored: 'Poor attention from staff',
    // Cleanliness
    dirty: 'Cleanliness issues',
    filthy: 'Cleanliness issues',
    unclean: 'Cleanliness issues',
    cockroach: 'Pest / hygiene problems',
    bug: 'Pest / hygiene problems',
    hair: 'Foreign object in food',
    // Order accuracy
    'wrong order': 'Wrong order received',
    'wrong food': 'Wrong order received',
    missing: 'Missing items from order',
    // Pricing
    expensive: 'Overpriced',
    overpriced: 'Overpriced',
    'not worth': 'Poor value for money',
    'small portions': 'Small portion sizes',
    'tiny portions': 'Small portion sizes',
    // Delivery
    'late delivery': 'Late delivery',
    'delivery was late': 'Late delivery',
    // General
    disappointed: 'Disappointing experience',
    disappointing: 'Disappointing experience',
    terrible: 'Terrible experience',
    horrible: 'Terrible experience',
    awful: 'Terrible experience',
    'food poisoning': 'Food safety concern',
    sick: 'Food safety concern',
  };

  const strengthKeywords: Record<string, string> = {
    // Food quality
    delicious: 'Delicious food',
    tasty: 'Tasty dishes',
    yummy: 'Tasty dishes',
    fresh: 'Fresh ingredients',
    flavorful: 'Flavorful cooking',
    'cooked perfectly': 'Perfectly cooked food',
    crispy: 'Great food texture',
    tender: 'Great food texture',
    juicy: 'Great food quality',
    // Staff & service
    friendly: 'Friendly staff',
    welcoming: 'Welcoming atmosphere',
    attentive: 'Attentive service',
    helpful: 'Helpful staff',
    'great service': 'Great service',
    'fast service': 'Fast service',
    quick: 'Quick service',
    // Ambiance
    cozy: 'Cozy ambiance',
    'nice ambiance': 'Great ambiance',
    'great atmosphere': 'Great atmosphere',
    clean: 'Clean restaurant',
    // Value
    'good value': 'Good value for money',
    'worth it': 'Worth the price',
    'generous portions': 'Generous portions',
    'big portions': 'Generous portions',
    // General praise
    great: 'Great experience',
    amazing: 'Amazing quality',
    excellent: 'Excellent service',
    love: 'Customers love it',
    loved: 'Customers love it',
    best: 'Best in area',
    'must try': 'Must-try restaurant',
    perfect: 'Perfect experience',
    recommend: 'Highly recommended',
    fantastic: 'Fantastic quality',
    wonderful: 'Wonderful experience',
    'come back': 'Repeat customers',
    'coming back': 'Repeat customers',
    favorite: 'Customer favorite',
  };

  const complaintCounts: Record<string, number> = {};
  const strengthCounts: Record<string, number> = {};

  for (const r of results) {
    if (r.error) continue;
    const text = r.reviewText.toLowerCase();

    for (const [kw, label] of Object.entries(complaintKeywords)) {
      if (text.includes(kw)) {
        complaintCounts[label] = (complaintCounts[label] || 0) + 1;
      }
    }

    for (const [kw, label] of Object.entries(strengthKeywords)) {
      if (text.includes(kw)) {
        strengthCounts[label] = (strengthCounts[label] || 0) + 1;
      }
    }
  }

  const complaints = Object.entries(complaintCounts)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const strengths = Object.entries(strengthCounts)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { complaints, strengths };
}

export const ReviewInsights = ({ results }: ReviewInsightsProps) => {
  const { complaints, strengths } = extractInsights(results);

  if (complaints.length === 0 && strengths.length === 0) return null;

  return (
    <div>
      <div className="sentiment-section-header">
        <h2 className="section-title">Review Insights</h2>
        <p className="section-subtitle">Top themes extracted from your customer feedback</p>
      </div>

      <div className="insights-grid">
        <div className="insights-column">
          <h3 className="insights-column-title insights-column-title--complaints">
            <span>🔴</span> Top Complaints
          </h3>
          {complaints.length > 0 ? (
            <ul className="insights-tag-list">
              {complaints.map(item => (
                <li key={item.text} className="insights-tag insights-tag--complaint">
                  {item.text}
                  <span className="insights-tag-count">{item.count}x</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">No complaints found</p>
          )}
        </div>

        <div className="insights-column">
          <h3 className="insights-column-title insights-column-title--strengths">
            <span>🟢</span> Customer Strengths
          </h3>
          {strengths.length > 0 ? (
            <ul className="insights-tag-list">
              {strengths.map(item => (
                <li key={item.text} className="insights-tag insights-tag--strength">
                  {item.text}
                  <span className="insights-tag-count">{item.count}x</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">No strengths detected yet</p>
          )}
        </div>
      </div>
    </div>
  );
};
