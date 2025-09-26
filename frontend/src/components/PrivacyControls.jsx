import { useState, useEffect } from "react";
import ToggleAction from "../components/ToggleAction";
import { PrivacyManager } from "../utils/privacyManager";
import {
  BellAlertIcon,
  WifiIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

const PrivacyControls = ({ url = "" }) => {
  const [privacyManager] = useState(new PrivacyManager());
  const [currentSettings, setCurrentSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load current settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        await privacyManager.loadSettings();

        // Get site-specific permissions if URL provided
        let sitePermissions = {};
        if (url) {
          sitePermissions = await privacyManager.getSitePermissions(url);
        }

        const settings = {
          blockNotifications:
            privacyManager.getSetting("blockNotifications") ||
            sitePermissions.notifications ||
            false,
          blockCookies:
            privacyManager.getSetting("blockCookies") ||
            sitePermissions.cookies ||
            false,
          blockTrackers: privacyManager.getSetting("blockTrackers") || false,
        };

        setCurrentSettings(settings);
      } catch (error) {
        console.error("Failed to load privacy settings:", error);
        setCurrentSettings({
          blockNotifications: false,
          blockCookies: false,
          blockTrackers: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [privacyManager, url]);

  // Listen for setting changes from other parts of the extension
  useEffect(() => {
    const handleSettingChange = (event) => {
      const { setting, value } = event.detail;
      setCurrentSettings((prev) => ({
        ...prev,
        [setting]: value,
      }));
    };

    window.addEventListener("privacySettingChanged", handleSettingChange);
    return () => {
      window.removeEventListener("privacySettingChanged", handleSettingChange);
    };
  }, []);

  // Handle toggle actions
  const handleToggle = async (enabled, settingKey) => {
    try {
      await privacyManager.updateSetting(settingKey, enabled);

      // Show success notification
      const action = enabled ? "enabled" : "disabled";
      const settingNames = {
        blockNotifications: "notification blocking",
        blockCookies: "cookie blocking",
        blockTrackers: "tracker blocking",
      };

      const settingName = settingNames[settingKey] || settingKey;
      privacyManager.showPrivacyNotification(
        `Successfully ${action} ${settingName} for this site`
      );

      // Update local state
      setCurrentSettings((prev) => ({
        ...prev,
        [settingKey]: enabled,
      }));
    } catch (error) {
      console.error(`Failed to toggle ${settingKey}:`, error);
      throw error; // Re-throw to let ToggleAction handle the error
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="font-bold text-md mb-3">Privacy Controls</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">
            Loading privacy settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h2 className="font-bold text-md mb-3">Privacy Controls</h2>
      <div className="flex flex-col gap-3">
        <ToggleAction
          icon={<BellAlertIcon className="w-6 h-6 text-yellow-500" />}
          label="Block Notification Requests"
          description="Prevent websites from asking for notification permissions"
          initialState={currentSettings.blockNotifications}
          settingKey="blockNotifications"
          onToggle={handleToggle}
        />

        <ToggleAction
          icon={<WifiIcon className="w-6 h-6 text-blue-500" />}
          label="Block Marketing Cookies"
          description="Block third-party tracking and advertising cookies"
          initialState={currentSettings.blockCookies}
          settingKey="blockCookies"
          onToggle={handleToggle}
        />

        <ToggleAction
          icon={<ShieldExclamationIcon className="w-6 h-6 text-red-500" />}
          label="Block All Trackers"
          description="Block requests to known tracking and analytics services"
          initialState={currentSettings.blockTrackers}
          settingKey="blockTrackers"
          onToggle={handleToggle}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
          <strong>💡 Tip:</strong> Blocking trackers may affect website
          functionality but significantly improves your privacy.
        </div>

        {url && (
          <div className="p-3 bg-green-50 rounded text-xs text-green-700">
            <strong>🎯 Active Site:</strong> Settings will be applied to{" "}
            <span className="font-mono">{new URL(url).hostname}</span>
          </div>
        )}
      </div>

      {/* Privacy Status Indicator */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span>Privacy Level:</span>
        <div className="flex items-center gap-2">
          {Object.values(currentSettings).filter(Boolean).length === 0 && (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>Minimal Protection</span>
            </>
          )}
          {Object.values(currentSettings).filter(Boolean).length === 1 && (
            <>
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Basic Protection</span>
            </>
          )}
          {Object.values(currentSettings).filter(Boolean).length === 2 && (
            <>
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Enhanced Protection</span>
            </>
          )}
          {Object.values(currentSettings).filter(Boolean).length === 3 && (
            <>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Maximum Protection</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyControls;
