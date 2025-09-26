// Privacy management utilities for browser extension
import { cacheManager } from './cacheManager';

class PrivacyManager {
  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    this.settings = {};
    this.loadSettings();
  }

  // Load current privacy settings from storage for specific site
  async loadSettings(siteUrl = null) {
    if (!this.isExtension) {
      this.settings = this.getDefaultSettings();
      return;
    }

    try {
      // Get current tab URL if not provided
      if (!siteUrl) {
        const [tab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        siteUrl = tab?.url;
      }

      // Get domain for site-specific storage
      const domain = this.getDomainFromUrl(siteUrl);
      const storageKey = `privacySettings_${domain}`;

      const result = await new Promise((resolve) => {
        chrome.storage.local.get([storageKey], (result) => {
          resolve(result);
        });
      });

      this.settings = result[storageKey] || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  // Global privacy mode (stealth | research)
  async getPrivacyMode() {
    const defaultMode = 'research';
    if (!this.isExtension) return defaultMode;

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['privacyMode'], (r) => resolve(r));
      });
      return result?.privacyMode === 'stealth' ? 'stealth' : defaultMode;
    } catch (e) {
      return defaultMode;
    }
  }

  async setPrivacyMode(mode) {
    if (!this.isExtension) return;
    const normalized = mode === 'stealth' ? 'stealth' : 'research';
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ privacyMode: normalized, lastModeChangeAt: Date.now() }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    // Broadcast for other parts of the extension
    try {
      if (this.isExtension) {
        chrome.runtime.sendMessage({ type: 'PRIVACY_MODE_CHANGED', mode: normalized });
      }
    } catch (_) { }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('privacyModeChanged', { detail: { mode: normalized } }));
    }
  }

  // ===== Site-specific privacy mode (none | research | stealth) =====
  async getSitePrivacyMode(siteUrl = null) {
    const defaultMode = 'none';
    if (!this.isExtension) return defaultMode;

    try {
      // Determine domain key
      if (!siteUrl) {
        const [tab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        siteUrl = tab?.url;
      }

      const domain = this.getDomainFromUrl(siteUrl);
      const key = `siteMode_${domain}`;
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([key], (r) => resolve(r || {}));
      });
      const mode = result[key];
      return mode === 'stealth' || mode === 'research' || mode === 'none'
        ? mode
        : defaultMode;
    } catch (_) {
      return defaultMode;
    }
  }

  async setSitePrivacyMode(siteUrl = null, mode = 'none') {
    if (!this.isExtension) return;

    const normalized = ['stealth', 'research', 'none'].includes(mode)
      ? mode
      : 'none';

    try {
      if (!siteUrl) {
        const [tab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        siteUrl = tab?.url;
      }
      const domain = this.getDomainFromUrl(siteUrl);
      const key = `siteMode_${domain}`;

      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: normalized }, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });

      // Broadcast UI update
      try {
        chrome.runtime.sendMessage({ type: 'SITE_PRIVACY_MODE_CHANGED', domain, mode: normalized });
      } catch (_) { }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sitePrivacyModeChanged', { detail: { domain, mode: normalized } }));
      }

      // Reload active tab so network rules take effect
      await this.reloadActiveTab();
    } catch (e) {
      console.error('Failed to set site privacy mode:', e);
    }
  }

  async reloadActiveTab() {
    if (!this.isExtension) return;
    try {
      const [tab] = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });
      if (tab && tab.id) {
        await new Promise((resolve) => {
          chrome.tabs.reload(tab.id, {}, resolve);
        });
      }
    } catch (e) {
      console.warn('Could not reload active tab:', e);
    }
  }

  // Enable/disable all tracker category blocks for current site
  async setAllTrackerBlocksForSite(siteUrl, enabled) {
    if (!this.isExtension) return;
    try {
      const domain = this.getDomainFromUrl(siteUrl);
      const storageKey = `privacySettings_${domain}`;
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([storageKey], (r) => resolve(r || {}));
      });
      const current = result[storageKey] || this.getDefaultSettings();
      const updated = {
        ...current,
        blockTrackers: enabled,
        blockAdTrackers: enabled,
        blockAnalyticsTrackers: enabled,
        blockSocialTrackers: enabled,
      };
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [storageKey]: updated }, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
      this.settings = updated;
      this.notifySettingChanged('bulkTrackerBlocks', enabled);
    } catch (e) {
      console.error('Failed to set all tracker blocks for site:', e);
    }
  }

  // ===== Helpers for Stealth/Research enforcement =====
  isEssentialRequest({ url, initiator }) {
    try {
      const parsed = new URL(url);
      if (!initiator) return true; // default allow if unknown (e.g., system)
      const initiatorOrigin = new URL(initiator).origin;
      const reqOrigin = `${parsed.protocol}//${parsed.host}`;
      return initiatorOrigin === reqOrigin; // same-origin considered essential
    } catch (_) {
      return true;
    }
  }

  classifyTracker(url) {
    const trackerDomains = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
      'facebook.net', 'connect.facebook.net', 'twitter.com', 'ads-twitter.com',
      'linkedin.com', 'snapchat.com', 'pinterest.com', 'tiktok.com',
      'scorecardresearch.com', 'quantserve.com', 'comscore.com',
      'mixpanel.com', 'segment.com', 'amplitude.com', 'hotjar.com'
    ];
    try {
      const host = new URL(url).host;
      return trackerDomains.some(d => host.includes(d)) ? 'tracker' : 'unknown';
    } catch (_) {
      return 'unknown';
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

  stripSensitiveHeaders(headers = []) {
    const blocked = new Set(['cookie', 'authorization', 'etag', 'if-none-match', 'x-client-id']);
    return headers.filter(h => !blocked.has((h.name || h.header || '').toString().toLowerCase()));
  }

  async getStablePseudonymForSite(origin) {
    const fallback = 'anonymous';
    if (!this.isExtension) return fallback;
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['sitePseudonyms'], (r) => resolve(r || {}));
      });
      const map = result.sitePseudonyms || {};
      if (map[origin]) return map[origin];
      const uuid = self.crypto?.randomUUID ? self.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      map[origin] = uuid;
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ sitePseudonyms: map }, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
      return uuid;
    } catch (_) {
      return fallback;
    }
  }

  async pseudonymizeRequest({ url, headers = [], origin }) {
    const sanitizedUrl = this.redactPIIInUrl(url);
    const cleanHeaders = this.stripSensitiveHeaders(headers);
    const pseudonym = await this.getStablePseudonymForSite(origin || '');
    const added = { name: 'X-Research-Pseudonym', value: pseudonym };
    return { url: sanitizedUrl, headers: [...cleanHeaders, added] };
  }

  // Save settings to storage for specific site
  async saveSettings(siteUrl = null) {
    if (!this.isExtension) return;

    try {
      // Get current tab URL if not provided
      if (!siteUrl) {
        const [tab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        siteUrl = tab?.url;
      }

      // Get domain for site-specific storage
      const domain = this.getDomainFromUrl(siteUrl);
      const storageKey = `privacySettings_${domain}`;

      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [storageKey]: this.settings }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });


    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  // Helper function to extract domain from URL
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

  // Get default settings - ALLOW ALL by default (user must opt-in to blocking)
  getDefaultSettings() {
    return {
      blockNotifications: false,
      blockCookies: false,
      blockTrackers: false,
      blockAdTrackers: false,
      blockAnalyticsTrackers: false,
      blockSocialTrackers: false
    };
  }

  // Get current setting value
  getSetting(key) {
    return this.settings[key] || false;
  }

  // Update a specific setting for current site
  async updateSetting(key, value, siteUrl = null) {
    this.settings[key] = value;
    await this.saveSettings(siteUrl);

    // Apply the setting immediately to current tab
    await this.applySetting(key, value, siteUrl);

    // Notify other parts of the extension
    this.notifySettingChanged(key, value);
  }

  // Apply specific privacy setting
  async applySetting(key, enabled, siteUrl = null) {
    if (!this.isExtension) return;

    try {
      let tab;
      if (siteUrl) {
        // Find tab by URL
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({}, resolve);
        });
        tab = tabs.find(t => t.url === siteUrl);
      } else {
        // Get current active tab
        const [activeTab] = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        tab = activeTab;
      }

      if (!tab || !tab.id) return;

      switch (key) {
        case 'blockNotifications':
          await this.handleNotificationBlocking(tab, enabled);
          break;
        case 'blockCookies':
          await this.handleCookieBlocking(tab, enabled);
          break;
        case 'blockTrackers':
          await this.handleTrackerBlocking(tab, enabled);
          break;
        case 'blockAdTrackers':
        case 'blockAnalyticsTrackers':
        case 'blockSocialTrackers':
          await this.handleSpecificTrackerBlocking(tab, key, enabled);
          break;
      }
    } catch (error) {
      console.error(`Failed to apply setting ${key}:`, error);
    }
  }

  // Handle notification blocking
  async handleNotificationBlocking(tab, enabled) {
    if (!tab.url || !tab.url.startsWith('http')) return;

    try {
      const url = new URL(tab.url);
      const origin = url.origin;

      if (chrome.contentSettings && chrome.contentSettings.notifications) {
        if (enabled) {
          // Block notifications for this site
          await new Promise((resolve, reject) => {
            chrome.contentSettings.notifications.set({
              primaryPattern: `${origin}/*`,
              setting: 'block'
            }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        } else {
          // Allow notifications (reset to default)
          await new Promise((resolve, reject) => {
            chrome.contentSettings.notifications.clear({
              primaryPattern: `${origin}/*`
            }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        }
      }

      // Inject script to override notification API if available
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (shouldBlock) => {
            if (shouldBlock && typeof window.Notification !== 'undefined') {
              window.Notification.requestPermission = () => Promise.resolve('denied');
              try {
                Object.defineProperty(window.Notification, 'permission', {
                  value: 'denied',
                  writable: false
                });
              } catch (e) {
                // Ignore if property is not configurable
              }
            }
          },
          args: [enabled]
        }).catch((error) => {
          console.warn('Could not inject notification blocking script:', error);
        });
      }
    } catch (error) {
      console.error('Failed to handle notification blocking:', error);
    }
  }

  // Handle cookie blocking
  async handleCookieBlocking(tab, enabled) {
    if (!tab.url || !tab.url.startsWith('http')) return;

    try {
      const url = new URL(tab.url);
      const origin = url.origin;

      if (chrome.contentSettings && chrome.contentSettings.cookies) {
        if (enabled) {
          // Set cookies to session only for this site
          await new Promise((resolve, reject) => {
            chrome.contentSettings.cookies.set({
              primaryPattern: `${origin}/*`,
              setting: 'session_only'
            }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        } else {
          // Reset cookie settings to default
          await new Promise((resolve, reject) => {
            chrome.contentSettings.cookies.clear({
              primaryPattern: `${origin}/*`
            }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        }
      }

      // Inject script to limit cookie access if available
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (shouldBlock) => {
            if (!shouldBlock) return;

            // Override document.cookie to limit tracking cookies
            const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
              Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

            if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
              Object.defineProperty(document, 'cookie', {
                get: originalCookieDescriptor.get,
                set: function (value) {
                  // Block marketing/tracking cookies
                  const trackingPatterns = [
                    /_ga/, /_gid/, /_fbp/, /_fbc/, /utm_/, /track/, /analytics/,
                    /doubleclick/, /googleads/, /facebook/, /twitter/
                  ];

                  const isTrackingCookie = trackingPatterns.some(pattern =>
                    pattern.test(value.toLowerCase())
                  );

                  if (!isTrackingCookie) {
                    originalCookieDescriptor.set.call(this, value);
                  } else {
                    console.log('DataGuardian: Blocked tracking cookie:', value.split('=')[0]);
                  }
                },
                enumerable: true,
                configurable: true
              });
            }
          },
          args: [enabled]
        }).catch((error) => {
          console.warn('Could not inject cookie blocking script:', error);
        });
      }
    } catch (error) {
      console.error('Failed to handle cookie blocking:', error);
    }
  }

  // Handle general tracker blocking
  async handleTrackerBlocking(tab, enabled) {
    if (!chrome.scripting || !chrome.scripting.executeScript) return;

    try {
      if (enabled) {
        // Inject comprehensive tracker blocking script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Block common tracking scripts
            const trackerDomains = [
              'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
              'facebook.net', 'connect.facebook.net', 'twitter.com', 'ads-twitter.com',
              'linkedin.com', 'snapchat.com', 'pinterest.com', 'tiktok.com',
              'scorecardresearch.com', 'quantserve.com', 'comscore.com',
              'mixpanel.com', 'segment.com', 'amplitude.com', 'hotjar.com'
            ];

            // Store original functions
            const originalFetch = window.fetch;
            const originalXHROpen = XMLHttpRequest.prototype.open;

            // Override fetch
            window.fetch = function (resource, options) {
              const url = typeof resource === 'string' ? resource : resource.url;

              if (trackerDomains.some(domain => url.includes(domain))) {
                console.log('DataGuardian: Blocked fetch tracker request:', url);
                return Promise.reject(new Error('Blocked by DataGuardian privacy manager'));
              }

              return originalFetch.apply(this, arguments);
            };

            // Override XMLHttpRequest
            XMLHttpRequest.prototype.open = function (method, url, ...args) {
              if (trackerDomains.some(domain => url.includes(domain))) {
                console.log('DataGuardian: Blocked XHR tracker request:', url);
                // Return without calling original open - effectively blocks the request
                return;
              }
              return originalXHROpen.apply(this, [method, url, ...args]);
            };

            // Block script loading
            const originalCreateElement = document.createElement;
            document.createElement = function (tagName) {
              const element = originalCreateElement.call(this, tagName);

              if (tagName.toLowerCase() === 'script') {
                const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                if (originalSrcDescriptor && originalSrcDescriptor.set) {
                  Object.defineProperty(element, 'src', {
                    set: function (value) {
                      if (trackerDomains.some(domain => value.includes(domain))) {
                        console.log('DataGuardian: Blocked script tracker:', value);
                        return; // Don't set the src
                      }
                      originalSrcDescriptor.set.call(this, value);
                    },
                    get: function () {
                      return this.getAttribute('src');
                    },
                    configurable: true
                  });
                }
              }

              return element;
            };
          }
        }).catch((error) => {
          console.warn('Could not inject tracker blocking script:', error);
        });
      }
    } catch (error) {
      console.error('Failed to handle general tracker blocking:', error);
    }
  }

  // Handle specific tracker category blocking
  async handleSpecificTrackerBlocking(tab, category, enabled) {
    if (!chrome.scripting || !chrome.scripting.executeScript) return;

    const trackerCategories = {
      blockAdTrackers: [
        'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
        'amazon-adsystem.com', 'criteo.com', 'outbrain.com', 'taboola.com',
        'adnxs.com', 'rubiconproject.com', 'pubmatic.com'
      ],
      blockAnalyticsTrackers: [
        'google-analytics.com', 'googletagmanager.com', 'mixpanel.com',
        'segment.com', 'amplitude.com', 'hotjar.com', 'fullstory.com',
        'mouseflow.com', 'chartbeat.com'
      ],
      blockSocialTrackers: [
        'facebook.net', 'connect.facebook.net', 'twitter.com', 'ads-twitter.com',
        'linkedin.com', 'snapchat.com', 'pinterest.com', 'tiktok.com'
      ]
    };

    const domains = trackerCategories[category] || [];

    if (enabled && domains.length > 0) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (blockedDomains, categoryName) => {
            // Store original fetch if not already stored
            if (!window._originalFetchForDataGuardian) {
              window._originalFetchForDataGuardian = window.fetch;
            }

            // Create category-specific blocker
            const originalFetch = window._originalFetchForDataGuardian;

            window.fetch = function (resource, options) {
              const url = typeof resource === 'string' ? resource : resource.url;

              if (blockedDomains.some(domain => url.includes(domain))) {
                console.log(`DataGuardian: Blocked ${categoryName} tracker:`, url);
                return Promise.reject(new Error(`Blocked by DataGuardian ${categoryName} filter`));
              }

              return originalFetch.apply(this, arguments);
            };
          },
          args: [domains, category.replace('block', '').replace('Trackers', '')]
        }).catch((error) => {
          console.warn(`Could not inject ${category} blocking script:`, error);
        });
      } catch (error) {
        console.error(`Failed to handle ${category} blocking:`, error);
      }
    }
  }

  // Notify about setting changes (for UI updates)
  notifySettingChanged(key, value) {
    if (this.isExtension) {
      chrome.runtime.sendMessage({
        type: 'PRIVACY_SETTING_CHANGED',
        setting: key,
        value: value
      }).catch(() => {
        // Ignore errors if no listeners
      });
    }

    // Dispatch custom event for React components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('privacySettingChanged', {
        detail: { setting: key, value: value }
      }));
    }
  }

  // Get site-specific permissions
  async getSitePermissions(url) {
    if (!this.isExtension) return {};

    try {
      const origin = new URL(url).origin;
      const permissions = {};

      // Check notification permission
      if (chrome.contentSettings && chrome.contentSettings.notifications) {
        permissions.notifications = await new Promise((resolve) => {
          chrome.contentSettings.notifications.get({
            primaryUrl: origin
          }, (details) => {
            if (chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(details.setting === 'block');
            }
          });
        });
      }

      // Check cookie settings
      if (chrome.contentSettings && chrome.contentSettings.cookies) {
        permissions.cookies = await new Promise((resolve) => {
          chrome.contentSettings.cookies.get({
            primaryUrl: origin
          }, (details) => {
            if (chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(details.setting === 'session_only' || details.setting === 'block');
            }
          });
        });
      }

      return permissions;
    } catch (error) {
      console.error('Failed to get site permissions:', error);
      return {};
    }
  }

  // Show notification about privacy action
  showPrivacyNotification(message, type = 'info') {
    if (!this.isExtension) { return; }

    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'extensionHome.png',
        title: 'DataGuardian Privacy',
        message: message
      }).catch(() => {
        // ignore
      });
    } else {
      // ignore when notifications API not available
    }
  }
}

// Export the class
export { PrivacyManager };