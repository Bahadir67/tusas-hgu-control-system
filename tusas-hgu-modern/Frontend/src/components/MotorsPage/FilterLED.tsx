import React from 'react';

interface FilterLEDProps {
  status: number; // 0/1/2/3
  label: string;
}

const FilterLED: React.FC<FilterLEDProps> = ({ status, label }) => {
  const getColor = () => {
    switch (status) {
      case 1:
        return '#00ff00'; // Green - Normal
      case 2:
        return '#ffaa00'; // Yellow - 75% Warning
      case 3:
        return '#ff0000'; // Red - 100% Error
      default:
        return '#666666'; // Gray - Unknown/Error
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 1:
        return 'Normal';
      case 2:
        return '75%';
      case 3:
        return '100%';
      default:
        return 'ERR';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 1:
        return 'led-normal';
      case 2:
        return 'led-warning';
      case 3:
        return 'led-error';
      default:
        return 'led-unknown';
    }
  };

  return (
    <div className={`filter-led ${getStatusClass()}`}>
      <div
        className="led-indicator"
        style={{ backgroundColor: getColor() }}
      />
      <span className="led-label">{label}:</span>
      <span className="led-status">{getStatusText()}</span>
    </div>
  );
};

export default FilterLED;
