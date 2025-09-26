import React, { useState, useEffect } from "react";
import ModernHeader from "../components/ModernHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { PrivacyManager } from "../utils/privacyManager";
import { recalculateScoreAndGrade } from "../utils/scoring";
import {
  BugAntIcon,
  ChartPieIcon,
  ShareIcon,
  ServerIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  ArrowRightCircleIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Helper object to map category names to their UI properties
const categoryDetails = {
  Advertising: { icon: "BugAntIcon", color: "bg-red-100 text-red-700" },
  Analytics: { icon: "ChartPieIcon", color: "bg-blue-100 text-blue-700" },
  Social: { icon: "ShareIcon", color: "bg-sky-100 text-sky-700" },
  "CDN/Utility": { icon: "ServerIcon", color: "bg-indigo-100 text-indigo-700" },
  "Tag Manager": { icon: "TagIcon", color: "bg-yellow-100 text-yellow-700" },
  Unknown: {
    icon: "QuestionMarkCircleIcon",
    color: "bg-gray-100 text-gray-700",
  },
};

// Helper function to get the correct icon component from its name string
const icons = {
  BugAntIcon,
  ChartPieIcon,
  ShareIcon,
  ServerIcon,
  TagIcon,
  QuestionMarkCircleIcon,
};
const getIcon = (iconName) => {
  const IconComponent = icons[iconName];
  return IconComponent ? (
    <IconComponent className="w-5 h-5" />
  ) : (
    <QuestionMarkCircleIcon className="w-5 h-5" />
  );
};

// [MODIFIED] This component now creates concise one-liner summaries.
const CompactAIPrivacyAnalysis = ({ summary }) => {
  if (!summary || !summary.whatTheyCollect) {
    return (
      <p className="text-xs text-center text-gray-500 py-2">
        AI summary is not available for this site.
      </p>
    );
  }

  // --- NEW: Logic to create one-liner summaries ---
  const getRiskSummary = () => {
    const { keyRisks = [] } = summary;
    if (keyRisks.length === 0) return "No critical privacy risks were found.";
    return keyRisks[0]; // Return only the first, most important risk.
  };

  const getCollectionSummary = () => {
    const { whatTheyCollect = [] } = summary;
    if (whatTheyCollect.length === 0)
      return "No specific data collection points identified.";
    const firstItem = whatTheyCollect[0];
    const count = whatTheyCollect.length;
    if (count === 1) return `${firstItem}.`;
    return `${firstItem} and ${count - 1} more types.`;
  };

  const getSharingSummary = () => {
    const { whoTheyShareWith = [] } = summary;
    if (whoTheyShareWith.length === 0)
      return "No data sharing partners were identified.";
    const firstItem = whoTheyShareWith[0];
    const count = whoTheyShareWith.length;
    if (count === 1) return `${firstItem}.`;
    return `${firstItem} and ${count - 1} other partners.`;
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-start gap-2 text-xs">
        <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="flex-1">
          <span className="font-semibold">Collects:</span>{" "}
          {getCollectionSummary()}
        </p>
      </div>
      <div className="flex items-start gap-2 text-xs">
        <BuildingOfficeIcon className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <p className="flex-1">
          <span className="font-semibold">Shares With:</span>{" "}
          {getSharingSummary()}
        </p>
      </div>
      <div className="flex items-start gap-2 text-xs">
        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <p className="flex-1">
          <span className="font-semibold">Key Risk:</span> {getRiskSummary()}
        </p>
      </div>
    </div>
  );
};

const PopupView = ({ siteData = {}, onNavigate }) => {
  const [privacyManager] = useState(new PrivacyManager());
  const [isLoading, setIsLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState("none");
  const [trackerSettings, setTrackerSettings] = useState({});
  const [computedGrade, setComputedGrade] = useState(null);

  const {
    url = "Unknown site",
    trackers = {},
    grade = "F",
    aiSummary,
  } = siteData;

  const trackerCategories = Object.keys(trackers);
  const totalTrackers = Object.values(trackers).reduce(
    (sum, count) => sum + count,
    0
  );

  useEffect(() => {
    const loadMode = async () => {
      setIsLoading(true);
      try {
        await privacyManager.loadSettings(url);
        const mode = await privacyManager.getSitePrivacyMode(url);
        setPrivacyMode(mode || "none");

        // Initialize tracker settings from storage for detected categories
        const settings = {};
        Object.keys(trackers || {}).forEach((category) => {
          const key = `block${category.replace(/[^a-zA-Z0-9]/g, "")}Trackers`;
          settings[key] = privacyManager.getSetting(key);
        });
        setTrackerSettings(settings);
      } catch (error) {
        console.error("Failed to load privacy mode:", error);
        setPrivacyMode("none");
      } finally {
        setIsLoading(false);
      }
    };
    loadMode();
  }, [privacyManager, url, trackers]);

  const setAllCategoryBlocking = async (enabled) => {
    try {
      await privacyManager.updateSetting("blockTrackers", enabled, url);
    } catch {
      console.warn("blockTrackers toggle failed");
    }
    try {
      for (const category of trackerCategories) {
        const key = `block${category.replace(/[^a-zA-Z0-9]/g, "")}Trackers`;
        try {
          await privacyManager.updateSetting(key, enabled, url);
        } catch {
          /* noop */
        }
      }
      setTrackerSettings((prev) => {
        const updated = { ...prev };
        for (const category of trackerCategories) {
          const key = `block${category.replace(/[^a-zA-Z0-9]/g, "")}Trackers`;
          updated[key] = enabled;
        }
        return updated;
      });
    } catch {
      /* noop */
    }
  };

  const getHostname = (urlString) => {
    try {
      if (!urlString || urlString === "Unknown site") return "this site";
      return new URL(urlString).hostname;
    } catch {
      return "this site";
    }
  };

  const getModeDescription = () => {
    switch (privacyMode) {
      case "stealth":
        return "Stealth: Block ALL trackers.";
      case "research":
        return "Research: Share data anonymously (no IDs/cookies)";
      case "none":
        return "None: Protections are off. Trackers are allowed.";
      default:
        return "Select a privacy mode.";
    }
  };

  // Recalculate grade when tracker settings change
  useEffect(() => {
    if (!siteData || !aiSummary) return;
    try {
      const { grade: newGrade } = recalculateScoreAndGrade(
        siteData,
        trackerSettings
      );
      setComputedGrade(newGrade);
    } catch {
      setComputedGrade(null);
    }
  }, [trackerSettings, aiSummary, siteData]);

  if (isLoading) {
    return (
      <div className="w-[400px] flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="w-[400px] flex flex-col bg-gray-50 no-scrollbar"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <ModernHeader score={computedGrade || grade} isAnalyzing={false} />

      <div
        className="flex-1 p-4 space-y-3 no-scrollbar"
        style={{ overflow: "auto" }}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                AI Privacy Snapshot
              </p>
              <p className="text-xs text-gray-500">
                Summary for {getHostname(url)}
              </p>
            </div>
          </div>
          <CompactAIPrivacyAnalysis summary={aiSummary?.summary} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Trackers Detected
            </h2>
            <span className="text-sm font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {totalTrackers} Total
            </span>
          </div>
          <div className="space-y-2">
            {trackerCategories.length > 0 ? (
              trackerCategories.map((category) => {
                const details =
                  categoryDetails[category] || categoryDetails.Unknown;
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-full ${details.color}`}>
                        {getIcon(details.icon)}
                      </span>
                      <span className="text-gray-700">{category}</span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {trackers[category]}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-3">
                <p className="text-sm font-medium text-green-700">
                  No trackers were detected on this page!
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Mode</p>
              <p className="text-xs text-gray-500">{getModeDescription()}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  await privacyManager.setPrivacyMode("stealth");
                  await privacyManager.setSitePrivacyMode(url, "stealth");
                  setPrivacyMode("stealth");
                  await setAllCategoryBlocking(true);
                }}
                className={`flex-1 text-center px-3 py-1.5 text-sm rounded-lg border ${
                  privacyMode === "stealth"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Stealth
              </button>
              <button
                onClick={async () => {
                  await privacyManager.setPrivacyMode("research");
                  await privacyManager.setSitePrivacyMode(url, "research");
                  setPrivacyMode("research");
                  await setAllCategoryBlocking(false);
                }}
                className={`flex-1 text-center px-3 py-1.5 text-sm rounded-lg border ${
                  privacyMode === "research"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Research
              </button>
              <button
                onClick={async () => {
                  await privacyManager.setPrivacyMode("none");
                  await privacyManager.setSitePrivacyMode(url, "none");
                  setPrivacyMode("none");
                  await setAllCategoryBlocking(false);
                }}
                className={`flex-1 text-center px-3 py-1.5 text-sm rounded-lg border ${
                  privacyMode === "none"
                    ? "bg-gray-600 text-white border-gray-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                None
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.scrollTo) {
              window.scrollTo({ top: 0, behavior: "instant" });
            }
            if (onNavigate) onNavigate("fullReport");
          }}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          View Full Report & Controls
          <ArrowRightCircleIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PopupView;
