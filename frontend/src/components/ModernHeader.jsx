import React from "react";
import {
  ShieldCheckIcon,
  BoltIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";

const getScoreColor = (score) => {
  if (["A+", "A", "A-"].includes(score)) return "from-green-500 to-emerald-600";
  if (["B+", "B", "B-"].includes(score)) return "from-blue-500 to-cyan-600";
  if (["C+", "C", "C-"].includes(score)) return "from-yellow-500 to-orange-600";
  return "from-red-600 to-pink-600"; // For D and F scores
};

const getScoreIcon = (score) => {
  if (["A+", "A", "A-"].includes(score))
    return <ShieldCheckIcon className="w-5 h-5" />;
  if (["B+", "B", "B-"].includes(score))
    return <BoltIcon className="w-5 h-5" />;
  return <SparklesIcon className="w-5 h-5" />;
};

const Header = ({ score, isAnalyzing = false }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>

      {/* Content */}
      <div className="relative flex items-center justify-between w-full p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-sm opacity-75"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              DataGuardian
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Privacy Protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Analyzing...</span>
            </div>
          )}

          <div
            className={`relative px-4 py-2 text-white font-bold text-lg rounded-xl shadow-lg bg-gradient-to-r ${getScoreColor(
              score
            )}`}
          >
            {/* Removed white overlay to avoid washing out the grade color */}
            <div className="relative flex items-center gap-2">
              {getScoreIcon(score)}
              <span>{score}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
