import React from 'react';

interface GaugeDisplayProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  size?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  format?: (value: number) => string;
}

const GaugeDisplay: React.FC<GaugeDisplayProps> = ({
  value,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  size = 120,
  warningThreshold,
  criticalThreshold,
  format = (v) => v.toFixed(0)
}) => {
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Calculate percentage and angle
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 240 - 120; // 240 degree arc starting from -120 degrees
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage * 0.67) * circumference; // 0.67 for 240 degree arc
  
  // Determine color based on thresholds
  const getValueColor = () => {
    if (criticalThreshold && value >= criticalThreshold) return 'var(--color-value-critical)';
    if (warningThreshold && value >= warningThreshold) return 'var(--color-value-high)';
    if (value < min * 1.1) return 'var(--color-value-low)'; // Below 10% of minimum
    return 'var(--color-value-normal)';
  };
  
  // Calculate needle position
  const needleX = Math.cos((angle * Math.PI) / 180) * (radius * 0.7);
  const needleY = Math.sin((angle * Math.PI) / 180) * (radius * 0.7);
  
  return (
    <div className="gauge-display" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="gauge-svg"
      >
        {/* Background arc */}
        <circle
          stroke="var(--color-border)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={circumference - (0.67 * circumference)}
          transform={`rotate(-120 ${size / 2} ${size / 2})`}
        />
        
        {/* Value arc */}
        <circle
          stroke={getValueColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-120 ${size / 2} ${size / 2})`}
          className="gauge-value-arc"
        />
        
        {/* Warning threshold marker */}
        {warningThreshold && (
          <line
            x1={size / 2}
            y1={size * 0.15}
            x2={size / 2}
            y2={size * 0.25}
            stroke="var(--color-warning)"
            strokeWidth={2}
            transform={`rotate(${((warningThreshold - min) / (max - min)) * 240 - 120} ${size / 2} ${size / 2})`}
          />
        )}
        
        {/* Critical threshold marker */}
        {criticalThreshold && (
          <line
            x1={size / 2}
            y1={size * 0.15}
            x2={size / 2}
            y2={size * 0.25}
            stroke="var(--color-error)"
            strokeWidth={3}
            transform={`rotate(${((criticalThreshold - min) / (max - min)) * 240 - 120} ${size / 2} ${size / 2})`}
          />
        )}
        
        {/* Center dot */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.03}
          fill="var(--color-text-primary)"
        />
        
        {/* Needle */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + needleX}
          y2={size / 2 + needleY}
          stroke="var(--color-text-primary)"
          strokeWidth={2}
          strokeLinecap="round"
          className="gauge-needle"
        />
        
        {/* Min/Max labels */}
        <text
          x={size * 0.2}
          y={size * 0.9}
          fill="var(--color-text-dim)"
          fontSize={size * 0.08}
          textAnchor="middle"
          className="gauge-label"
        >
          {min}
        </text>
        <text
          x={size * 0.8}
          y={size * 0.9}
          fill="var(--color-text-dim)"
          fontSize={size * 0.08}
          textAnchor="middle"
          className="gauge-label"
        >
          {max}
        </text>
      </svg>
      
      {/* Center display */}
      <div className="gauge-center-display">
        <div className="gauge-value" style={{ color: getValueColor() }}>
          {format(value)}
        </div>
        {unit && <div className="gauge-unit">{unit}</div>}
        {label && <div className="gauge-label-text">{label}</div>}
      </div>
    </div>
  );
};

export default GaugeDisplay;