import React, { useState } from 'react';
import './MotorControlPanel.css';

interface MotorControlPanelProps {
  motorId: number;
  enabled: boolean;
  startAck: boolean;
  stopAck: boolean;
  onEnableChange: (enabled: boolean) => Promise<void>;
  onStartCommand: () => Promise<void>;
  onStopCommand: () => Promise<void>;
  onResetCommand: () => Promise<void>;
}

const MotorControlPanel: React.FC<MotorControlPanelProps> = ({
  motorId,
  enabled,
  startAck,
  stopAck,
  onEnableChange,
  onStartCommand,
  onStopCommand,
  onResetCommand
}) => {
  const [isTogglingEnable, setIsTogglingEnable] = useState(false);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [resetPressed, setResetPressed] = useState(false);

  const showToast = (message: string, type: 'error' | 'success') => {
    const toast = document.createElement('div');
    toast.className = `motor-control-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const handleEnableToggle = async () => {
    if (isTogglingEnable || isProcessingCommand) return;

    setIsTogglingEnable(true);

    try {
      // If disabling, send STOP first
      if (enabled) {
        await onStopCommand();
        // Wait a moment for stop to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await onEnableChange(!enabled);
      showToast(`Motor ${motorId} ${!enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle enable', 'error');
      console.error('Enable toggle error:', err);
    } finally {
      setIsTogglingEnable(false);
    }
  };

  const handleStartClick = async () => {
    if (!enabled || isProcessingCommand || isTogglingEnable) return;

    setIsProcessingCommand(true);

    try {
      await onStartCommand();
      showToast(`Motor ${motorId} start command sent`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to start motor', 'error');
      console.error('Start command error:', err);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleStopClick = async () => {
    if (!enabled || isProcessingCommand || isTogglingEnable) return;

    setIsProcessingCommand(true);

    try {
      await onStopCommand();
      showToast(`Motor ${motorId} stop command sent`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to stop motor', 'error');
      console.error('Stop command error:', err);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleResetClick = async () => {
    if (!enabled || isProcessingCommand || isTogglingEnable || resetPressed) return;

    setResetPressed(true);
    setIsProcessingCommand(true);

    try {
      await onResetCommand();
      showToast(`Motor ${motorId} reset command sent`, 'success');
      // Keep pressed animation for 500ms
      setTimeout(() => setResetPressed(false), 500);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset motor', 'error');
      console.error('Reset command error:', err);
      setResetPressed(false);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  // Determine if START or STOP should be pressed based on PLC acknowledgement
  const isStartPressed = startAck && enabled;
  const isStopPressed = stopAck || !enabled;

  // Determine inactive state (when opposite button is pressed)
  const isStartInactive = !startAck && enabled;
  const isStopInactive = !stopAck && enabled;

  return (
    <div className="motor-control-panel">
      <div className="control-section">
        {/* Left Side - Enable/Disable Switch */}
        <div className="left-section">
          <div className="enable-control">
            <label className="enable-label">M{motorId}</label>
            <button
              className={`enable-switch ${enabled ? 'enabled' : 'disabled'} ${isTogglingEnable ? 'loading' : ''}`}
              onClick={handleEnableToggle}
              disabled={isTogglingEnable}
              aria-label={`Motor ${motorId} Enable Toggle`}
            >
              <span className="switch-slider">
                <span className="slider-knob" />
              </span>
              <span className="switch-label">{enabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Right Side - Command Buttons */}
        <div className="right-section">
          <div className="command-buttons">
            <div className="start-stop-group">
              <button
                className={`command-button start ${isStartPressed ? 'pressed' : ''} ${isStartInactive ? 'inactive' : ''} ${!enabled ? 'disabled' : ''}`}
                onClick={handleStartClick}
                disabled={!enabled || isProcessingCommand || isTogglingEnable}
                aria-label={`Motor ${motorId} Start`}
              >
                <span className="button-icon">▶</span>
                <span className="button-label">START</span>
              </button>
              <button
                className={`command-button stop ${isStopPressed ? 'pressed' : ''} ${isStopInactive ? 'inactive' : ''} ${!enabled ? 'disabled' : ''}`}
                onClick={handleStopClick}
                disabled={!enabled || isProcessingCommand || isTogglingEnable}
                aria-label={`Motor ${motorId} Stop`}
              >
                <span className="button-icon">■</span>
                <span className="button-label">STOP</span>
              </button>
            </div>

            {/* Independent Reset Button */}
            <button
              className={`command-button reset ${resetPressed ? 'pressed' : ''} ${!enabled ? 'disabled' : ''}`}
              onClick={handleResetClick}
              disabled={!enabled || isProcessingCommand || isTogglingEnable || resetPressed}
              aria-label={`Motor ${motorId} Reset`}
            >
              <span className="button-icon">↻</span>
              <span className="button-label">RESET</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorControlPanel;
