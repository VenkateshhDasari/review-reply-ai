import { useState } from 'react';
import { getSavedLeads, saveLead, removeSavedLead } from '../utils/storage';

interface Lead {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  topComplaint: string;
  phone: string;
  city: string;
  distance: string;
  opportunity: 'high' | 'medium' | 'low';
  estimatedRevenue: string;
}

export const LeadFinderPage = () => {
  const [city, setCity] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [savedLeads, setSavedLeads] = useState<string[]>(getSavedLeads());
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || loading) return;

    setLoading(true);
    setError('');
    setLeads([]);

    try {
      const res = await fetch('/api/leads/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim() }),
      });
      const data = await res.json();

      if (data.leads) {
        setLeads(data.leads);
        setTotalFound(data.totalFound || data.leads.length);
        setSearched(true);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Could not connect to server. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = (name: string) => {
    if (savedLeads.includes(name)) {
      removeSavedLead(name);
      setSavedLeads(prev => prev.filter(l => l !== name));
    } else {
      saveLead(name);
      setSavedLeads(prev => [...prev, name]);
    }
  };

  const getOpportunityColor = (opp: string) => {
    if (opp === 'high') return '#ef4444';
    if (opp === 'medium') return '#f59e0b';
    return '#10b981';
  };

  const getOpportunityBg = (opp: string) => {
    if (opp === 'high') return 'rgba(239, 68, 68, 0.12)';
    if (opp === 'medium') return 'rgba(245, 158, 11, 0.12)';
    return 'rgba(16, 185, 129, 0.12)';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#10b981';
    if (rating >= 3) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="page-leadfinder">
      <div className="page-header">
        <h1 className="page-title">Lead Finder</h1>
        <p className="page-subtitle">
          Discover restaurants struggling with their online reviews.
          Perfect for agencies and consultants offering review management.
        </p>
      </div>

      {/* Search */}
      <section className="card">
        <form className="leadfinder-search" onSubmit={handleSearch}>
          <div className="leadfinder-search-group">
            <label className="field-label" htmlFor="city-input">City or Area</label>
            <div className="leadfinder-search-row">
              <input
                id="city-input"
                type="text"
                className="text-input"
                placeholder="e.g. Austin, TX or Manhattan, NY"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={!city.trim() || loading}
              >
                {loading ? 'Searching...' : 'Find Leads'}
              </button>
            </div>
          </div>
        </form>
        {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
      </section>

      {/* Demo notice */}
      <section className="leadfinder-demo-notice">
        <span className="leadfinder-demo-icon">ℹ️</span>
        <div>
          <strong>Demo Mode:</strong> Results shown are simulated to demonstrate the Lead Finder feature.
          Upgrade to a paid plan to access real restaurant data powered by Google Maps.
        </div>
      </section>

      {/* Results */}
      {searched && (
        <section className="card">
          <div className="leadfinder-results-header">
            <h2 className="section-title">
              {totalFound} Restaurants Found in {city}
            </h2>
            <p className="muted-text">Showing restaurants with the worst reviews — your best sales opportunities.</p>
          </div>

          {leads.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <h3>No results</h3>
              <p className="muted-text">Try a different city or area.</p>
            </div>
          ) : (
            <ul className="leadfinder-list">
              {leads.map((lead, i) => {
                const isExpanded = expandedLead === lead.id;
                const isSaved = savedLeads.includes(lead.name);
                const complaints = lead.topComplaint.split(', ');

                return (
                  <li key={lead.id} className="leadfinder-item">
                    <div
                      className="leadfinder-item-main"
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedLead(isExpanded ? null : lead.id)}
                    >
                      <div className="leadfinder-item-rank">#{i + 1}</div>

                      <div className="leadfinder-item-info">
                        <span className="leadfinder-item-name">{lead.name}</span>
                        <span className="leadfinder-item-address">{lead.address}, {lead.city}</span>
                      </div>

                      <div className="leadfinder-item-metrics">
                        <div className="leadfinder-metric">
                          <span className="leadfinder-metric-label">Rating</span>
                          <span
                            className="leadfinder-metric-value"
                            style={{ color: getRatingColor(lead.rating) }}
                          >
                            ⭐ {lead.rating}
                          </span>
                        </div>
                        <div className="leadfinder-metric">
                          <span className="leadfinder-metric-label">Reviews</span>
                          <span className="leadfinder-metric-value">{lead.reviewCount}</span>
                        </div>
                        <div className="leadfinder-metric">
                          <span className="leadfinder-metric-label">Distance</span>
                          <span className="leadfinder-metric-value">{lead.distance}</span>
                        </div>
                        <div className="leadfinder-metric">
                          <span className="leadfinder-metric-label">Opportunity</span>
                          <span
                            className="leadfinder-metric-value leadfinder-metric-value--score"
                            style={{
                              color: getOpportunityColor(lead.opportunity),
                              background: getOpportunityBg(lead.opportunity),
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {lead.opportunity}
                          </span>
                        </div>
                      </div>

                      <div className="leadfinder-item-expand">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="leadfinder-item-details">
                        <div className="leadfinder-details-section">
                          <h4 className="leadfinder-details-title">Top Complaints</h4>
                          <div className="leadfinder-complaints">
                            {complaints.map((c, j) => (
                              <span key={j} className="leadfinder-complaint-tag">{c.trim()}</span>
                            ))}
                          </div>
                        </div>

                        <div className="leadfinder-details-row">
                          <div className="leadfinder-details-section">
                            <h4 className="leadfinder-details-title">Phone</h4>
                            <p className="muted-text">{lead.phone}</p>
                          </div>
                          <div className="leadfinder-details-section">
                            <h4 className="leadfinder-details-title">Estimated Revenue Potential</h4>
                            <p style={{ margin: 0, fontWeight: 600, color: '#10b981', fontSize: '16px' }}>
                              {lead.estimatedRevenue}
                            </p>
                          </div>
                        </div>

                        <div className="leadfinder-details-section">
                          <h4 className="leadfinder-details-title">Why This Lead?</h4>
                          <p className="muted-text">
                            {lead.opportunity === 'high'
                              ? `With a ${lead.rating} star rating and ${lead.reviewCount} reviews showing complaints about "${lead.topComplaint}", this restaurant desperately needs review management help. Potential to charge ${lead.estimatedRevenue}.`
                              : `This restaurant has a ${lead.rating} star rating with complaints about "${lead.topComplaint}". There's a clear opportunity to improve their online reputation and charge ${lead.estimatedRevenue}.`
                            }
                          </p>
                        </div>

                        <div className="leadfinder-item-actions">
                          <button
                            type="button"
                            className={`secondary-button secondary-button-sm ${isSaved ? 'leadfinder-saved' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleSaveLead(lead.name); }}
                          >
                            {isSaved ? '★ Saved' : '☆ Save Lead'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Saved Leads */}
      {savedLeads.length > 0 && (
        <section className="card">
          <h2 className="section-title">Saved Leads ({savedLeads.length})</h2>
          <ul className="leadfinder-saved-list">
            {savedLeads.map(name => (
              <li key={name} className="leadfinder-saved-item">
                <span>{name}</span>
                <button
                  type="button"
                  className="danger-button-sm"
                  onClick={() => handleSaveLead(name)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
