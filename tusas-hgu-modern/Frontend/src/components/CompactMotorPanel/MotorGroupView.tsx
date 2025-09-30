import React, { useMemo } from 'react';
import CompactMotorPanel from '.';

interface MotorGroupViewProps {
  motorIds: ReadonlyArray<number>;
  onMotorSelect?: (motorId: number) => void;
}

const DEFAULT_SLOT_COUNT = 4;

const MotorGroupView: React.FC<MotorGroupViewProps> = ({ motorIds, onMotorSelect }) => {
  const paddedMotorIds = useMemo(() => {
    const slotCount = Math.max(DEFAULT_SLOT_COUNT, motorIds.length);
    const slots: Array<number | null> = [...motorIds];

    while (slots.length < slotCount) {
      slots.push(null);
    }

    return slots;
  }, [motorIds]);

  return (
    <div className="motor-group-view">
      <div className="ultra-compact-motor-grid">
        {paddedMotorIds.map((id, index) => (
          id !== null ? (
            <div key={id} className="ultra-compact-motor-wrapper">
              <CompactMotorPanel
                motorId={id}
                onClick={() => onMotorSelect?.(id)}
              />
            </div>
          ) : (
            <div key={`placeholder-${index}`} className="motor-card-placeholder" aria-hidden="true" />
          )
        ))}
      </div>
    </div>
  );
};

export default MotorGroupView;
