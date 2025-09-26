import { useState, useEffect } from "react";

const ModernToggle = ({
  icon,
  label,
  initialState = false,
  onToggle = null,
  settingKey = null,
  disabled = false,
  description = null,
  count = 0,
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
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        disabled
          ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
          : isOn
          ? "cursor-pointer border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl"
          : "cursor-pointer border-gray-200 bg-white hover:border-blue-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:shadow-md"
      }`}
    >
      {/* Background decoration */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isOn ? "opacity-10" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500"></div>
      </div>

      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Icon with enhanced styling */}
            <div
              className={`p-2 rounded-xl transition-all duration-300 ${
                isOn
                  ? "bg-green-100 text-green-600 shadow-sm"
                  : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
              }`}
            >
              {icon}
            </div>

            {/* Label and description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-semibold text-sm transition-colors duration-300 ${
                    isOn ? "text-green-800" : "text-gray-800"
                  }`}
                >
                  {label}
                </h3>
                {count > 0 && (
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-full transition-colors duration-300 ${
                      isOn
                        ? "bg-green-200 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              {description && (
                <p
                  className={`text-xs mt-1 transition-colors duration-300 ${
                    isOn ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Enhanced toggle switch */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isLoading
                    ? "bg-yellow-400 animate-pulse"
                    : isOn
                    ? "bg-green-400 shadow-sm"
                    : "bg-gray-300"
                }`}
              ></div>
              {isOn && !disabled && (
                <span className="text-xs font-medium text-green-600 animate-pulse">
                  🛡️ Protected
                </span>
              )}
              {!isOn && !disabled && (
                <span className="text-xs text-gray-500">⚠️ Unprotected</span>
              )}
            </div>

            {/* Toggle button */}
            <button
              onClick={handleToggle}
              disabled={disabled || isLoading}
              className={`relative inline-flex items-center h-7 rounded-full w-12 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                disabled
                  ? "bg-gray-200 cursor-not-allowed"
                  : isOn
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-all duration-300 shadow-sm ${
                  isOn ? "translate-x-6" : "translate-x-1"
                } ${isLoading ? "animate-pulse" : ""}`}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernToggle;
