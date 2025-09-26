import {
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

// A more compact list item
const InfoListItem = ({ children, icon }) => (
  <li className="flex items-start gap-2 py-1">
    <span className="mt-1 flex-shrink-0 text-blue-500">{icon}</span>
    <span className="text-gray-700 text-xs">{children}</span>
  </li>
);

// A more compact section component
const AnalysisSection = ({ title, icon, children }) => (
  <div className="py-2.5">
    <h3 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

// A more compact card component
const ExplainerCard = ({ children, colorClass = "border-yellow-400" }) => (
  <div
    className={`text-xs bg-gray-50/70 p-3 rounded-md border-l-4 ${colorClass}`}
  >
    {children}
  </div>
);

const AIPrivacyAnalysis = ({ aiSummary, simplifiedPolicy }) => {
  const hasAISummary = aiSummary && aiSummary.success && aiSummary.summary;

  if (!hasAISummary) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-600" />
          AI Privacy Analysis
        </h2>
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">
            {aiSummary?.note || "AI analysis not available for this site"}
          </p>
        </div>
      </div>
    );
  }

  const {
    whatTheyCollect = [],
    whoTheyShareWith = [],
    howLongTheyKeep,
    keyRisks = [],
    trackerBreakdown = [],
  } = aiSummary.summary;

  return (
    <div className="bg-white p-0">
      <div className="divide-y divide-gray-100">
        {/* What They Collect */}
        {whatTheyCollect.length > 0 && (
          <AnalysisSection
            title="What They Collect"
            icon={<InformationCircleIcon className="w-5 h-5 text-blue-500" />}
          >
            <ul className="space-y-0.5">
              {whatTheyCollect.slice(0, 4).map((item, index) => (
                <InfoListItem
                  key={index}
                  icon={
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1"></div>
                  }
                >
                  {item}
                </InfoListItem>
              ))}
            </ul>
          </AnalysisSection>
        )}

        {/* Who They Share With */}
        {whoTheyShareWith.length > 0 && (
          <AnalysisSection
            title="Who They Share With"
            icon={<BuildingOfficeIcon className="w-5 h-5 text-purple-500" />}
          >
            <div className="space-y-2">
              {whoTheyShareWith.slice(0, 4).map((company, index) => (
                <ExplainerCard key={index} colorClass="border-purple-400">
                  {company}
                </ExplainerCard>
              ))}
            </div>
          </AnalysisSection>
        )}

        {/* Data Retention */}
        {howLongTheyKeep && (
          <AnalysisSection
            title="Data Retention"
            icon={<ClockIcon className="w-5 h-5 text-orange-500" />}
          >
            <ExplainerCard colorClass="border-orange-400">
              {howLongTheyKeep}
            </ExplainerCard>
          </AnalysisSection>
        )}

        {/* Key Privacy Risks */}
        {keyRisks.length > 0 && (
          <AnalysisSection
            title="Key Privacy Risks"
            icon={
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            }
          >
            <div className="bg-red-50/50 p-3 rounded-lg">
              <ul className="space-y-0.5">
                {keyRisks.slice(0, 4).map((risk, index) => (
                  <InfoListItem
                    key={index}
                    icon={
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    }
                  >
                    <span className="text-red-900 text-xs">{risk}</span>
                  </InfoListItem>
                ))}
              </ul>
            </div>
          </AnalysisSection>
        )}

        {/* Tracker Breakdown */}
        {trackerBreakdown.length > 0 && (
          <AnalysisSection
            title="Top Trackers Explained"
            icon={
              <ShieldExclamationIcon className="w-5 h-5 text-yellow-600" />
            }
          >
            <div className="space-y-2">
              {trackerBreakdown.slice(0, 4).map((tracker, index) => (
                <ExplainerCard key={index} colorClass="border-yellow-500">
                  {tracker}
                </ExplainerCard>
              ))}
            </div>
          </AnalysisSection>
        )}
      </div>
    </div>
  );
};

export default AIPrivacyAnalysis;