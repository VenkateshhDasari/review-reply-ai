import { Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { InsightsPage } from './pages/InsightsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LeadFinderPage } from './pages/LeadFinderPage';
import { InboxPage } from './pages/InboxPage';
import { LandingPage } from './pages/LandingPage';

const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: '#a5b4fc' }}>404</h1>
    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Page not found</p>
    <Link to="/" className="primary-button" style={{ textDecoration: 'none' }}>
      Back to Dashboard
    </Link>
  </div>
);

export const App = () => (
  <Routes>
    <Route path="/welcome" element={<LandingPage />} />
    <Route element={<Layout />}>
      <Route index element={<DashboardPage />} />
      <Route path="analyze" element={<AnalyzePage />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="leads" element={<LeadFinderPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
