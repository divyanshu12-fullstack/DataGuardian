const AnalysisSummary = ({ score, grade, trackerCount, aiSummary }) => {
  const hasAISummary = aiSummary && aiSummary.success && aiSummary.summary;

  return (
    <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
      <div className="flex justify-between items-center">
        <span>
          Privacy Score: {score}/100 ({grade})
        </span>
        <span>{trackerCount} trackers detected</span>
      </div>
      {hasAISummary && (
        <div className="mt-1 text-center">
          <span className="inline-flex items-center">
            AI-powered analysis
            {!aiSummary.success && (
              <span className="ml-1 text-orange-600">(Limited)</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisSummary;
