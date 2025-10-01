import React from 'react';

interface ValveLEDProps {
  status: number; // 0 = Undefined, 1 = ON, 2 = OFF
}

const ValveLED: React.FC<ValveLEDProps> = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 1:
        return '#00ff00'; // Green - ON (Open)
      case 2:
        return '#ff0000'; // Red - OFF (Closed)
      default:
        return '#666666'; // Gray - Undefined
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 1:
        return 'ON';
      case 2:
        return 'OFF';
      default:
        return 'Undefined';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 1:
        return 'led-on';
      case 2:
        return 'led-off';
      default:
        return 'led-undefined';
    }
  };

  return (
    <div className={`valve-led ${getStatusClass()}`}>
      <div
        className="led-indicator"
        style={{ backgroundColor: getColor() }}
      />
      <span className="led-label">Manual Valve:</span>
      <span className="led-status">{getStatusText()}</span>
    </div>
  );
};

export default ValveLED;
