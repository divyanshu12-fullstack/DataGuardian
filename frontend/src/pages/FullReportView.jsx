import React, { useState, useEffect } from "react";
import ModernHeader from "../components/ModernHeader";
import ModernToggle from "../components/ModernToggle";
import AIPrivacyAnalysis from "../components/AIPrivacyAnalysis";
import TrackerNetworkVisualization from "../components/TrackerNetworkVisualization";
import { PrivacyManager } from "../utils/privacyManager";
import { recalculateScoreAndGrade } from "../utils/scoring";
import {
  BugAntIcon,
  ChartPieIcon,
  ShareIcon,
  ServerIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

// Helper object to map category names to their UI properties
const categoryDetails = {
  Advertising: {
    icon: "BugAntIcon",
    description: "Block advertising and marketing trackers",
  },
  Analytics: {
    icon: "ChartPieIcon",
    description: "Block website analytics and behavior tracking",
  },
  Social: {
    icon: "ShareIcon",
    description: "Block social media widgets and tracking",
  },
  "CDN/Utility": {
    icon: "ServerIcon",
    description: "Block content delivery and utility scripts",
  },
  "Tag Manager": {
    icon: "TagIcon",
    description: "Block third-party script loaders",
  },
  Unknown: {
    icon: "QuestionMarkCircleIcon",
    description: "Block trackers of unknown category",
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


// A new collapsible section component to organize the report
const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left"
      >
        <h2 className="flex items-center gap-3 font-bold text-base text-gray-800">
          {icon}
          {title}
        </h2>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-gray-100">{children}</div>
      )}
    </div>
  );
};

const FullReportView = ({ siteData = {}, onNavigate, setSiteData }) => {
  const { url, grade, trackers = {}, aiSummary, simplifiedPolicy } = siteData;
  const trackerCategories = Object.keys(trackers);

  const [privacyManager] = useState(new PrivacyManager());
  const [trackerSettings, setTrackerSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Group tracker domains by category for the detailed list
  const groupedTrackers = (aiSummary?.trackerDetails || []).reduce(
    (acc, tracker) => {
      const category = tracker.category || "Unknown";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tracker);
      return acc;
    },
    {}
  );

  // Load settings for all detected tracker categories
  useEffect(() => {
    const loadTrackerSettings = async () => {
      setIsLoading(true);
      try {
        await privacyManager.loadSettings(url);
        const settings = {};
        trackerCategories.forEach((category) => {
          const settingKey = `block${category.replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}Trackers`;
          settings[settingKey] = privacyManager.getSetting(settingKey);
        });
        setTrackerSettings(settings);
      } catch (error) {
        console.error("Failed to load tracker settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (trackerCategories.length > 0) loadTrackerSettings();
    else setIsLoading(false);
  }, [privacyManager, url, Object.keys(trackers).join(",")]);

  // [NEW] Recalculate score whenever settings change
  useEffect(() => {
    if (isLoading || !setSiteData) return;

    const { score: newScore, grade: newGrade } = recalculateScoreAndGrade(
      siteData,
      trackerSettings
    );

    // Only update if the grade has actually changed to prevent re-render loops
    if (newGrade !== siteData.grade) {
      setSiteData((prevData) => ({
        ...prevData,
        score: newScore,
        grade: newGrade,
      }));
    }
  }, [trackerSettings, siteData, isLoading, setSiteData]);

  // Handle toggling tracker categories
  const handleTrackerToggle = async (enabled, settingKey) => {
    try {
      await privacyManager.updateSetting(settingKey, enabled, url);
      setTrackerSettings((prev) => ({ ...prev, [settingKey]: enabled }));
    } catch (error) {
      console.error(`Failed to toggle ${settingKey}:`, error);
    }
  };

  // Refresh category toggles from storage
  const refreshCategoryToggles = async () => {
    try {
      await privacyManager.loadSettings(url);
      const settings = {};
      trackerCategories.forEach((category) => {
        const settingKey = `block${category.replace(
          /[^a-zA-Z0-9]/g,
          ""
        )}Trackers`;
        settings[settingKey] = privacyManager.getSetting(settingKey);
      });
      setTrackerSettings(settings);
    } catch {
      // ignore
    }
  };

  // Listen for mode change and refresh UI switches
  useEffect(() => {
    const handler = (evt) => {
      if (evt?.detail?.mode) {
        refreshCategoryToggles();
      }
    };
    window.addEventListener("privacyModeChanged", handler);
    return () => window.removeEventListener("privacyModeChanged", handler);
  }, [url, trackerCategories.join(",")]);
  
  // Create a filtered list of trackers for the visualization
  const visibleTrackers = (aiSummary?.trackerDetails || []).filter(tracker => {
    const category = tracker.category || 'Unknown';
    const settingKey = `block${category.replace(/[^a-zA-Z0-9]/g, '')}Trackers`;
    return !trackerSettings[settingKey];
  });

  return (
    <div
      className="min-h-screen bg-gray-100 no-scrollbar overflow-y-auto"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="relative">
        <button
          onClick={() => onNavigate && onNavigate("popup")}
          className="absolute top-3 left-3 z-10 p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Back to summary"
        >
          <span className="text-gray-700 text-xl leading-none">←</span>
        </button>
        <ModernHeader score={grade} isAnalyzing={false} />
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <CollapsibleSection
          title="AI-Powered Privacy Summary"
          icon={<InformationCircleIcon className="w-6 h-6 text-blue-600" />}
          defaultOpen={true}
        >
          <div className="pt-4">
            {aiSummary && aiSummary.summary ? (
              <AIPrivacyAnalysis
                aiSummary={aiSummary}
                simplifiedPolicy={simplifiedPolicy}
              />
            ) : (
              <p className="text-gray-600">
                The AI privacy summary could not be generated for this website.
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Privacy Controls"
          icon={<ShieldCheckIcon className="w-6 h-6 text-blue-600" />}
          defaultOpen={true}
        >
          <div className="space-y-3 pt-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-4">
                Loading controls...
              </p>
            ) : trackerCategories.length > 0 ? (
              trackerCategories.map((category) => {
                const settingKey = `block${category.replace(
                  /[^a-zA-Z0-9]/g,
                  ""
                )}Trackers`;
                const details =
                  categoryDetails[category] || categoryDetails.Unknown;
                return (
                  <ModernToggle
                    key={settingKey}
                    icon={getIcon(details.icon)}
                    label={`Block ${category} Trackers`}
                    description={details.description}
                    count={trackers[category] || 0}
                    initialState={trackerSettings[settingKey] || false}
                    settingKey={settingKey}
                    onToggle={handleTrackerToggle}
                    disabled={(trackers[category] || 0) === 0}
                  />
                );
              })
            ) : (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  No trackers were detected on this page!
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Tracker Network Visualization"
          icon={<ShareIcon className="w-6 h-6 text-blue-600" />}
          defaultOpen={false}
        >
          {visibleTrackers.length > 0 ? (
            <TrackerNetworkVisualization
              trackerDetails={visibleTrackers}
              siteUrl={url}
            />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-center py-10 px-4 bg-slate-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  No trackers to display on the map.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  All detected tracker categories are currently blocked.
                </p>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
  title="Detailed Tracker List"
  icon={<ListBulletIcon className="w-6 h-6 text-blue-600" />}
  defaultOpen={false}
>
  <div className="pt-4 space-y-6">
    {Object.keys(groupedTrackers).length > 0 ? (
      Object.keys(groupedTrackers).map((category) => {
        const details =
          categoryDetails[category] || categoryDetails.Unknown;
        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-3">
              <span className="p-2 bg-gray-100 rounded-lg">
                {getIcon(details.icon)}
              </span>
              <h3 className="font-semibold text-gray-800 text-md">
                {category} ({groupedTrackers[category].length})
              </h3>
            </div>
            <ul className="space-y-2 pl-4 border-l-2 border-gray-200 ml-4">
              {groupedTrackers[category].map((tracker) => (
                <li
                  key={tracker.domain}
                  className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono">{tracker.domain}</span>
                    <span className="block text-gray-500 text-xs mt-1">
                      Identified as: {tracker.name}
                    </span>
                  </div>
                  <span className="font-sans text-xs bg-white text-gray-600 px-2 py-1 rounded-full border">
                    {tracker.company}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })
    ) : (
      <p className="text-gray-600 text-center py-4">
        No specific tracker domains were identified.
      </p>
    )}
  </div>
</CollapsibleSection>
      </div>
    </div>
  );
};

export default FullReportView;