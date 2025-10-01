import React from 'react';

interface MotorCardProps {
  motorId: number;
  status: 'active' | 'stopped' | 'warning';
  pressure?: number;
  flow?: number;
  isSelected: boolean;
  onClick: () => void;
}

const MotorCard: React.FC<MotorCardProps> = ({
  motorId,
  status,
  pressure,
  flow,
  isSelected,
  onClick
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'stopped':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'stopped':
        return 'status-stopped';
      case 'warning':
        return 'status-warning';
      default:
        return 'status-unknown';
    }
  };

  const formatValue = (value?: number, unit?: string) => {
    if (value === undefined || Number.isNaN(value)) {
      return '- -';
    }
    return `${value.toFixed(1)}${unit || ''}`;
  };

  return (
    <div
      className={`motor-card ${isSelected ? 'selected' : ''} ${getStatusClass()}`}
      onClick={onClick}
    >
      <div className="motor-card-header">
        <span className="motor-id">M{motorId}</span>
        <span className="status-icon">{getStatusIcon()}</span>
      </div>
      <div className="motor-card-body">
        <div className="metric">
          <span className="value">{formatValue(pressure, 'bar')}</span>
        </div>
        <div className="metric">
          <span className="value">{formatValue(flow, 'L/m')}</span>
        </div>
      </div>
    </div>
  );
};

export default MotorCard;
