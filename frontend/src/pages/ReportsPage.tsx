import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions, getReports, saveReport, deleteReport, getSessionById } from '../utils/storage';
import { generatePdf } from '../utils/generatePdf';
import { computeScore } from '../utils/score';
import type { ReportMetadata } from '../types';

export const ReportsPage = () => {
  const [reports, setReports] = useState<ReportMetadata[]>(getReports());
  const sessions = getSessions();
  const latestSession = sessions[0] ?? null;

  const handleGenerate = () => {
    if (!latestSession) return;

    // Generate PDF
    generatePdf(latestSession);

    // Save report metadata
    const meta: ReportMetadata = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sessionId: latestSession.id,
      businessName: latestSession.businessName,
      reviewCount: latestSession.reviewCount,
      score: computeScore(latestSession.sentimentSummary),
    };
    saveReport(meta);
    setReports(getReports());
  };

  const handleRedownload = (report: ReportMetadata) => {
    const session = getSessionById(report.sessionId);
    if (session) {
      generatePdf(session);
    }
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setReports(getReports());
  };

  return (
    <div className="page-reports">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate and download PDF analysis reports.</p>
      </div>

      {/* Generate action */}
      <section className="card">
        <div className="report-generate">
          <div>
            <h3 className="report-generate-title">Generate New Report</h3>
            <p className="muted-text">
              {latestSession
                ? `Latest session: ${latestSession.businessName} — ${latestSession.reviewCount} reviews`
                : 'No analysis sessions available yet.'}
            </p>
          </div>
          {latestSession ? (
            <button type="button" className="primary-button" onClick={handleGenerate}>
              Generate PDF
            </button>
          ) : (
            <Link to="/analyze" className="primary-button" style={{ textDecoration: 'none' }}>
              Analyze First
            </Link>
          )}
        </div>
      </section>

      {/* Report list */}
      <section className="card">
        <h2 className="section-title">Report History</h2>
        {reports.length === 0 ? (
          <p className="muted-text">No reports generated yet. Generate your first report above.</p>
        ) : (
          <ul className="report-list">
            {reports.map(report => {
              const scoreColor = report.score >= 70 ? '#10b981' : report.score >= 45 ? '#f59e0b' : '#ef4444';
              return (
                <li key={report.id} className="report-item">
                  <div className="report-item-info">
                    <span className="report-item-name">{report.businessName}</span>
                    <span className="report-item-meta">
                      {report.reviewCount} reviews &middot;{' '}
                      {new Date(report.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <span className="report-item-score" style={{ color: scoreColor }}>
                    {report.score}/100
                  </span>
                  <div className="report-item-actions">
                    <button
                      type="button"
                      className="secondary-button secondary-button-sm"
                      onClick={() => handleRedownload(report)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="danger-button-sm"
                      onClick={() => handleDelete(report.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
