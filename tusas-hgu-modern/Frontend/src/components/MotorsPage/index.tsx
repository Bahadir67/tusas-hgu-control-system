import React, { useState, useEffect } from 'react';
import { useOpcStore } from '../../store/opcStore';
import MotorCard from './MotorCard';
import PumpDataPanel from './PumpDataPanel';
import MotorDataPanel from './MotorDataPanel';
import SwipeIndicator from './SwipeIndicator';
import './MotorsPage.css';

interface MotorsPageProps {
  // No props needed - all data from OPC store
}

const MotorsPage: React.FC<MotorsPageProps> = () => {
  const [selectedMotorId, setSelectedMotorId] = useState(1);
  const [currentPanel, setCurrentPanel] = useState<'pump' | 'motor'>('pump');
  const motors = useOpcStore((state) => state.motors);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const getMotorStatus = (motorId: number): 'active' | 'stopped' | 'warning' => {
    const motor = motors[motorId];
    if (!motor) return 'stopped';

    // Status only based on enabled state - no pressure checking
    return motor.enabled ? 'active' : 'stopped';
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentPanel === 'pump') {
      setCurrentPanel('motor');
    } else if (direction === 'right' && currentPanel === 'motor') {
      setCurrentPanel('pump');
    }
  };

  // Touch handling for swipe - instant transition, no animation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Minimum swipe distance: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left
        handleSwipe('left');
      } else {
        // Swipe right
        handleSwipe('right');
      }
    }

    setTouchStart(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleSwipe('right');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('left');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPanel]);

  return (
    <div className="motors-page">
      <div className="motors-page-header">
        <h2>🎛️ Motors Overview</h2>
      </div>

      <div className="motor-cards-grid">
        {[1, 2, 3, 4, 5, 6, 7].map((motorId) => {
          const motor = motors[motorId];
          return (
            <MotorCard
              key={motorId}
              motorId={motorId}
              status={getMotorStatus(motorId)}
              pressure={motor?.pressure}
              flow={motor?.flow}
              isSelected={selectedMotorId === motorId}
              onClick={() => setSelectedMotorId(motorId)}
            />
          );
        })}
      </div>

      <div className="motor-detail-view">
        <div className="detail-header">
          <button
            className="nav-arrow left"
            onClick={() => handleSwipe('right')}
            disabled={currentPanel === 'pump'}
          >
            ◄
          </button>
          <h3>Motor {selectedMotorId} - {currentPanel === 'pump' ? 'Pump & Motor Details' : 'Motor Details'}</h3>
          <button
            className="nav-arrow right"
            onClick={() => handleSwipe('left')}
            disabled={currentPanel === 'motor'}
          >
            ►
          </button>
        </div>

        <div
          className="swipeable-container"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentPanel === 'pump' ? (
            <PumpDataPanel motorId={selectedMotorId} />
          ) : (
            <MotorDataPanel motorId={selectedMotorId} />
          )}
        </div>

        <SwipeIndicator current={currentPanel === 'pump' ? 0 : 1} total={2} />
      </div>
    </div>
  );
};

export default MotorsPage;
