import React from "react";

const ProgressIndicator = ({
  currentStep = 1,
  totalSteps = 3,
  steps = ["Analyzing", "Processing", "Complete"],
  isVisible = true,
}) => {
  if (!isVisible) return null;

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Analysis Progress
        </h3>
        <span className="text-xs text-gray-500">
          {currentStep}/{totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                index + 1 <= currentStep
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1 < currentStep ? "✓" : index + 1}
            </div>
            <span
              className={`text-xs mt-1 font-medium transition-colors duration-300 ${
                index + 1 <= currentStep ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
