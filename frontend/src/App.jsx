import React, { useState, useEffect, useCallback } from "react";
import PopupView from "./pages/PopupView";
import FullReportView from "./pages/FullReportView";
import axios from "axios";
import LoadingSpinner from "./components/LoadingSpinner";
import ProgressIndicator from "./components/ProgressIndicator";

/**
 * [UPDATED] Processes the detailed tracker list from the backend.
 * It creates a summary count based on the categories provided by the backend's rule-based system.
 * @param {Array<Object>} trackerDetails - The detailed list from the AI summary.
 * @returns {Object} An object with tracker counts, e.g., { Advertising: 3, Analytics: 5 }.
 */
function categorizeTrackers(trackerDetails = []) {
  const categories = {};

  (trackerDetails || []).forEach((detail) => {
    // Use the category determined by the backend's classifyDomain function
    const category = detail.category || "Unknown";
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category]++;
  });

  return categories;
}

function App() {
  const [currentView, setCurrentView] = useState("popup");
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading to try auto-detection
  const [error, setError] = useState(null);
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Logging disabled for production noise reduction
  const logInfo = () => {};

  // Use useCallback to memoize analyzeUrl function
  const analyzeUrl = useCallback((inputUrl, isAutoDetected = false) => {
    logInfo(
      `Starting analysis (${isAutoDetected ? "auto-detected" : "manual"})...`
    );
    setLoading(true);
    setError(null);
    setAnalysisProgress(1);

    if (!inputUrl || !inputUrl.trim()) {
      logInfo("Empty or invalid input");
      setError("Please enter a URL");
      setLoading(false);
      setShowManualInput(true);
      return;
    }

    let url = inputUrl.trim();

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
      logInfo(`Added protocol: "${url}"`);
    }

    // Validate URL
    let urlObj;
    try {
      urlObj = new URL(url);
      logInfo("URL validation successful");
    } catch (urlError) {
      logInfo(`URL validation failed: ${urlError.message}`);
      setError(`Invalid URL: ${urlError.message}`);
      setLoading(false);
      setShowManualInput(true);
      return;
    }

    // Check for restricted protocols
    const restrictedProtocols = [
      "chrome:",
      "chrome-extension:",
      "edge:",
      "about:",
      "moz-extension:",
      "file:",
    ];
    if (restrictedProtocols.some((protocol) => url.startsWith(protocol))) {
      logInfo(`Restricted protocol detected: ${url}`);
      setError(
        "Cannot analyze browser internal pages. Please navigate to a regular website or enter a URL manually."
      );
      setLoading(false);
      setShowManualInput(true);
      return;
    }

    // Normalize URL
    if (!urlObj.pathname || urlObj.pathname === "") {
      urlObj.pathname = "/";
    }
    const finalUrl = urlObj.toString();
    logInfo(`Final URL for API: "${finalUrl}"`);

    // Prepare API request
    const requestData = {
      url: finalUrl,
      forceRefresh: !isAutoDetected,
    };

    logInfo("Sending request to backend...");

    // Send to backend
    axios
      .post("http://localhost:5000/api/sites/analyze", requestData)
      .then((response) => {
        logInfo("Analysis complete!", response.data);
        const site = response.data.site;
        setAnalysisProgress(2); // Move to AI Analysis step

        // [FIXED] The aiSummary is nested inside response.data.site, not at the top level.
        const trackerDetails =
          response.data.site.aiSummary?.trackerDetails || [];
        site.trackers = categorizeTrackers(trackerDetails);

        setSiteData(site);

        // Add a delay to show the "Finalizing" step
        setTimeout(() => {
          setAnalysisProgress(3); // Move to Finalizing step

          // Add another small delay before hiding the loader
          setTimeout(() => {
            setLoading(false);
            setShowManualInput(false); // Hide manual input on success
          }, 500); // 500ms for the user to see the "Finalizing" step
        }, 500); // 500ms for the user to see the "AI Analysis" step
      })
      .catch((err) => {
        logInfo(`Backend error: ${err.message}`);
        console.error("Full error:", err);
        setError(
          `Analysis failed: ${err.response?.data?.message || err.message}`
        );
        setLoading(false);
        setShowManualInput(true); // Show manual input on error
      });
  }, []); // Empty dependency array since analyzeUrl doesn't depend on any props or state

  // Try to auto-detect current tab URL on component mount
  useEffect(() => {
    const tryAutoDetection = async () => {
      logInfo("Starting auto-detection...");

      // Check if chrome extension APIs are available
      if (typeof chrome === "undefined" || !chrome.tabs) {
        logInfo("Chrome APIs not available - falling back to manual input");
        setShowManualInput(true);
        setLoading(false);
        return;
      }

      try {
        // Get current tab
        const tabs = await new Promise((resolve, reject) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(tabs);
            }
          });
        });

        logInfo(`Found ${tabs?.length || 0} active tabs`);

        if (tabs && tabs.length > 0) {
          const tab = tabs[0];
          logInfo(`Tab URL: ${tab.url || "UNDEFINED"}`);

          // If URL is undefined, try to trigger activeTab permission
          if (!tab.url) {
            logInfo(
              "URL is undefined - trying to trigger activeTab permission..."
            );

            try {
              if (chrome.scripting) {
                logInfo("Attempting script injection to trigger activeTab...");

                await new Promise((resolve, reject) => {
                  chrome.scripting.executeScript(
                    {
                      target: { tabId: tab.id },
                      func: () => {
                        return {
                          url: window.location.href,
                          host: window.location.host,
                          pathname: window.location.pathname,
                        };
                      },
                    },
                    (results) => {
                      if (chrome.runtime.lastError) {
                        logInfo(
                          `Script injection failed: ${chrome.runtime.lastError.message}`
                        );
                        reject(new Error(chrome.runtime.lastError.message));
                      } else {
                        logInfo("Script injection successful!");
                        if (results && results[0] && results[0].result) {
                          const pageInfo = results[0].result;
                          logInfo(`Got page info from script: ${pageInfo.url}`);
                          resolve(pageInfo.url);
                        } else {
                          logInfo("Script executed but no results returned");
                          reject(new Error("No results from script"));
                        }
                      }
                    }
                  );
                });

                // Check if URL is now available
                const updatedTabs = await new Promise((resolve, reject) => {
                  chrome.tabs.query(
                    { active: true, currentWindow: true },
                    (tabs) => {
                      if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                      } else {
                        resolve(tabs);
                      }
                    }
                  );
                });

                if (updatedTabs[0]?.url) {
                  logInfo(`SUCCESS! URL now available: ${updatedTabs[0].url}`);
                  analyzeUrl(updatedTabs[0].url, true);
                  return;
                }
              } else {
                logInfo("chrome.scripting API not available");
              }
            } catch (scriptError) {
              logInfo(`Script injection failed: ${scriptError.message}`);
            }

            // Try using chrome.tabs.get() for more details
            try {
              const detailedTab = await new Promise((resolve, reject) => {
                chrome.tabs.get(tab.id, (tabInfo) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(tabInfo);
                  }
                });
              });

              if (detailedTab.url) {
                logInfo(`Found URL via tabs.get(): ${detailedTab.url}`);
                analyzeUrl(detailedTab.url, true);
                return;
              } else if (detailedTab.pendingUrl) {
                logInfo(`Using pendingUrl: ${detailedTab.pendingUrl}`);
                analyzeUrl(detailedTab.pendingUrl, true);
                return;
              }
            } catch (getError) {
              logInfo(`chrome.tabs.get() failed: ${getError.message}`);
            }
          } else if (tab.url) {
            logInfo(`Auto-detected URL: ${tab.url}`);

            // Check if it's a valid URL we can analyze
            if (
              tab.url.startsWith("http://") ||
              tab.url.startsWith("https://")
            ) {
              logInfo("Valid HTTP/HTTPS URL detected - auto-analyzing...");
              analyzeUrl(tab.url, true);
              return;
            } else {
              logInfo(
                `Cannot analyze URL with protocol: ${tab.url.split(":")[0]}:`
              );
            }
          }
        }

        // Try broader tab query as last resort
        logInfo("Trying broader tab query (all windows)...");
        const allTabs = await new Promise((resolve, reject) => {
          chrome.tabs.query({ active: true }, (tabs) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(tabs);
            }
          });
        });

        logInfo(`Found ${allTabs?.length || 0} active tabs across all windows`);

        if (allTabs && allTabs.length > 0) {
          for (let i = 0; i < allTabs.length; i++) {
            const tab = allTabs[i];

            if (
              tab.url &&
              (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
            ) {
              logInfo(`Using tab ${i} URL: ${tab.url}`);
              analyzeUrl(tab.url, true);
              return;
            }
          }
        }
      } catch (error) {
        logInfo(`Auto-detection failed: ${error.message}`);
      }

      // Fall back to manual input
      logInfo(
        "All auto-detection methods failed - falling back to manual input"
      );
      setShowManualInput(true);
      setLoading(false);
    };

    tryAutoDetection();
  }, [analyzeUrl]); // Now includeanalyzeUrl in the dependency array

  const handleManualSubmit = () => {
    analyzeUrl(manualUrl, false);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
  };

  const resetToManualInput = () => {
    setError(null);
    setSiteData(null);
    setShowManualInput(true);
    setLoading(false);
  };

  // Loading view (auto-detection in progress)
  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner message="Analyzing website..." />
        <div className="w-full px-8 mt-4">
          <ProgressIndicator
            currentStep={analysisProgress}
            totalSteps={3}
            steps={["Fetching Data", "AI Analysis", "Finalizing"]}
            isVisible={true}
          />
        </div>
      </div>
    );
  }

  // Manual input view or error view
  if (showManualInput || error) {
    return (
      <div className="w-[400px] h-[500px] p-6 bg-gray-50 flex flex-col justify-center">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="font-medium">Error:</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            🛡️ DataGuardian
          </h1>
          <p className="text-sm text-gray-600">Privacy Analysis Tool</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL to Analyze:
          </label>
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Enter URL (e.g. leetcode.com)"
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualUrl.trim() || loading}
            className={`w-full mt-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              manualUrl.trim() && !loading
                ? "bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Privacy...
              </div>
            ) : (
              "🔍 Analyze Website Privacy"
            )}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">💡 Example URLs:</h4>
          <div className="space-y-1">
            <button
              onClick={() => setManualUrl("leetcode.com")}
              className="block text-left text-xs text-blue-600 hover:text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded w-full"
            >
              leetcode.com
            </button>
            <button
              onClick={() => setManualUrl("github.com")}
              className="block text-left text-xs text-blue-600 hover:text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded w-full"
            >
              github.com
            </button>
            <button
              onClick={() => setManualUrl("stackoverflow.com")}
              className="block text-left text-xs text-blue-600 hover:text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded w-full"
            >
              stackoverflow.com
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success view - show results
  if (siteData) {
    return (
      <div className="w-[400px] bg-gray-50 text-gray-800">
        {currentView === "popup" ? (
          <PopupView siteData={siteData} onNavigate={navigateTo} />
        ) : (
          <FullReportView
            siteData={siteData}
            onNavigate={navigateTo}
            setSiteData={setSiteData}
          />
        )}

        {/* Add a small button to analyze a different site */}
        <div className="p-2 border-t bg-white">
          <button
            onClick={resetToManualInput}
            className="w-full text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded transition-colors"
          >
            🔄 Analyze Different Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] p-4 bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Something went wrong. Please try again.</p>
        <button
          onClick={resetToManualInput}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          Restart
        </button>
      </div>
    </div>
  );
}

export default App;
