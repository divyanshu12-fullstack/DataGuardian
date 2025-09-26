import { MapIcon } from "@heroicons/react/24/outline";
import TrackerNetworkVisualization from "./TrackerNetworkVisualization";

const DataFlowVisualization = ({
  url,
  trackerDetails,
  aiSummary,
  trackerCount,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h2 className="font-bold text-md mb-2 flex items-center gap-2">
        <MapIcon className="w-5 h-5 text-green-600" />
        Data Flow Visualization
      </h2>

      <TrackerNetworkVisualization
        url={url}
        trackerDetails={trackerDetails}
        aiSummary={aiSummary}
        trackerCount={trackerCount}
      />

      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
        <strong>How to read:</strong> The central blue node is the website
        you're visiting. Red particles show data flowing from your device to
        various tracking companies.
      </div>
    </div>
  );
};

export default DataFlowVisualization;
