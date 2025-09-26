// backend/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Simple in-memory cache for AI responses
const aiCache = new Map();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// [UPDATE] Centralized source of truth for all tracker categories.
// These categories are derived from your classifyDomain function.
export const TRACKER_CATEGORIES = {
  Advertising: "Advertising",
  Analytics: "Analytics",
  Social: "Social",
  "Tag Manager": "Tag Manager",
  "CDN/Utility": "CDN/Utility",
  Unknown: "Unknown",
};


export async function generateAIPrivacySummary(trackers, url) {
  try {
    // Check cache first
    const cacheKey = `${url}_${trackers.sort().join(',')}`;
    const cached = aiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.data;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not found");
      const fallbackResponse = {
        success: false,
        note: "AI analysis unavailable - API key missing",
        summary: {
          whatTheyCollect: [],
          whoTheyShareWith: [],
          howLongTheyKeep: "Information not available",
          keyRisks: [],
          trackerBreakdown: [],
        },
      };

      // Cache the fallback response too
      aiCache.set(cacheKey, {
        data: fallbackResponse,
        timestamp: Date.now()
      });
      return fallbackResponse;
    }
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    // Create a comprehensive prompt
    const prompt = `
You are a privacy analysis expert. Analyze the following website and its trackers to provide a comprehensive privacy summary.

Website: ${url}
Detected Trackers: ${trackers.join(", ")}

Please provide a JSON response with the following structure:
{
  "whatTheyCollect": ["specific data types they collect"],
  "whoTheyShareWith": ["companies/partners they share data with"],
  "howLongTheyKeep": "data retention period",
  "keyRisks": ["privacy risks to users"],
  "trackerBreakdown": ["explanation of major trackers found"]
}

Guidelines:
- Be specific and factual about data collection practices
- Identify actual companies based on the tracker domains
- Explain privacy risks in user-friendly language
- Keep each array item concise but informative
- Focus on the most significant privacy concerns
- If information is unknown, indicate that clearly

Analyze the tracker domains to identify:
- Google services (analytics, ads, tag manager)
- Social media trackers (Facebook, Twitter, etc.)
- Ad networks (DoubleClick, AdNxs, etc.)
- Analytics services (Mixpanel, Hotjar, etc.)
- Data brokers and audience platforms

Provide realistic assessments based on the actual trackers detected.
`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response;
    const text = aiResponse.text();

    // Try to parse JSON from the response
    let summary;
    try {
      // Extract JSON from the response (sometimes the model adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON:", parseError.message);

      // Fallback: create a basic summary based on trackers
      summary = createFallbackSummary(trackers, url);
    }

    // Validate and sanitize the summary
    const validatedSummary = validateSummary(summary);
    const trackerDetails = buildTrackerDetails(trackers);

    // Build popup/full variants with sentence-aware limits
    const sentenceAwareTruncate = (text, targetWords = 40) => {
      if (!text || typeof text !== 'string') return text;
      const clean = text.trim();
      if (!clean) return clean;
      const sentences = clean.split(/(?<=[.!?])\s+/);
      let out = [];
      let count = 0;
      for (const s of sentences) {
        const w = s.trim().split(/\s+/).filter(Boolean);
        if (w.length === 0) continue;
        out.push(s.trim());
        count += w.length;
        if (count >= targetWords) break;
      }
      if (out.length > 0) return out.join(' ');
      const words = clean.split(/\s+/);
      if (words.length <= targetWords) return clean;
      return words.slice(0, targetWords).join(' ') + '…';
    };

    const limitArray = (arr, words) =>
      (Array.isArray(arr) ? arr : []).map((t) => sentenceAwareTruncate(String(t), words));

    const popupSummary = {
      whatTheyCollect: limitArray(validatedSummary.whatTheyCollect, 40).slice(0, 3),
      whoTheyShareWith: limitArray(validatedSummary.whoTheyShareWith, 40).slice(0, 3),
      howLongTheyKeep: sentenceAwareTruncate(validatedSummary.howLongTheyKeep, 40),
      keyRisks: limitArray(validatedSummary.keyRisks, 40).slice(0, 3),
      trackerBreakdown: limitArray(validatedSummary.trackerBreakdown, 40).slice(0, 3),
    };

    const fullSummary = {
      whatTheyCollect: limitArray(validatedSummary.whatTheyCollect, 70).slice(0, 5),
      whoTheyShareWith: limitArray(validatedSummary.whoTheyShareWith, 70).slice(0, 6),
      howLongTheyKeep: sentenceAwareTruncate(validatedSummary.howLongTheyKeep, 70),
      keyRisks: limitArray(validatedSummary.keyRisks, 70).slice(0, 4),
      trackerBreakdown: limitArray(validatedSummary.trackerBreakdown, 70).slice(0, 4),
    };

    const finalResponse = {
      success: true,
      summary: { ...validatedSummary, popupSummary, fullSummary },
      trackerCount: trackers.length,
      trackerDetails,
      rawResponse: text, // For debugging
    };

    // Cache the successful response
    aiCache.set(cacheKey, {
      data: finalResponse,
      timestamp: Date.now()
    });

    return finalResponse;
  } catch (error) {
    console.error("Gemini AI error:", error.message);

    // Return fallback summary instead of failing completely
    return {
      success: false,
      note: `AI analysis failed: ${error.message}`,
      summary: createFallbackSummary(trackers, url),
      trackerDetails: buildTrackerDetails(trackers),
    };
  }
}

function createFallbackSummary(trackers, url) {
  const domain = new URL(url).hostname;

  // Analyze trackers to create basic summary
  const googleTrackers = trackers.filter((t) => t.includes("google"));
  const facebookTrackers = trackers.filter((t) => t.includes("facebook"));
  const adTrackers = trackers.filter(
    (t) => t.includes("ads") || t.includes("doubleclick") || t.includes("adnxs")
  );
  const analyticsTrackers = trackers.filter(
    (t) =>
      t.includes("analytics") || t.includes("mixpanel") || t.includes("hotjar")
  );

  const companies = [];
  if (googleTrackers.length > 0) companies.push("Google");
  if (facebookTrackers.length > 0) companies.push("Meta/Facebook");
  if (adTrackers.length > 0) companies.push("Advertising Networks");
  if (analyticsTrackers.length > 0) companies.push("Analytics Providers");

  return {
    whatTheyCollect: [
      "Browsing behavior and page views",
      "Device and browser information",
      "IP address and location data",
      ...(trackers.length > 5 ? ["User interactions and clicks"] : []),
      ...(trackers.length > 10 ? ["Cross-site tracking data"] : []),
    ],
    whoTheyShareWith:
      companies.length > 0 ? companies : ["Third-party partners"],
    howLongTheyKeep:
      trackers.length > 8
        ? "Up to 2 years or indefinitely"
        : "Varies by service",
    keyRisks: [
      `Your browsing on ${domain} may be tracked across other websites`,
      ...(trackers.length > 5
        ? ["Detailed behavioral profiling for advertising"]
        : []),
      ...(trackers.length > 10
        ? ["Extensive data sharing with multiple partners"]
        : []),
    ],
    trackerBreakdown: trackers.slice(0, 4).map((tracker) => {
      if (tracker.includes("google")) {
        return `${tracker}: Google's tracking service for analytics and advertising`;
      } else if (tracker.includes("facebook")) {
        return `${tracker}: Meta's social media and advertising tracker`;
      } else if (tracker.includes("doubleclick")) {
        return `${tracker}: Google's advertising network for targeted ads`;
      } else {
        return `${tracker}: Third-party tracking and analytics service`;
      }
    }),
  };
}

function validateSummary(summary) {
  const validated = {
    whatTheyCollect: Array.isArray(summary.whatTheyCollect)
      ? summary.whatTheyCollect.slice(0, 8)
      : ["Information not available"],

    whoTheyShareWith: Array.isArray(summary.whoTheyShareWith)
      ? summary.whoTheyShareWith.slice(0, 10)
      : ["Information not available"],

    howLongTheyKeep:
      typeof summary.howLongTheyKeep === "string"
        ? summary.howLongTheyKeep
        : "Information not available",

    keyRisks: Array.isArray(summary.keyRisks)
      ? summary.keyRisks.slice(0, 6)
      : ["Privacy risks could not be determined"],

    trackerBreakdown: Array.isArray(summary.trackerBreakdown)
      ? summary.trackerBreakdown.slice(0, 5)
      : [],
  };

  return validated;
}

// Infer tracker vendor/category from domain list using regex rules
function buildTrackerDetails(trackers) {
  const details = [];
  for (const domain of trackers || []) {
    const info = classifyDomain(domain.toLowerCase());
    details.push({
      domain,
      name: info.name,
      category: info.category,
      company: info.company,
    });
  }
  return details;
}

function classifyDomain(lower) {
  const rules = [
    {
      re: /doubleclick|googlesyndication|googleadservices|ads\.google|adservice\.google/,
      name: "Google Ads",
      category: "Advertising",
      company: "Google",
    },
    {
      re: /googletagmanager|gtm/,
      name: "Google Tag Manager",
      category: "Tag Manager",
      company: "Google",
    },
    {
      re: /google-analytics|analytics\.google/,
      name: "Google Analytics",
      category: "Analytics",
      company: "Google",
    },
    {
      re: /gstatic|googleapis/,
      name: "Google Static/Services",
      category: "CDN/Utility",
      company: "Google",
    },
    {
      re: /\.google\./,
      name: "Google Services",
      category: "CDN/Utility",
      company: "Google",
    },

    {
      re: /facebook|fbcdn|fbevents|connect\.facebook\.net/,
      name: "Meta Pixel",
      category: "Advertising",
      company: "Meta",
    },
    {
      re: /instagram\.com/,
      name: "Instagram",
      category: "Social",
      company: "Meta",
    },

    {
      re: /linkedin|licdn|bat\.bing\.com|bingads/,
      name: "Microsoft Ads/LinkedIn",
      category: "Advertising",
      company: "Microsoft",
    },

    {
      re: /twitter|tiktok|snapchat|pinterest/,
      name: "Social Network",
      category: "Social",
      company: "Various",
    },

    {
      re: /adnxs|appnexus/,
      name: "AppNexus (Adnxs)",
      category: "Advertising",
      company: "Microsoft (Xandr)",
    },
    {
      re: /rubiconproject/,
      name: "Rubicon Project (Magnite)",
      category: "Advertising",
      company: "Magnite",
    },
    {
      re: /pubmatic/,
      name: "PubMatic",
      category: "Advertising",
      company: "PubMatic",
    },
    {
      re: /criteo/,
      name: "Criteo",
      category: "Advertising",
      company: "Criteo",
    },
    {
      re: /taboola/,
      name: "Taboola",
      category: "Advertising",
      company: "Taboola",
    },
    {
      re: /outbrain/,
      name: "Outbrain",
      category: "Advertising",
      company: "Outbrain",
    },
    { re: /openx/, name: "OpenX", category: "Advertising", company: "OpenX" },
    {
      re: /adroll/,
      name: "AdRoll",
      category: "Advertising",
      company: "NextRoll",
    },

    {
      re: /mixpanel/,
      name: "Mixpanel",
      category: "Analytics",
      company: "Mixpanel",
    },
    {
      re: /segment\.com/,
      name: "Segment",
      category: "Analytics",
      company: "Twilio Segment",
    },
    {
      re: /amplitude/,
      name: "Amplitude",
      category: "Analytics",
      company: "Amplitude",
    },
    { re: /hotjar/, name: "Hotjar", category: "Analytics", company: "Hotjar" },
    {
      re: /fullstory/,
      name: "FullStory",
      category: "Analytics",
      company: "FullStory",
    },
    {
      re: /logrocket/,
      name: "LogRocket",
      category: "Analytics",
      company: "LogRocket",
    },
    {
      re: /optimizely/,
      name: "Optimizely",
      category: "Analytics",
      company: "Optimizely",
    },
    {
      re: /mouseflow/,
      name: "Mouseflow",
      category: "Analytics",
      company: "Mouseflow",
    },
    {
      re: /chartbeat/,
      name: "Chartbeat",
      category: "Analytics",
      company: "Chartbeat",
    },
    {
      re: /clicktale/,
      name: "Clicktale",
      category: "Analytics",
      company: "Clicktale",
    },
    {
      re: /mathtag/,
      name: "MediaMath (mathtag)",
      category: "Advertising",
      company: "MediaMath",
    },
    {
      re: /doubleverify/,
      name: "DoubleVerify",
      category: "Advertising",
      company: "DoubleVerify",
    },

    {
      re: /scorecardresearch\.com/,
      name: "ScorecardResearch",
      category: "Advertising",
      company: "Comscore",
    },
    {
      re: /comscore\.com/,
      name: "Comscore",
      category: "Advertising",
      company: "Comscore",
    },
    {
      re: /quantserve\.com/,
      name: "Quantserve",
      category: "Advertising",
      company: "Quantcast",
    },
    {
      re: /demdex\.net/,
      name: "Adobe Experience Cloud (Demdex)",
      category: "Advertising",
      company: "Adobe",
    },
    {
      re: /adsrvr\.org/,
      name: "The Trade Desk",
      category: "Advertising",
      company: "The Trade Desk",
    },
    {
      re: /eyeota\.net/,
      name: "Eyeota",
      category: "Advertising",
      company: "Eyeota",
    },
    {
      re: /bluekai\.com/,
      name: "Oracle BlueKai",
      category: "Advertising",
      company: "Oracle",
    },

    {
      re: /amazon-adsystem\.com/,
      name: "Amazon Advertising",
      category: "Advertising",
      company: "Amazon",
    },
    {
      re: /bouncex\.net|wunderkind\.co/,
      name: "Wunderkind (BounceX)",
      category: "Advertising",
      company: "Wunderkind",
    },
    {
      re: /onetag\.com|s-onetag\.com/,
      name: "OneTag",
      category: "Advertising",
      company: "OneTag",
    },
    {
      re: /permutive/,
      name: "Permutive",
      category: "Advertising",
      company: "Permutive",
    },
    {
      re: /turner\.com|warnermediacdn\.com/,
      name: "Turner/Warner CDN",
      category: "CDN/Utility",
      company: "Warner Bros. Discovery",
    },
    {
      re: /collector\.github\.com/,
      name: "GitHub Telemetry",
      category: "Analytics",
      company: "GitHub",
    },
    {
      re: /cloudflareinsights\.com/,
      name: "Cloudflare Web Analytics",
      category: "Analytics",
      company: "Cloudflare",
    },
    {
      re: /dubcdn\.com/,
      name: "Dub CDN",
      category: "CDN/Utility",
      company: "Dub",
    },
  ];

  for (const r of rules) {
    if (r.re.test(lower))
      return { name: r.name, category: r.category, company: r.company };
  }

  if (/analytics|track|collect|pixel|beacon|telemetry|metrics/.test(lower)) {
    return { name: "Tracker", category: "Analytics", company: "Unknown" };
  }
  return { name: lower, category: "Unknown", company: "Unknown" };
}