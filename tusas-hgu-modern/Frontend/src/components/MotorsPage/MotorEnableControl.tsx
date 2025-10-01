import React, { useState, useEffect } from 'react';

interface MotorEnableControlProps {
  motorId: number;
  currentStatus: boolean;
  onToggle: (enable: boolean) => Promise<void>;
}

const MotorEnableControl: React.FC<MotorEnableControlProps> = ({
  motorId,
  currentStatus,
  onToggle
}) => {
  const [isEnabled, setIsEnabled] = useState(currentStatus);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setIsEnabled(currentStatus);
  }, [currentStatus]);

  const handleEnable = async (enable: boolean) => {
    if (isChanging || isEnabled === enable) return;

    setIsChanging(true);
    try {
      await onToggle(enable);
      // OPC collection will update automatically (1-second interval)
      // Component will re-render with new value
    } catch (error) {
      console.error('Failed to toggle motor enable:', error);
      alert('Failed to change motor status');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="motor-enable-control">
      <span className="control-label">Motor Enable:</span>
      <div className="button-group">
        <button
          className={`enable-button on-button ${isEnabled ? 'active' : ''}`}
          onClick={() => handleEnable(true)}
          disabled={isChanging}
        >
          ON
        </button>
        <button
          className={`enable-button off-button ${!isEnabled ? 'active' : ''}`}
          onClick={() => handleEnable(false)}
          disabled={isChanging}
        >
          OFF
        </button>
      </div>
      <span className="status-label">
        Current: <span className={isEnabled ? 'status-on' : 'status-off'}>
          {isEnabled ? 'ON' : 'OFF'}
        </span>
      </span>
    </div>
  );
};

export default MotorEnableControl;
