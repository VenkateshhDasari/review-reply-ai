import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// File paths for persistence
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const WAITLIST_FILE = join(DATA_DIR, 'waitlist.json');
const USAGE_FILE = join(DATA_DIR, 'usage.json');

// Ensure data directory exists
try { mkdirSync(DATA_DIR, { recursive: true }); } catch { /* exists */ }

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS — restrict to known origins in production
// In production the frontend is served from the SAME origin as the API,
// so same-origin requests have no Origin header and should always be allowed.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // No origin = same-origin request OR server-to-server / curl — always allow
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '100kb' })); // Explicit body size limit

// Trust proxy for correct IP behind reverse proxy (Render, Railway, etc.)
app.set('trust proxy', 1);

// Global rate limit — 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// Stricter rate limit for generation endpoints — 20 per minute
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests. Please wait a moment.' },
});

// Stricter rate limit for waitlist — 5 per minute
const waitlistLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please wait.' },
});

// ============================================================
// RESTAURANT-FOCUSED SENTIMENT DETECTION
// ============================================================

// Negation prefixes — words that flip the sentiment of the following keyword
const NEGATION_WORDS = ['not', "n't", 'no', 'never', 'neither', 'barely', 'hardly', 'without', 'lack'];
const NEGATION_WINDOW = 3; // max words between negator and keyword

/**
 * Check if a keyword match is preceded by a negation word within NEGATION_WINDOW words.
 * Returns true if the keyword is negated.
 */
function isNegated(text, keyword) {
  const idx = text.indexOf(keyword);
  if (idx <= 0) return false;
  // Grab the few words before the keyword
  const before = text.slice(Math.max(0, idx - 40), idx).trim().split(/\s+/);
  const windowWords = before.slice(-NEGATION_WINDOW);
  return windowWords.some(w => NEGATION_WORDS.some(neg => w === neg || w.endsWith(neg)));
}

function detectSentiment(reviewText) {
  if (!reviewText || typeof reviewText !== 'string') return 'neutral';
  const text = reviewText.toLowerCase();

  const positiveKeywords = [
    'great', 'excellent', 'amazing', 'love', 'loved', 'friendly', 'helpful',
    'recommend', 'fantastic', 'perfect', 'best', 'wonderful', 'outstanding',
    'delicious', 'superb', 'impressed', 'yummy', 'tasty', 'fresh', 'cozy',
    'welcoming', 'attentive', 'generous', 'flavorful', 'beautiful', 'incredible',
    'authentic', 'heavenly', 'satisfying', 'crispy', 'tender', 'juicy',
    'must try', 'must-try', 'five star', '5 star', 'top notch', 'spot on',
    'come back', 'coming back', 'go back', 'return'
  ];

  const negativeKeywords = [
    'bad', 'terrible', 'awful', 'rude', 'disappointing', 'disappointed',
    'horrible', 'poor', 'never again', 'worst', 'slow', 'cold', 'dirty',
    'overpriced', 'waited', 'waiting', 'frustrated', 'disgusting', 'stale',
    'unfriendly', 'unacceptable', 'undercooked', 'overcooked', 'raw',
    'burnt', 'soggy', 'bland', 'tasteless', 'greasy', 'inedible',
    'food poisoning', 'sick', 'stomach', 'bug', 'cockroach', 'hair in',
    'wrong order', 'mixed up', 'forgot', 'forgotten', 'missing',
    'no parking', 'loud', 'noisy', 'cramped', 'small portions', 'tiny portions'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveKeywords) {
    if (text.includes(word)) {
      if (isNegated(text, word)) {
        // "not great" → counts as negative
        negativeScore += 1;
      } else {
        positiveScore += 1;
      }
    }
  }

  for (const word of negativeKeywords) {
    if (text.includes(word)) {
      if (isNegated(text, word)) {
        // "not bad" → counts as positive
        positiveScore += 1;
      } else {
        negativeScore += 1;
      }
    }
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

// ============================================================
// RESTAURANT TOPIC DETECTION
// ============================================================

function detectTopics(text) {
  const lower = text.toLowerCase();
  const topics = [];

  if (/pizza|burger|pasta|sushi|steak|chicken|fish|seafood|salad|soup|sandwich|taco|burrito|noodle|rice|curry|wings/.test(lower)) {
    const match = lower.match(/pizza|burger|pasta|sushi|steak|chicken|fish|seafood|salad|soup|sandwich|taco|burrito|noodle|rice|curry|wings/);
    topics.push({ type: 'food_item', value: match[0] });
  }
  if (/food|meal|dish|menu|appetizer|entree|dessert|breakfast|lunch|dinner|brunch/.test(lower)) {
    topics.push({ type: 'food_general', value: 'food' });
  }
  if (/server|waiter|waitress|hostess|host|bartender|manager|staff|employee/.test(lower)) {
    const match = lower.match(/server|waiter|waitress|hostess|host|bartender|manager|staff|employee/);
    topics.push({ type: 'staff', value: match[0] });
  }
  if (/wait|waited|waiting|slow|quick|fast|prompt|rush/.test(lower)) {
    topics.push({ type: 'wait_time', value: 'wait time' });
  }
  if (/atmosphere|ambiance|ambience|decor|music|vibe|cozy|romantic|loud|noisy|quiet/.test(lower)) {
    topics.push({ type: 'ambiance', value: 'ambiance' });
  }
  if (/delivery|doordash|uber eats|grubhub|takeout|take out|pickup|pick up|to go|carry out/.test(lower)) {
    topics.push({ type: 'delivery', value: 'delivery/takeout' });
  }
  if (/price|expensive|cheap|affordable|value|worth|pricey|overpriced|portion/.test(lower)) {
    topics.push({ type: 'pricing', value: 'pricing' });
  }
  if (/clean|dirty|filthy|hygiene|bathroom|restroom|messy|sticky|smell/.test(lower)) {
    topics.push({ type: 'cleanliness', value: 'cleanliness' });
  }
  if (/reservation|table|seat|seating|patio|outdoor|indoor|booth/.test(lower)) {
    topics.push({ type: 'seating', value: 'seating' });
  }

  return topics;
}

// ============================================================
// RESTAURANT-SMART RESPONSE ENGINE
// ============================================================

function buildSmartResponse({ reviewText, businessName, sentiment, tone }) {
  const name = businessName || 'our restaurant';
  const topics = detectTopics(reviewText);
  const lower = reviewText.toLowerCase();

  const greetings = {
    friendly: ['Hi there!', 'Hey, thanks for stopping by!', 'Hello!', 'Thanks so much for sharing!'],
    professional: ['Thank you for your review.', 'We appreciate your feedback.', 'Thank you for taking the time to review us.'],
    apologetic: ["We're truly sorry about your experience.", "We sincerely apologize.", "We're sorry to hear this."],
    promotional: [`Thanks for choosing ${name}!`, `We're glad you visited ${name}!`, `Thank you for dining with us at ${name}!`]
  };

  const parts = [];
  const greetList = greetings[tone] || greetings.friendly;
  parts.push(greetList[Math.floor(Math.random() * greetList.length)]);

  if (sentiment === 'positive') {
    const foodItem = topics.find(t => t.type === 'food_item');
    const staffMention = topics.find(t => t.type === 'staff');
    const ambianceMention = topics.find(t => t.type === 'ambiance');
    const deliveryMention = topics.find(t => t.type === 'delivery');

    if (foodItem) {
      const foodResponses = [
        `We're thrilled you enjoyed the ${foodItem.value}! Our kitchen team takes real pride in getting it just right.`,
        `So happy to hear the ${foodItem.value} hit the spot! We'll pass the compliment to our chef.`,
        `The ${foodItem.value} is one of our favorites too! Glad it lived up to expectations.`,
        `Our chef will be smiling ear to ear knowing you loved the ${foodItem.value}!`
      ];
      parts.push(foodResponses[Math.floor(Math.random() * foodResponses.length)]);
    } else if (topics.find(t => t.type === 'food_general')) {
      const generalFood = [
        'We put a lot of love into every dish that comes out of our kitchen, and it means the world to hear you enjoyed it.',
        "Hearing that you loved the food makes our day! We're passionate about quality ingredients and great flavors.",
        "Our kitchen team works hard to deliver great food every time, and your review is the best reward!"
      ];
      parts.push(generalFood[Math.floor(Math.random() * generalFood.length)]);
    }

    if (staffMention) {
      const staffResponses = [
        `We'll make sure to pass your kind words along to our ${staffMention.value} — it'll make their day!`,
        `Our team works hard to make every guest feel welcome, and reviews like yours remind us why.`,
        `We're proud of our team and love hearing that they made your visit special!`
      ];
      parts.push(staffResponses[Math.floor(Math.random() * staffResponses.length)]);
    }

    if (ambianceMention) {
      parts.push("We've worked hard to create a space where people feel comfortable and enjoy their time, so that means a lot!");
    }

    if (deliveryMention) {
      parts.push("Glad the delivery experience was smooth! We work hard to make sure food arrives fresh and on time.");
    }

    if (topics.length === 0) {
      const generalPositive = [
        "We're so glad you had a wonderful experience with us! Your kind words truly brighten our day.",
        "Reviews like yours are what keep our team motivated. Thank you for taking the time to share!",
        "It means the world to us that you had a great experience. We can't wait to welcome you back!"
      ];
      parts.push(generalPositive[Math.floor(Math.random() * generalPositive.length)]);
    }

    const positiveClosings = [
      `We can't wait to welcome you back to ${name}!`,
      `Hope to see you again soon! We've always got something delicious waiting for you.`,
      `Your next visit is on the horizon — we'll make it even better!`,
      `Thanks again for the love! See you next time at ${name}.`
    ];
    parts.push(positiveClosings[Math.floor(Math.random() * positiveClosings.length)]);

  } else if (sentiment === 'negative') {
    const waitMention = topics.find(t => t.type === 'wait_time');
    const foodItem = topics.find(t => t.type === 'food_item');
    const staffMention = topics.find(t => t.type === 'staff');
    const cleanMention = topics.find(t => t.type === 'cleanliness');
    const priceMention = topics.find(t => t.type === 'pricing');
    const deliveryMention = topics.find(t => t.type === 'delivery');

    parts.push("We sincerely apologize that your experience didn't meet our standards.");

    if (waitMention) {
      const waitResponses = [
        "We understand how frustrating long wait times can be, especially when you're hungry. We're actively working on improving our kitchen flow and staffing during peak hours.",
        "Wait times like that are not acceptable to us. We're reviewing our processes to make sure this doesn't happen again."
      ];
      parts.push(waitResponses[Math.floor(Math.random() * waitResponses.length)]);
    }

    if (foodItem || topics.find(t => t.type === 'food_general')) {
      if (lower.includes('cold')) {
        parts.push("Food arriving cold is a serious issue we take to heart. We're reinforcing our quality checks to ensure every plate leaves the kitchen at the right temperature.");
      } else if (lower.includes('undercooked') || lower.includes('raw')) {
        parts.push("Food safety is our top priority. We're immediately reviewing our cooking procedures with our kitchen team to prevent this.");
      } else if (lower.includes('overcooked') || lower.includes('burnt')) {
        parts.push("We pride ourselves on getting every dish right, and we clearly fell short here. Our chef has been made aware.");
      } else if (lower.includes('bland') || lower.includes('tasteless')) {
        parts.push("We strive for bold, memorable flavors in every dish. We'll revisit our seasoning and preparation for consistency.");
      } else {
        parts.push("The food quality you described is not what we stand for. We're taking this feedback directly to our kitchen team.");
      }
    }

    if (staffMention) {
      parts.push("Every guest deserves to be treated with respect and warmth. We're addressing this with our team immediately and will be conducting additional hospitality training.");
    }

    if (cleanMention) {
      parts.push("Cleanliness is non-negotiable for us. We're conducting an immediate review of our cleaning procedures and schedules.");
    }

    if (priceMention) {
      parts.push("We want every guest to feel they got great value. We're reviewing our portions and pricing to ensure a fair experience.");
    }

    if (deliveryMention) {
      parts.push("We know how important it is that delivery orders arrive fresh and correct. We're working with our delivery process to improve this.");
    }

    if (topics.length === 0) {
      parts.push("This is not the experience we want for any of our guests, and we take your feedback very seriously.");
    }

    const negativeClosings = [
      `We'd love the chance to make it up to you. Please reach out to us directly at ${name} so we can personally ensure your next visit is excellent.`,
      `Your feedback helps us get better. We hope you'll give us another chance to show you what ${name} is really about.`,
      `We're committed to doing better. Please don't hesitate to contact us — we want to make this right.`
    ];
    parts.push(negativeClosings[Math.floor(Math.random() * negativeClosings.length)]);

  } else {
    parts.push("We appreciate you sharing your honest feedback.");

    if (topics.find(t => t.type === 'food_item' || t.type === 'food_general')) {
      parts.push("We're always refining our menu and recipes, and feedback like yours helps us know where to focus.");
    }
    if (topics.find(t => t.type === 'staff')) {
      parts.push("We'll share your comments with our team so they can continue to improve.");
    }
    if (topics.length === 0) {
      parts.push("Every review helps us identify areas where we can do better. We're always working to improve the experience at " + name + ".");
    }

    const neutralClosings = [
      `We'd love to see you again and make your next experience at ${name} a standout one!`,
      `We value your feedback and hope to exceed your expectations next time at ${name}.`,
      `Thanks for dining with us — we're committed to earning a better review next time!`
    ];
    parts.push(neutralClosings[Math.floor(Math.random() * neutralClosings.length)]);
  }

  parts.push(`\n— The ${name} Team`);
  return parts.filter(Boolean).join(' ');
}

async function generateResponseWithAI({ reviewText, businessName, sentiment, tone }) {
  return buildSmartResponse({ reviewText, businessName, sentiment, tone });
}

// ============================================================
// RESTAURANT-SPECIFIC IMPROVEMENT EXTRACTION
// ============================================================

function extractImprovements(reviews) {
  const themes = {
    kitchen_timing: { keywords: ['slow', 'wait', 'waiting', 'waited', 'forever', 'hour', 'minutes', 'long time', 'took forever'], hits: 0, reviews: [] },
    food_temperature: { keywords: ['cold', 'lukewarm', 'not hot', 'room temperature', 'frozen', 'ice cold'], hits: 0, reviews: [] },
    food_quality: { keywords: ['undercooked', 'overcooked', 'raw', 'burnt', 'stale', 'soggy', 'bland', 'tasteless', 'dry', 'greasy', 'old'], hits: 0, reviews: [] },
    food_safety: { keywords: ['hair', 'bug', 'cockroach', 'fly', 'food poisoning', 'sick', 'stomach', 'ill', 'foreign object'], hits: 0, reviews: [] },
    staff_attitude: { keywords: ['rude', 'unfriendly', 'attitude', 'ignored', 'disrespectful', 'unprofessional', 'careless', 'dismissive'], hits: 0, reviews: [] },
    order_accuracy: { keywords: ['wrong order', 'mixed up', 'forgot', 'forgotten', 'missing', 'incorrect', 'not what i ordered'], hits: 0, reviews: [] },
    cleanliness: { keywords: ['dirty', 'filthy', 'unclean', 'messy', 'gross', 'sticky', 'smell', 'bathroom', 'restroom'], hits: 0, reviews: [] },
    pricing_value: { keywords: ['expensive', 'overpriced', 'pricey', 'not worth', 'small portions', 'tiny', 'ripoff', 'rip off'], hits: 0, reviews: [] },
    ambiance_noise: { keywords: ['loud', 'noisy', 'cramped', 'crowded', 'uncomfortable', 'dark', 'cold inside', 'hot inside'], hits: 0, reviews: [] },
    delivery_issues: { keywords: ['delivery', 'late delivery', 'cold delivery', 'missing items', 'wrong address', 'spilled', 'damaged'], hits: 0, reviews: [] }
  };

  for (const review of reviews) {
    const text = review.toLowerCase();
    for (const [, theme] of Object.entries(themes)) {
      for (const kw of theme.keywords) {
        if (text.includes(kw)) {
          theme.hits++;
          theme.reviews.push(review.slice(0, 80));
          break;
        }
      }
    }
  }

  const suggestions = {
    kitchen_timing: 'Audit kitchen workflow during peak hours. Consider adding a prep cook or expeditor to reduce ticket times.',
    food_temperature: 'Implement plate-warming and heat lamp protocols. Ensure orders are served within 60 seconds of plating.',
    food_quality: 'Schedule weekly menu tasting with kitchen staff. Standardize recipes with exact measurements.',
    food_safety: 'URGENT: Conduct immediate deep-clean and pest inspection. Review food handling protocols.',
    staff_attitude: 'Schedule monthly hospitality training. Implement pre-shift team huddles to set service tone.',
    order_accuracy: 'Implement order verification system (read-back to customer). Use kitchen display system to reduce errors.',
    cleanliness: 'Create hourly cleaning checklists for FOH and restrooms. Assign cleaning captains per shift.',
    pricing_value: 'Review portion sizes vs. price points. Consider value meals or combo deals.',
    ambiance_noise: 'Consider acoustic panels or background music adjustments. Review table spacing for comfort.',
    delivery_issues: 'Use insulated bags and sealed containers. Verify orders before handoff to driver.'
  };

  return Object.entries(themes)
    .filter(([, t]) => t.hits > 0)
    .sort((a, b) => b[1].hits - a[1].hits)
    .map(([category, t]) => ({
      category,
      mentionCount: t.hits,
      suggestion: suggestions[category],
      exampleSnippets: t.reviews.slice(0, 3)
    }));
}

// ============================================================
// PERSISTENT STORAGE HELPERS
// ============================================================

function loadJson(filePath, fallback) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch { /* corrupted file, use fallback */ }
  return fallback;
}

function saveJson(filePath, data) {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save ${filePath}:`, err.message);
  }
}

// ============================================================
// USAGE TRACKING (persisted to JSON file)
// ============================================================

const usageStore = new Map(Object.entries(loadJson(USAGE_FILE, {})));

function persistUsage() {
  const obj = {};
  for (const [key, val] of usageStore) {
    obj[key] = val;
  }
  saveJson(USAGE_FILE, obj);
}

function getUsage(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const record = usageStore.get(ip);
  if (!record || record.resetDate !== today) {
    usageStore.set(ip, { count: 0, resetDate: today, monthCount: record?.monthCount || 0, monthKey: today.slice(0, 7) });
  }
  const current = usageStore.get(ip);
  if (current.monthKey !== today.slice(0, 7)) {
    current.monthCount = 0;
    current.monthKey = today.slice(0, 7);
  }
  return current;
}

const FREE_MONTHLY_LIMIT = 15;

// ============================================================
// OWNER AUTHENTICATION (cookie-based, no key in frontend)
// ============================================================

// Owner key — MUST be set via environment variable. No hardcoded fallback.
const OWNER_KEY = process.env.OWNER_KEY;
if (!OWNER_KEY) {
  console.warn('[WARN] OWNER_KEY not set in environment. Owner features disabled. Set OWNER_KEY in .env to enable.');
}

const OWNER_SESSION_TOKENS = new Set();

function isOwner(req) {
  const sessionToken = req.cookies?.rrai_owner_session;
  if (sessionToken && OWNER_SESSION_TOKENS.has(sessionToken)) {
    return true;
  }
  const keyFromHeader = req.headers['x-owner-key'];
  if (OWNER_KEY && keyFromHeader === OWNER_KEY) {
    return true;
  }
  return false;
}

function checkUsage(ip, reviewCount, req) {
  if (isOwner(req)) {
    return { allowed: true, remaining: 999999, limit: 999999, used: 0, owner: true };
  }
  const usage = getUsage(ip);
  const remaining = FREE_MONTHLY_LIMIT - usage.monthCount;
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, limit: FREE_MONTHLY_LIMIT, used: usage.monthCount };
  }
  if (reviewCount > remaining) {
    return { allowed: false, remaining, limit: FREE_MONTHLY_LIMIT, used: usage.monthCount };
  }
  return { allowed: true, remaining: remaining - reviewCount, limit: FREE_MONTHLY_LIMIT, used: usage.monthCount };
}

function recordUsage(ip, count) {
  const usage = getUsage(ip);
  usage.count += count;
  usage.monthCount += count;
  persistUsage();
}

// ============================================================
// INPUT VALIDATION
// ============================================================

const MAX_REVIEW_LENGTH = 2000;
const MAX_BUSINESS_NAME_LENGTH = 100;

function sanitizeText(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}

// ============================================================
// API ENDPOINTS
// ============================================================

// --- Owner login ---
app.post('/api/owner/login', (req, res) => {
  const { key } = req.body || {};
  if (!OWNER_KEY) {
    return res.status(503).json({ error: 'Owner authentication is not configured.' });
  }
  if (key !== OWNER_KEY) {
    return res.status(401).json({ error: 'Invalid owner key.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  OWNER_SESSION_TOKENS.add(token);
  res.cookie('rrai_owner_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return res.json({ success: true, message: 'Owner session active.' });
});

app.post('/api/owner/logout', (req, res) => {
  const sessionToken = req.cookies?.rrai_owner_session;
  if (sessionToken) OWNER_SESSION_TOKENS.delete(sessionToken);
  res.clearCookie('rrai_owner_session', { path: '/' });
  return res.json({ success: true });
});

app.get('/api/owner/status', (req, res) => {
  return res.json({ isOwner: isOwner(req) });
});

// --- Usage status ---
app.get('/api/usage', (req, res) => {
  if (isOwner(req)) {
    return res.json({ used: 0, limit: 999999, remaining: 999999, plan: 'owner' });
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const usage = getUsage(ip);
  res.json({
    used: usage.monthCount,
    limit: FREE_MONTHLY_LIMIT,
    remaining: Math.max(0, FREE_MONTHLY_LIMIT - usage.monthCount)
  });
});

// --- Single review ---
app.post('/api/generate-reply', generateLimiter, async (req, res) => {
  try {
    const { reviewText: rawReview, tone = 'friendly', businessName: rawName } = req.body || {};
    if (!rawReview || typeof rawReview !== 'string') {
      return res.status(400).json({ error: 'reviewText is required' });
    }
    const reviewText = sanitizeText(rawReview, MAX_REVIEW_LENGTH);
    const businessName = sanitizeText(rawName || '', MAX_BUSINESS_NAME_LENGTH);
    if (reviewText.length === 0) {
      return res.status(400).json({ error: 'reviewText is required' });
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const usageCheck = checkUsage(ip, 1, req);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: 'Monthly limit reached', usage: usageCheck, upgrade: true });
    }

    const sentiment = detectSentiment(reviewText);
    const reply = await generateResponseWithAI({ reviewText, businessName, sentiment, tone });
    if (!usageCheck.owner) recordUsage(ip, 1);

    const usage = getUsage(ip);
    return res.json({
      sentiment, reply,
      usage: { used: usage.monthCount, limit: FREE_MONTHLY_LIMIT, remaining: FREE_MONTHLY_LIMIT - usage.monthCount }
    });
  } catch (error) {
    console.error('Error generating reply', error);
    return res.status(500).json({ error: 'Failed to generate reply' });
  }
});

// --- Batch reviews ---
app.post('/api/generate-replies', generateLimiter, async (req, res) => {
  try {
    const { reviews, tone = 'friendly', businessName: rawName } = req.body || {};
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'reviews must be a non-empty array of strings' });
    }
    if (reviews.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 reviews per batch' });
    }

    const businessName = sanitizeText(rawName || '', MAX_BUSINESS_NAME_LENGTH);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const usageCheck = checkUsage(ip, reviews.length, req);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: `Monthly limit reached. You have ${usageCheck.remaining} reviews remaining this month.`,
        usage: usageCheck, upgrade: true
      });
    }

    const results = [];
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let successCount = 0;

    for (const rawReview of reviews) {
      if (!rawReview || typeof rawReview !== 'string') {
        results.push({ reviewText: rawReview ?? '', sentiment: 'neutral', reply: '', error: 'Invalid review text' });
        continue;
      }
      const trimmed = sanitizeText(rawReview, MAX_REVIEW_LENGTH);
      if (trimmed.length === 0) {
        results.push({ reviewText: '', sentiment: 'neutral', reply: '', error: 'Empty review text' });
        continue;
      }
      const sentiment = detectSentiment(trimmed);
      sentimentCounts[sentiment]++;
      const reply = await generateResponseWithAI({ reviewText: trimmed, businessName, sentiment, tone });
      results.push({ reviewText: trimmed, sentiment, reply });
      successCount++;
    }

    // Only charge for successfully processed reviews
    if (!usageCheck.owner && successCount > 0) recordUsage(ip, successCount);

    const total = results.filter(r => !r.error).length;
    const sentimentSummary = {
      total,
      positive: sentimentCounts.positive,
      neutral: sentimentCounts.neutral,
      negative: sentimentCounts.negative,
      positivePercent: total > 0 ? Math.round((sentimentCounts.positive / total) * 100) : 0,
      neutralPercent: total > 0 ? Math.round((sentimentCounts.neutral / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((sentimentCounts.negative / total) * 100) : 0
    };

    const negativeAndNeutralReviews = results
      .filter(r => !r.error && (r.sentiment === 'negative' || r.sentiment === 'neutral'))
      .map(r => r.reviewText);
    const improvements = extractImprovements(negativeAndNeutralReviews);
    const usage = getUsage(ip);

    return res.json({
      results, sentimentSummary, improvements,
      usage: { used: usage.monthCount, limit: FREE_MONTHLY_LIMIT, remaining: FREE_MONTHLY_LIMIT - usage.monthCount }
    });
  } catch (error) {
    console.error('Error generating batch replies', error);
    return res.status(500).json({ error: 'Failed to generate batch replies' });
  }
});

// --- Waitlist (persisted to file) ---
const waitlist = loadJson(WAITLIST_FILE, []);

app.post('/api/waitlist', waitlistLimiter, (req, res) => {
  const { email, businessName, phone } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 200) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (waitlist.find(w => w.email === email.trim())) {
    return res.json({ success: true, message: 'Already on the waitlist!' });
  }
  waitlist.push({
    email: email.trim(),
    businessName: sanitizeText(businessName || '', MAX_BUSINESS_NAME_LENGTH),
    phone: sanitizeText(phone || '', 20),
    createdAt: new Date().toISOString()
  });
  saveJson(WAITLIST_FILE, waitlist);
  console.log(`[WAITLIST] New signup: ${email.trim()} — ${businessName || 'no name'} (Total: ${waitlist.length})`);
  return res.json({ success: true, message: "Welcome! You're on the early access list." });
});

app.get('/api/waitlist/count', (_req, res) => {
  res.json({ count: waitlist.length });
});

// --- LeadFinder: demo data ---
function generateLeadData(city, radius) {
  const restaurants = [
    { name: "Mario's Italian Kitchen", address: '412 Oak Street', rating: 2.3, reviewCount: 87, topComplaint: 'Cold food, slow service', phone: '(555) 123-4001' },
    { name: "Dragon Palace", address: '1890 Market Blvd', rating: 2.8, reviewCount: 142, topComplaint: 'Long wait times, rude staff', phone: '(555) 123-4002' },
    { name: "Burger Barn", address: '305 Elm Avenue', rating: 2.1, reviewCount: 63, topComplaint: 'Food quality, cleanliness', phone: '(555) 123-4003' },
    { name: "Taco Fiesta", address: '2200 Pine Road', rating: 3.0, reviewCount: 198, topComplaint: 'Order accuracy, pricing', phone: '(555) 123-4004' },
    { name: "Sushi Wave", address: '77 Harbor Drive', rating: 2.5, reviewCount: 54, topComplaint: 'Fish freshness, small portions', phone: '(555) 123-4005' },
    { name: "The Greasy Spoon", address: '1100 Main Street', rating: 1.9, reviewCount: 231, topComplaint: 'Hygiene issues, food safety', phone: '(555) 123-4006' },
    { name: "Café Europa", address: '3400 Broadway', rating: 2.7, reviewCount: 112, topComplaint: 'Overpriced, slow service', phone: '(555) 123-4007' },
    { name: "Wok This Way", address: '890 Center Ave', rating: 3.1, reviewCount: 76, topComplaint: 'Delivery issues, cold food', phone: '(555) 123-4008' },
    { name: "Pepperoni Pete's", address: '560 College Blvd', rating: 2.4, reviewCount: 167, topComplaint: 'Wrong orders, late delivery', phone: '(555) 123-4009' },
    { name: "BBQ Smokehouse", address: '2100 Ranch Road', rating: 2.6, reviewCount: 93, topComplaint: 'Dry meat, long waits', phone: '(555) 123-4010' },
    { name: "Pho Real", address: '445 Asian District', rating: 3.2, reviewCount: 48, topComplaint: 'Bland broth, small portions', phone: '(555) 123-4011' },
    { name: "Bella Pasta Co.", address: '1200 Villa Lane', rating: 2.9, reviewCount: 134, topComplaint: 'Overcooked pasta, noisy', phone: '(555) 123-4012' },
  ];

  const shuffled = restaurants.sort(() => 0.5 - Math.random());
  const count = Math.min(shuffled.length, Math.max(5, Math.floor(Math.random() * 4) + 6));
  return shuffled.slice(0, count).map((r, i) => ({
    id: `lead-${Date.now()}-${i}`,
    ...r,
    city: city || 'Your City',
    distance: `${(Math.random() * (radius || 10)).toFixed(1)} mi`,
    opportunity: r.rating <= 2.5 ? 'high' : 'medium',
    estimatedRevenue: `$${(Math.floor(Math.random() * 300) + 100)}/mo`
  }));
}

app.post('/api/leads/find', (req, res) => {
  const { city, radius = 10 } = req.body || {};
  if (!city || typeof city !== 'string') {
    return res.status(400).json({ error: 'City name is required' });
  }
  const cleanCity = sanitizeText(city, 100);
  return res.json({ city: cleanCity, radius, totalFound: 0, leads: generateLeadData(cleanCity, radius) });
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Serve static frontend in production ---
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');

if (process.env.NODE_ENV === 'production') {
  console.log(`[STATIC] Serving frontend from: ${frontendDist}`);
  console.log(`[STATIC] index.html exists: ${existsSync(join(frontendDist, 'index.html'))}`);
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(frontendDist, 'index.html'));
    }
  });
} else {
  console.log(`[DEV] Not serving static files (NODE_ENV=${process.env.NODE_ENV})`);
}

app.listen(PORT, () => {
  console.log(`ReviewReply AI backend listening on http://localhost:${PORT}`);
  console.log(`Owner auth: ${OWNER_KEY ? 'ENABLED' : 'DISABLED (set OWNER_KEY in .env)'}`);
});
