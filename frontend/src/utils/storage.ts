import type { AnalysisSession, BusinessProfile, InboxReview, ReportMetadata, ReviewStatus } from '../types';

const PREFIX = 'rrai_';
const SESSIONS_KEY = `${PREFIX}sessions`;
const PROFILE_KEY = `${PREFIX}profile`;
const REPORTS_KEY = `${PREFIX}reports`;
const INBOX_KEY = `${PREFIX}inbox`;
const MAX_SESSIONS = 20;
const MAX_INBOX = 200;

// ---- storage-full event ----

/** Dispatches a custom event so the UI can show a warning toast. */
function emitStorageWarning(message: string): void {
  window.dispatchEvent(new CustomEvent('rrai:storage-warning', { detail: message }));
}

// ---- helpers ----

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    // Basic sanity: if fallback is an array, parsed should be an array
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    // If fallback is an object (not null), parsed should be an object
    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Storage full — warn user via custom event
    const isQuota =
      err instanceof DOMException &&
      (err.code === 22 || err.code === 1014 || err.name === 'QuotaExceededError');
    if (isQuota) {
      emitStorageWarning('Local storage is full. Some data may not be saved. Consider clearing old sessions in Settings.');
    } else {
      emitStorageWarning('Failed to save data to local storage.');
    }
  }
}

// ---- Sessions ----

export function getSessions(): AnalysisSession[] {
  return readJson<AnalysisSession[]>(SESSIONS_KEY, []);
}

export function saveSession(session: AnalysisSession): void {
  const sessions = getSessions();
  sessions.unshift(session);
  // Keep only the newest MAX_SESSIONS
  writeJson(SESSIONS_KEY, sessions.slice(0, MAX_SESSIONS));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter(s => s.id !== id);
  writeJson(SESSIONS_KEY, sessions);
}

export function getSessionById(id: string): AnalysisSession | undefined {
  return getSessions().find(s => s.id === id);
}

// ---- Business Profile ----

export function getProfile(): BusinessProfile | null {
  return readJson<BusinessProfile | null>(PROFILE_KEY, null);
}

export function saveProfile(profile: BusinessProfile): void {
  writeJson(PROFILE_KEY, profile);
}

// ---- Reports ----

export function getReports(): ReportMetadata[] {
  return readJson<ReportMetadata[]>(REPORTS_KEY, []);
}

export function saveReport(meta: ReportMetadata): void {
  const reports = getReports();
  reports.unshift(meta);
  writeJson(REPORTS_KEY, reports.slice(0, 50));
}

export function deleteReport(id: string): void {
  const reports = getReports().filter(r => r.id !== id);
  writeJson(REPORTS_KEY, reports);
}

// ---- Review Inbox ----

export function getInboxReviews(): InboxReview[] {
  return readJson<InboxReview[]>(INBOX_KEY, []);
}

export function addToInbox(reviews: InboxReview[]): void {
  const inbox = getInboxReviews();
  inbox.unshift(...reviews);
  writeJson(INBOX_KEY, inbox.slice(0, MAX_INBOX));
}

export function updateInboxStatus(id: string, status: ReviewStatus): void {
  const inbox = getInboxReviews();
  const item = inbox.find(r => r.id === id);
  if (item) {
    item.status = status;
    if (status === 'posted') item.postedAt = new Date().toISOString();
    writeJson(INBOX_KEY, inbox);
  }
}

export function deleteInboxReview(id: string): void {
  const inbox = getInboxReviews().filter(r => r.id !== id);
  writeJson(INBOX_KEY, inbox);
}

export function getInboxStats(): { total: number; needsReply: number; generated: number; posted: number } {
  const inbox = getInboxReviews();
  return {
    total: inbox.length,
    needsReply: inbox.filter(r => r.status === 'needs_reply').length,
    generated: inbox.filter(r => r.status === 'reply_generated').length,
    posted: inbox.filter(r => r.status === 'posted').length,
  };
}

// ---- Waitlist ----

const WAITLIST_KEY = `${PREFIX}waitlist_email`;

export function getWaitlistEmail(): string | null {
  return localStorage.getItem(WAITLIST_KEY);
}

export function saveWaitlistEmail(email: string): void {
  localStorage.setItem(WAITLIST_KEY, email);
}

// ---- Saved Leads ----

const LEADS_KEY = `${PREFIX}saved_leads`;

export function getSavedLeads(): string[] {
  return readJson<string[]>(LEADS_KEY, []);
}

export function saveLead(name: string): void {
  const leads = getSavedLeads();
  if (!leads.includes(name)) {
    leads.push(name);
    writeJson(LEADS_KEY, leads);
  }
}

export function removeSavedLead(name: string): void {
  const leads = getSavedLeads().filter(l => l !== name);
  writeJson(LEADS_KEY, leads);
}

// ---- Clear all ----

export function clearAllData(): void {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(INBOX_KEY);
  localStorage.removeItem(WAITLIST_KEY);
  localStorage.removeItem(LEADS_KEY);
}
