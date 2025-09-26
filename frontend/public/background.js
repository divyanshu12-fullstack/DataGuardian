// Background service worker for DataGuardian extension
// This handles privacy blocking, storage, and communication between components

class DataGuardianBackground {
  constructor() {
    this.settings = {};
    this.blockedRequests = new Map();
    this.privacyMode = 'research';
    this.sitePseudonymCache = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadPrivacyMode();
    this.setupEventListeners();
    this.setupRequestBlocking();
  }

  // [UPDATE] Creates a consistent, complete list of default settings.
  getDefaultSettings() {
    return {
      blockNotifications: false,
      blockCookies: false,
      blockAdvertisingTrackers: false,
      blockAnalyticsTrackers: false,
      blockSocialTrackers: false,
      blockCDNUtilityTrackers: false,
      blockTagManagerTrackers: false,
      blockUnknownTrackers: false,
    };
  }

  // [UPDATE] Loads settings for a site, merging them with the full default list.
  async loadSettings(siteUrl = null) {
    const defaults = this.getDefaultSettings();
    if (!siteUrl) {
      this.settings = { ...defaults };
      return;
    }

    try {
      const domain = this.getDomainFromUrl(siteUrl);
      const storageKey = `privacySettings_${domain}`;
      const result = await chrome.storage.local.get([storageKey]);

      if (result[storageKey]) {
        // Merge saved settings over defaults to handle any new categories
        this.settings = { ...defaults, ...result[storageKey] };
      } else {
        this.settings = { ...defaults };
      }

    } catch (error) {
      console.error('Failed to load settings, falling back to defaults:', error);
      this.settings = { ...defaults };
    }
  }

  getDomainFromUrl(url) {
    if (!url || !url.startsWith('http')) {
      return 'unknown';
    }
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  async saveSettings(siteUrl = null) {
    if (!siteUrl) {

      return;
    }
    try {
      const domain = this.getDomainFromUrl(siteUrl);
      const storageKey = `privacySettings_${domain}`;
      await chrome.storage.local.set({ [storageKey]: this.settings });

    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  setupEventListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      try {
        for (const [key, change] of Object.entries(changes)) {
          if (key === 'privacyMode') {
            this.privacyMode = change.newValue || 'research';

            this.setupRequestBlocking();
            continue;
          }
          if (key.startsWith('privacySettings_')) {
            // Only apply if the changed domain matches the active tab's domain
            let activeTab;
            try {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              activeTab = tabs && tabs[0];
            } catch (_) { }

            const changedDomain = key.replace('privacySettings_', '');
            const activeDomain = activeTab?.url ? this.getDomainFromUrl(activeTab.url) : null;
            if (activeDomain && changedDomain === activeDomain) {
              const defaults = this.getDefaultSettings();
              this.settings = { ...defaults, ...(change.newValue || {}) };

              this.setupRequestBlocking();
            }
          }
        }
      } catch (_) {
        // noop
      }
    });

    // This ensures rules are updated when switching tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab && tab.url) {
          await this.loadSettings(tab.url);
          this.setupRequestBlocking();
        }
      } catch (error) {

      }
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        await this.loadSettings(tab.url);
        this.applySettingsToTab(tab);
        this.setupRequestBlocking(); // Also re-apply blocking rules
      }
    });

    // webNavigation listener removed for MV3 minimal permissions
  }

  async loadPrivacyMode() {
    try {
      const r = await chrome.storage.local.get(['privacyMode']);
      this.privacyMode = r?.privacyMode === 'stealth' ? 'stealth' : 'research';
    } catch (_) {
      this.privacyMode = 'research';
    }
  }

  // webRequest-based enforcement removed for MV3 compliance

  isThirdParty(details) {
    try {
      if (!details.initiator) return false;
      const initiatorHost = new URL(details.initiator).host;
      const reqHost = new URL(details.url).host;
      return initiatorHost !== reqHost;
    } catch (_) {
      return true;
    }
  }

  classifyTrackerUrl(url) {
    const trackerHosts = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'facebook.net',
      'connect.facebook.net', 'ads-twitter.com', 'linkedin.com', 'snapchat.com', 'pinterest.com',
      'tiktok.com', 'scorecardresearch.com', 'quantserve.com', 'comscore.com', 'mixpanel.com',
      'segment.com', 'amplitude.com', 'hotjar.com'
    ];
    try {
      const host = new URL(url).host;
      return trackerHosts.some(d => host.includes(d));
    } catch (_) {
      return false;
    }
  }

  redactPIIInUrl(url) {
    const keys = ['email', 'e-mail', 'uid', 'user_id', 'device_id', 'fbclid', 'gclid', '_ga', 'ip', 'lat', 'lon'];
    try {
      const u = new URL(url);
      keys.forEach(k => u.searchParams.delete(k));
      return u.toString();
    } catch (_) {
      return url;
    }
  }

  async getOrCreateSitePseudonym(origin) {
    if (this.sitePseudonymCache[origin]) return this.sitePseudonymCache[origin];
    try {
      const r = await chrome.storage.local.get(['sitePseudonyms']);
      const map = r.sitePseudonyms || {};
      if (map[origin]) {
        this.sitePseudonymCache[origin] = map[origin];
        return map[origin];
      }
      const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      map[origin] = uuid;
      await chrome.storage.local.set({ sitePseudonyms: map });
      this.sitePseudonymCache[origin] = uuid;
      return uuid;
    } catch (_) {
      return 'anonymous';
    }
  }

  handleBeforeRequest(details) {
    // Ignore non-main frame and browser-internal
    if (details.url.startsWith('chrome-extension://') || details.url.startsWith('chrome://')) return {};

    const mode = this.privacyMode;
    const isThird = this.isThirdParty(details);
    const isTracker = this.classifyTrackerUrl(details.url);

    if (mode === 'stealth') {
      if (isThird || isTracker) {
        return { cancel: true };
      }
      // Essential same-origin: sanitize URL
      const sanitized = this.redactPIIInUrl(details.url);
      if (sanitized !== details.url) {
        return { redirectUrl: sanitized };
      }
      return {};
    }

    // research: allow but sanitize URL
    const sanitized = this.redactPIIInUrl(details.url);
    if (sanitized !== details.url) {
      return { redirectUrl: sanitized };
    }
    return {};
  }

  async handleBeforeSendHeaders(details) {
    if (!details.requestHeaders) return {};
    const mode = this.privacyMode;
    const lower = (s) => (s || '').toLowerCase();
    const blocked = new Set(['cookie', 'authorization', 'etag', 'if-none-match']);
    let headers = details.requestHeaders.filter(h => !blocked.has(lower(h.name)));

    if (mode === 'research') {
      try {
        const origin = details.initiator ? new URL(details.initiator).origin : '';
        const pseudonym = await this.getOrCreateSitePseudonym(origin || '');
        headers.push({ name: 'X-Research-Pseudonym', value: pseudonym });
        // Reduce referrer to origin if present
        const ref = headers.find(h => lower(h.name) === 'referer');
        if (ref && ref.value) {
          try { ref.value = new URL(ref.value).origin + '/'; } catch (_) { }
        }
      } catch (_) { }
    }

    return { requestHeaders: headers };
  }

  async handleMessage(request, sender, sendResponse) {
    const siteUrl = sender.tab?.url;
    if (siteUrl) {
      await this.loadSettings(siteUrl);
    }

    try {
      switch (request.type) {
        case 'GET_SETTINGS':
          sendResponse({ success: true, settings: this.settings });
          break;

        case 'UPDATE_SETTING':
          await this.updateSetting(request.setting, request.value, siteUrl);
          // The crucial call to refresh blocking rules is now inside updateSetting
          sendResponse({ success: true });
          break;

        case 'GET_BLOCKED_COUNT':
          const count = this.getBlockedCountForTab(sender.tab?.id);
          sendResponse({ success: true, count });
          break;

        case 'PRIVACY_SETTING_CHANGED':
          this.broadcastSettingChange(request.setting, request.value);
          sendResponse({ success: true });
          break;

        case 'RESET_TO_DEFAULTS':
          await this.resetToDefaults(siteUrl);
          sendResponse({ success: true });
          break;

        case 'CLEAR_ALL_SETTINGS':
          await this.clearAllSettings();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async updateSetting(settingKey, value, siteUrl = null) {
    if (!siteUrl) return;

    // Settings for the site are already loaded in handleMessage
    this.settings[settingKey] = value;
    await this.saveSettings(siteUrl);
    await this.setupRequestBlocking(); // Refresh rules after saving

    try {
      const domain = this.getDomainFromUrl(siteUrl);
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && this.getDomainFromUrl(tab.url) === domain) {
          this.applySettingToTab(tab, settingKey, value).catch(error => {
            console.log(`Could not apply setting to tab ${tab.id}:`, error.message);
          });
        }
      });
    } catch (error) {
      console.log('Could not query tabs:', error.message);
    }
    console.log(`Updated setting ${settingKey} to ${value} for ${this.getDomainFromUrl(siteUrl)}`);
  }

  async resetToDefaults(siteUrl) {
    this.settings = this.getDefaultSettings();
    await this.saveSettings(siteUrl); // Save the cleared settings for the current site
    await this.setupRequestBlocking(); // Refresh rules
    console.log('🔄 Reset settings to defaults for this site');
  }

  async clearAllSettings() {
    try {
      await chrome.storage.local.clear();
      await this.loadSettings(); // Reload the base defaults
      await this.setupRequestBlocking(); // Refresh rules
      console.log('🗑️ Cleared all saved settings');
    } catch (error) {
      console.error('Failed to clear settings:', error);
    }
  }

  // [UPDATE] Single source of truth for all tracker domains.
  getTrackerDomains() {
    return {
      "Advertising": ['*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*', '*://*.amazon-adsystem.com/*', '*://*.criteo.com/*', '*://*.adnxs.com/*'],
      "Analytics": ['*://*.google-analytics.com/*', '*://*.mixpanel.com/*', '*://*.segment.com/*', '*://*.amplitude.com/*', '*://*.hotjar.com/*'],
      "Social": ['*://*.facebook.net/*', '*://*.connect.facebook.net/*', '*://*.ads-twitter.com/*', '*://*.linkedin.com/analytics/*'],
      "Tag Manager": ['*://*.googletagmanager.com/*'],
      "CDN/Utility": ['*://*.gstatic.com/*', '*://*.googleapis.com/*'],
      "Unknown": [],
    };
  }

  async setupRequestBlocking() {
    const trackerDomains = this.getTrackerDomains();
    await this.updateBlockingRules(trackerDomains);
  }

  // [UPDATE] This function is now fully dynamic.
  async updateBlockingRules(trackerDomains) {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map(rule => rule.id);
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingRuleIds });
      }

      const newRules = [];
      let ruleId = 1;

      const mode = this.privacyMode;
      const shouldBlockAll = mode === 'stealth';

      for (const category in trackerDomains) {
        const settingKey = `block${category.replace(/[^a-zA-Z0-9]/g, '')}Trackers`;
        const enabled = shouldBlockAll ? true : !!this.settings[settingKey];
        if (mode === 'research') {
          // In research mode, allow everything via DNR (no new rules)
          continue;
        }
        if (enabled) {
          trackerDomains[category].forEach(domain => {
            newRules.push({
              id: ruleId++,
              priority: 1,
              action: { type: 'block' },
              condition: {
                urlFilter: domain,
                resourceTypes: ['script', 'xmlhttprequest', 'image', 'sub_frame', 'ping']
              }
            });
          });
        }
      }

      if (newRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules });

      } else {

      }
    } catch (error) {
      console.error('Failed to update blocking rules:', error);
    }
  }

  // Your original function, preserved completely
  async applySettingsToTab(tab) {
    if (!tab || !tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      return;
    }
    try {
      const currentTab = await chrome.tabs.get(tab.id).catch(() => null);
      if (!currentTab) {

        return;
      }
      if (this.settings.blockNotifications) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (typeof window.Notification !== 'undefined') {
              window.Notification.requestPermission = () => Promise.resolve('denied');
              Object.defineProperty(window.Notification, 'permission', { value: 'denied', writable: false });
            }
          }
        }).catch(() => { });
      }
      if (this.settings.blockCookies) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const originalSetCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')?.set;
            if (originalSetCookie) {
              Object.defineProperty(document, 'cookie', {
                set: function (value) {
                  const trackingPatterns = [/_ga/, /_gid/, /_fbp/, /_fbc/, /utm_/, /track/, /analytics/];
                  const isTrackingCookie = trackingPatterns.some(pattern => pattern.test(value.toLowerCase()));
                  if (!isTrackingCookie) {
                    originalSetCookie.call(this, value);
                  }
                },
                get: function () { return document.cookie; },
                configurable: true
              });
            }
          }
        }).catch(() => { });
      }
    } catch (error) {
      console.error(`Failed to apply settings to tab ${tab.id}:`, error);
    }
  }

  // Your original function, preserved completely
  async applySettingToTab(tab, settingKey, value) {
    if (settingKey.includes('Trackers') || settingKey === 'blockTrackers') {
      await this.setupRequestBlocking();
    }
    if (tab && tab.id) {
      try {
        await this.applySettingsToTab(tab);
      } catch (error) {

      }
    }
  }

  // Your original function, preserved completely
  onSiteChanged(tabId, url) {
    this.blockedRequests.set(tabId, 0);
    const activeProtections = Object.values(this.settings).filter(Boolean).length;
    if (activeProtections > 0) {
      chrome.action.setBadgeText({ tabId: tabId, text: activeProtections.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: '' });
    }
  }

  // Your original function, preserved completely
  getBlockedCountForTab(tabId) {
    return this.blockedRequests.get(tabId) || 0;
  }

  // Your original function, preserved completely
  async broadcastSettingChange(setting, value) {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'SETTING_CHANGED', setting, value })
          .catch(() => { }); // Ignore errors for tabs that don't have content scripts
      });
    } catch (error) {
      console.error('Failed to broadcast setting change:', error);
    }
  }
}

// Initialize the background script
new DataGuardianBackground();

