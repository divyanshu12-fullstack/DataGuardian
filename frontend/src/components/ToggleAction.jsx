import { useState, useEffect } from "react";

const ToggleAction = ({
  icon,
  label,
  initialState = false,
  onToggle = null,
  settingKey = null,
  disabled = false,
  description = null,
}) => {
  const [isOn, setIsOn] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsOn(initialState);
  }, [initialState]);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    const newState = !isOn;

    try {
      // Update local state immediately for better UX
      setIsOn(newState);

      // Call the toggle handler if provided
      if (onToggle) {
        await onToggle(newState, settingKey);
      }

      // Show feedback to user via notification only

      // Show visual feedback with enhanced notification
      if (typeof chrome !== "undefined" && chrome.notifications) {
        const iconColor = newState ? "🛡️" : "⚠️";
        const message = newState
          ? `Enhanced privacy protection activated for ${label.toLowerCase()}`
          : `Privacy protection disabled for ${label.toLowerCase()}`;

        chrome.notifications.create({
          type: "basic",
          iconUrl: "extensionHome.png",
          title: `${iconColor} DataGuardian Privacy`,
          message: message,
        });
      }
    } catch (error) {
      // Revert state on error
      setIsOn(!newState);
      console.error(`Failed to toggle ${label}:`, error);

      // Show error notification
      if (typeof chrome !== "undefined" && chrome.notifications) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "extensionHome.png",
          title: "DataGuardian Error",
          message: `Failed to ${newState ? "enable" : "disable"} ${label}`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border transition-all duration-300 ${
        disabled
          ? "opacity-50 cursor-not-allowed border-gray-200"
          : isOn
          ? "cursor-pointer border-green-200 bg-green-50 shadow-md"
          : "cursor-pointer border-gray-200 hover:border-blue-200 hover:bg-blue-50"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {icon}
        <div className="flex flex-col">
          <span className="font-medium text-gray-700 text-sm">{label}</span>
          {description && (
            <span className="text-xs text-gray-500 mt-1">{description}</span>
          )}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          disabled
            ? "bg-gray-200 cursor-not-allowed"
            : isOn
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-300 hover:bg-gray-400"
        }`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
            isOn ? "translate-x-6" : "translate-x-1"
          } ${isLoading ? "animate-pulse" : ""}`}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* Status indicator */}
      <div className="ml-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full">
          <div
            className={`w-full h-full rounded-full transition-colors duration-300 ${
              isLoading
                ? "bg-yellow-400 animate-pulse"
                : isOn
                ? "bg-green-400"
                : "bg-gray-300"
            }`}
          ></div>
        </div>

        {/* Security improvement indicator */}
        {isOn && !disabled && (
          <div className="text-xs text-green-600 font-medium animate-pulse">
            🛡️ Protected
          </div>
        )}
        {!isOn && !disabled && (
          <div className="text-xs text-gray-500">⚠️ Unprotected</div>
        )}
      </div>
    </div>
  );
};

export default ToggleAction;
