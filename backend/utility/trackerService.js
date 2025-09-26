import puppeteer from "puppeteer";

// Comprehensive list of tracker domains with pattern matching
const TRACKER_DOMAINS = [
  // Analytics & Tag Management
  "google-analytics.com",
  "googletagmanager.com",
  "googleadservices.com",
  "google-analytics.com",

  // Social Media Trackers
  "facebook.net",
  "connect.facebook.net",
  "facebook.com",
  "twitter.com",
  "ads-twitter.com",
  "linkedin.com",
  "snapchat.com",
  "pinterest.com",
  "tiktok.com",

  // Ad Networks
  "doubleclick.net",
  "googlesyndication.com",
  "adservice.google.com",
  "ads.google.com",
  "adnxs.com",
  "amazon-adsystem.com",
  "criteo.com",
  "outbrain.com",
  "taboola.com",
  "adroll.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "adsystem.com",

  // Analytics Platforms
  "segment.com",
  "mixpanel.com",
  "amplitude.com",
  "hotjar.com",
  "fullstory.com",
  "logrocket.com",
  "optimizely.com",
  "mouseflow.com",

  // Data Brokers & Audience
  "scorecardresearch.com",
  "quantserve.com",
  "comscore.com",
  "demdex.net",
  "adsrvr.org",
  "turn.com",
  "eyeota.net",
  "bluekai.com",

  // Other Common Trackers
  "chartbeat.com",
  "clicktale.net",
  "doubleverify.com",
  "mathtag.com",
  "sharethis.com",
  "addthis.com",
  "trustarc.com",
  "adform.net",
  "bing.com",
  "yahoo.com"
];

// Pattern-based detection for dynamic tracker domains
const TRACKER_PATTERNS = [
  /\.ads\./,
  /\.analytics\./,
  /\.tracking\./,
  /\.metrics\./,
  /\.telemetry\./,
  /ads\d+\./,
  /track\d*\./,
  /collect\./,
  /pixel\./,
  /beacon\./
];

/**
 * Cross-platform delay function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cross-platform wait function for pages
 * @param {object} page - Puppeteer page object
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
async function waitForTimeout(page, ms) {
  // Try modern method first
  if (typeof page.waitForDelay === 'function') {
    return await page.waitForDelay(ms);
  }
  // Fall back to deprecated method if available
  else if (typeof page.waitForTimeout === 'function') {
    return await page.waitForTimeout(ms);
  }
  // Use basic Promise delay as last resort
  else {
    return await delay(ms);
  }
}

/**
 * Enhanced tracker detection with multiple strategies
 * @param {string} url - The URL to analyze
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Detection results
 */
export async function detectTrackers(url, options = {}) {
  const {
    timeout = 30000,
    waitForInteractions = true,
    includeFirstParty = false,
    verbose = false
  } = options;

  let browser = null;
  const detectedTrackers = new Set();
  const trackerRequests = [];
  const mainDomain = new URL(url).hostname;

  try {
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Enhanced request monitoring
    page.on('request', (request) => {
      const requestUrl = request.url();
      const requestDomain = extractDomain(requestUrl);

      if (requestDomain && isTracker(requestUrl, requestDomain, mainDomain, includeFirstParty)) {
        detectedTrackers.add(requestDomain);

        if (verbose) {
          trackerRequests.push({
            domain: requestDomain,
            url: requestUrl,
            type: request.resourceType(),
            method: request.method()
          });
        }
      }
    });

    // Navigate and wait for initial load
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout
    });

    // Optional: Simulate user interactions to trigger additional trackers
    if (waitForInteractions) {
      await simulateUserBehavior(page);
    }

    // Wait a bit more for any delayed trackers
    await waitForTimeout(page, 2000);

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.warn(`Timeout reached for ${url}, but proceeding with detected trackers`);
    } else {
      console.error(`Error analyzing ${url}:`, error.message);
      return {
        detectedTrackers: [],
        error: error.message,
        success: false
      };
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const result = {
    url,
    detectedTrackers: Array.from(detectedTrackers).sort(),
    trackerCount: detectedTrackers.size,
    success: true
  };

  if (verbose) {
    result.requests = trackerRequests;
  }

  return result;
}

/**
 * Extract domain from URL safely
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Enhanced tracker detection logic
 */
function isTracker(url, domain, mainDomain, includeFirstParty) {
  // Skip first-party requests unless explicitly requested
  if (!includeFirstParty && domain === mainDomain) {
    return false;
  }

  // Check against known tracker domains
  const isKnownTracker = TRACKER_DOMAINS.some(tracker =>
    domain.includes(tracker.toLowerCase())
  );

  if (isKnownTracker) return true;

  // Check against tracker patterns
  const matchesPattern = TRACKER_PATTERNS.some(pattern =>
    pattern.test(domain)
  );

  if (matchesPattern) return true;

  // Check for common tracker URL patterns
  const trackerUrlPatterns = [
    /\/analytics/i,
    /\/tracking/i,
    /\/collect/i,
    /\/beacon/i,
    /\/pixel/i,
    /\/track/i,
    /\/metric/i,
    /\/telemetry/i,
    /gtag|gtm/i,
    /fbevents/i,
    /doubleclick/i
  ];

  return trackerUrlPatterns.some(pattern => pattern.test(url));
}

/**
 * Simulate realistic user behavior to trigger more trackers
 */
async function simulateUserBehavior(page) {
  try {
    // Scroll down to trigger lazy-loaded trackers
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await waitForTimeout(page, 1500);

    // Try to accept cookie consent if present
    const consentSelectors = [
      '[data-testid*="consent"]',
      '[class*="cookie"] button',
      '[class*="consent"] button',
      'button[class*="accept"]',
      '#cookie-accept',
      '.cookie-consent-accept',
      '[aria-label*="accept" i]'
    ];

    for (const selector of consentSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isIntersectingViewport();
          if (isVisible) {
            await element.click();
            await waitForTimeout(page, 2000);
            break;
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    // Safe hover using mouse coordinates instead of element hover
    try {
      const viewport = await page.viewport();
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await waitForTimeout(page, 500);
    } catch {
      // If mouse move fails, try alternative hover method
      try {
        await page.evaluate(() => {
          // Dispatch mouseover event programmatically
          const event = new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true,
          });
          document.body.dispatchEvent(event);
        });
      } catch {
        // Ignore if this also fails
      }
    }

    await waitForTimeout(page, 1000);

    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await waitForTimeout(page, 1000);

  } catch (error) {
    // Ignore errors in user simulation - don't let them break the main detection
    console.warn('User simulation warning:', error.message);
  }
}

/**
 * Batch analyze multiple URLs
 */
export async function detectTrackersForMultipleUrls(urls, options = {}) {
  const results = [];

  for (const url of urls) {
    try {
      const result = await detectTrackers(url, options);
      results.push(result);

      // Add delay between requests to be respectful
      await delay(1000);
    } catch (error) {
      results.push({
        url,
        error: error.message,
        success: false,
        detectedTrackers: []
      });
    }
  }

  return results;
}

// Example usage:
// const result = await detectTrackers('https://example.com', {
//   verbose: true,
//   waitForInteractions: true
// });
// console.log(`Found ${result.trackerCount} trackers:`, result.detectedTrackers);