import React from 'react';

interface SwipeIndicatorProps {
  current: number;
  total: number;
}

const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({ current, total }) => {
  return (
    <div className="swipe-indicator">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`dot ${index === current ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};

export default SwipeIndicator;
