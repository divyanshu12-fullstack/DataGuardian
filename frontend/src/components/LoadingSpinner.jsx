import React from "react";

const LoadingSpinner = ({ message = "Loading...", size = "medium" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      {/* Animated spinner */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-blue-200 rounded-full animate-spin`}
        ></div>
        <div
          className={`absolute top-0 left-0 ${sizeClasses[size]} border-4 border-transparent border-t-blue-600 rounded-full animate-spin`}
        ></div>
      </div>

      {/* Loading message */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">{message}</p>
        <div className="flex items-center justify-center mt-2 space-x-1">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
          <div
            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
