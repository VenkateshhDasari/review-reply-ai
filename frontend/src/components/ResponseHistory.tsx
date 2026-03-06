import type { GeneratedResponse } from '../types';

interface ResponseHistoryProps {
  items: GeneratedResponse[];
  onExportCsv?: () => void;
}

const sentimentEmoji: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟'
};

export const ResponseHistory = ({ items, onExportCsv }: ResponseHistoryProps) => {
  if (items.length === 0) {
    return (
      <div>
        <h2 className="section-title">History</h2>
        <p className="muted-text">No responses yet. Your generated replies will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="history-header">
        <h2 className="section-title">History ({items.length})</h2>
        {onExportCsv && items.length > 0 && (
          <button type="button" className="secondary-button secondary-button-sm" onClick={onExportCsv}>
            Export CSV
          </button>
        )}
      </div>
      <ul className="history-list">
        {items.map(item => (
          <li key={item.id} className="history-item">
            <div className="history-meta">
              <span className="history-sentiment">
                {sentimentEmoji[item.sentiment]} {item.sentiment.toUpperCase()}
              </span>
              <span className="history-tone">{item.tone}</span>
              <span className="history-date">
                {new Date(item.createdAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            <div className="history-content">
              <p className="history-label">Review</p>
              <p className="history-review">{item.reviewText}</p>
            </div>
            <div className="history-content">
              <p className="history-label">Reply</p>
              <p className="history-reply">{item.reply}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
