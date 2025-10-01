import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface SetpointEditPopupProps {
  currentValue: number;
  onSave: (value: number) => Promise<void>;
  onClose: () => void;
  unit: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

const SetpointEditPopup: React.FC<SetpointEditPopupProps> = ({
  currentValue,
  onSave,
  onClose,
  unit,
  label,
  min,
  max,
  step = 0.1
}) => {
  const [editValue, setEditValue] = useState(currentValue.toString());
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleApply = async () => {
    const numValue = parseFloat(editValue);

    if (isNaN(numValue)) {
      alert('Invalid number');
      return;
    }

    if (min !== undefined && numValue < min) {
      alert(`Value must be at least ${min}`);
      return;
    }

    if (max !== undefined && numValue > max) {
      alert(`Value must be at most ${max}`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      onClose();
    } catch (error) {
      console.error('Failed to save setpoint:', error);
      alert('Failed to save setpoint');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const popupContent = (
    <div className="setpoint-popup-overlay" onClick={onClose}>
      <div className="setpoint-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <span className="popup-label">{label}</span>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
        <div className="popup-content">
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            step={step}
            min={min}
            max={max}
            disabled={isSaving}
          />
          <span className="popup-unit">{unit}</span>
        </div>
        <div className="popup-actions">
          <button
            className="popup-button apply"
            onClick={handleApply}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Apply'}
          </button>
          <button
            className="popup-button cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(popupContent, document.body);
};

export default SetpointEditPopup;
