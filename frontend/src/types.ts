export type Sentiment = 'positive' | 'neutral' | 'negative';

export type Tone = 'friendly' | 'professional' | 'apologetic' | 'promotional';

export interface GeneratedResponse {
  id: string;
  createdAt: string;
  reviewText: string;
  reply: string;
  sentiment: Sentiment;
  tone: Tone;
}

export interface BatchResultItem {
  reviewText: string;
  sentiment: Sentiment;
  reply: string;
  error?: string;
}

export interface SentimentSummary {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
}

export interface Improvement {
  category: string;
  mentionCount: number;
  suggestion: string;
  exampleSnippets: string[];
}

export interface BatchResponse {
  results: BatchResultItem[];
  sentimentSummary: SentimentSummary;
  improvements: Improvement[];
}

// ---- SaaS Dashboard types ----

export type BusinessType = 'restaurant' | 'retail' | 'hotel' | 'salon' | 'clinic' | 'other';

export interface BusinessProfile {
  name: string;
  type: BusinessType;
  address: string;
  phone: string;
  email: string;
  defaultTone: Tone;
}

export interface AnalysisSession {
  id: string;
  createdAt: string;
  businessName: string;
  reviewCount: number;
  results: BatchResultItem[];
  sentimentSummary: SentimentSummary;
  improvements: Improvement[];
  tone: Tone;
}

export interface ReportMetadata {
  id: string;
  createdAt: string;
  sessionId: string;
  businessName: string;
  reviewCount: number;
  score: number;
}

// ---- LeadFinder types ----

export interface RestaurantLead {
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

export interface LeadFinderResponse {
  city: string;
  radius: number;
  leads: RestaurantLead[];
  totalFound: number;
}

// ---- Usage tracking ----

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  plan?: string;
}

// ---- Waitlist ----

export interface WaitlistResponse {
  success: boolean;
  message: string;
  position?: number;
}
