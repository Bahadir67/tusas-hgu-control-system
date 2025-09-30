import React from 'react';
import DataExportPanel from './DataExportPanel';
import QueryManagementPanel, { QueryHistoryItem } from './QueryManagementPanel';

interface QueriesTabProps {
  queryHistory: QueryHistoryItem[];
  onExecuteQuery: (query: string) => void;
  selectedMotors: number[];
  selectedMetrics: string[];
  timeRange: string;
  dataCount: number;
}

const QueriesTab: React.FC<QueriesTabProps> = ({
  queryHistory,
  onExecuteQuery,
  selectedMotors,
  selectedMetrics,
  timeRange,
  dataCount
}) => {
  return (
    <div className="influx-queries-tab">
      <div className="queries-tab-grid">
        <QueryManagementPanel queryHistory={queryHistory} onExecuteQuery={onExecuteQuery} />
        <DataExportPanel
          selectedMotors={selectedMotors}
          selectedMetrics={selectedMetrics}
          timeRange={timeRange}
          dataCount={dataCount}
        />
      </div>
    </div>
  );
};

export default QueriesTab;
