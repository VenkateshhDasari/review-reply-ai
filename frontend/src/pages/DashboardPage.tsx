import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, getSessions, getReports } from '../utils/storage';
import { computeScore, getScoreColor } from '../utils/score';

export const DashboardPage = () => {
  const profile = getProfile();
  const sessions = getSessions();
  const reports = getReports();

  const stats = useMemo(() => {
    const totalReviews = sessions.reduce((sum, s) => sum + s.reviewCount, 0);
    const avgScore = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + computeScore(s.sentimentSummary), 0) / sessions.length)
      : 0;
    return {
      totalReviews,
      avgScore,
      totalSessions: sessions.length,
      totalReports: reports.length,
    };
  }, [sessions, reports]);

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="page-dashboard">
      <div className="page-header">
        <h1 className="page-title">
          {profile?.name ? `Welcome back, ${profile.name}` : 'Dashboard'}
        </h1>
        <p className="page-subtitle">Your review management overview at a glance.</p>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-icon">💬</span>
          <div className="stat-content">
            <span className="stat-value">{stats.totalReviews}</span>
            <span className="stat-label">Reviews Analyzed</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-content">
            <span className="stat-value">{stats.avgScore}<span className="stat-unit">/100</span></span>
            <span className="stat-label">Avg. Reputation</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📁</span>
          <div className="stat-content">
            <span className="stat-value">{stats.totalSessions}</span>
            <span className="stat-label">Sessions Saved</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📄</span>
          <div className="stat-content">
            <span className="stat-value">{stats.totalReports}</span>
            <span className="stat-label">Reports Generated</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions">
        <Link to="/analyze" className="action-card action-card--primary">
          <span className="action-icon">💬</span>
          <div>
            <h3 className="action-title">Analyze Reviews</h3>
            <p className="action-desc">Paste reviews and generate responses</p>
          </div>
        </Link>
        <Link to="/reports" className="action-card">
          <span className="action-icon">📄</span>
          <div>
            <h3 className="action-title">View Reports</h3>
            <p className="action-desc">Download PDF analysis reports</p>
          </div>
        </Link>
        <Link to="/insights" className="action-card">
          <span className="action-icon">🔍</span>
          <div>
            <h3 className="action-title">View Insights</h3>
            <p className="action-desc">Aggregated trends across all sessions</p>
          </div>
        </Link>
        <Link to="/settings" className="action-card">
          <span className="action-icon">⚙️</span>
          <div>
            <h3 className="action-title">Settings</h3>
            <p className="action-desc">Manage your business profile</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <section className="card">
        <h2 className="section-title">Recent Activity</h2>
        {recentSessions.length === 0 ? (
          <p className="muted-text">No analysis sessions yet. Head to <Link to="/analyze" className="link-inline">Analyze</Link> to get started.</p>
        ) : (
          <ul className="activity-feed">
            {recentSessions.map(session => {
              const score = computeScore(session.sentimentSummary);
              const scoreColor = getScoreColor(score);
              return (
                <li key={session.id} className="activity-item">
                  <div className="activity-dot" style={{ background: scoreColor }} />
                  <div className="activity-info">
                    <span className="activity-title">
                      {session.businessName} — {session.reviewCount} review{session.reviewCount !== 1 ? 's' : ''}
                    </span>
                    <span className="activity-date">
                      {new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <span className="activity-score" style={{ color: scoreColor }}>
                    {score}/100
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
