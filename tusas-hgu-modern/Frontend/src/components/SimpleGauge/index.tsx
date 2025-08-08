import React from 'react';

interface SimpleGaugeProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  size?: number;
}

const SimpleGauge: React.FC<SimpleGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  warningThreshold,
  criticalThreshold,
  size = 100
}) => {
  // Calculate percentage
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  
  // Determine color based on thresholds
  const getColor = () => {
    if (criticalThreshold && value >= criticalThreshold) return '#ff1744';
    if (warningThreshold && value >= warningThreshold) return '#ff6b35';
    return '#00ff88';
  };
  
  const color = getColor();
  
  return (
    <div className="simple-gauge" style={{ width: size, height: size }}>
      {/* Circular progress */}
      <svg width={size} height={size} className="gauge-circle">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 10) / 2}
          fill="none"
          stroke="rgba(48, 64, 80, 0.3)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Value circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 10) / 2}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * ((size - 10) / 2)}`}
          strokeDashoffset={`${2 * Math.PI * ((size - 10) / 2) * (1 - percentage)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 4px ${color}40)`,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
        
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-value-simple"
          fill={color}
        >
          {value.toFixed(0)}
        </text>
        
        {unit && (
          <text
            x={size / 2}
            y={size / 2 + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            className="gauge-unit-simple"
            fill="var(--color-text-secondary)"
          >
            {unit}
          </text>
        )}
      </svg>
      
      {label && (
        <div className="gauge-label-simple">
          {label}
        </div>
      )}
    </div>
  );
};

export default SimpleGauge;