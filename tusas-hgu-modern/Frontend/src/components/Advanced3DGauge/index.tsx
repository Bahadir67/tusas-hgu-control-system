import React, { useMemo } from 'react';

interface Advanced3DGaugeProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  size?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  trendValue?: number; // Previous value for trend calculation
  format?: (value: number) => string;
  glowColor?: string;
}

const Advanced3DGauge: React.FC<Advanced3DGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  size = 120,
  warningThreshold,
  criticalThreshold,
  trendValue,
  format = (v) => v.toFixed(0),
  glowColor
}) => {
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const innerRadius = radius * 0.7;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Calculate percentage and angle
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 240 - 120; // 240 degree arc
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage * 0.67) * circumference;
  
  // Calculate trend
  const trend = useMemo(() => {
    if (trendValue === undefined) return 'stable';
    const diff = value - trendValue;
    if (Math.abs(diff) < (max - min) * 0.01) return 'stable'; // Less than 1% change
    return diff > 0 ? 'up' : 'down';
  }, [value, trendValue, max, min]);
  
  // Dynamic color based on thresholds and status
  const getGaugeColor = () => {
    if (glowColor) return glowColor;
    if (criticalThreshold && value >= criticalThreshold) return '#ff1744';
    if (warningThreshold && value >= warningThreshold) return '#ff6b35';
    if (value < min * 1.1) return '#42a5f5';
    return '#00ff88';
  };
  
  const gaugeColor = getGaugeColor();
  
  // Generate tick marks
  const tickMarks = [];
  const numTicks = 8;
  for (let i = 0; i <= numTicks; i++) {
    const tickAngle = (i / numTicks) * 240 - 120;
    const tickValue = min + (i / numTicks) * (max - min);
    const isImportantTick = i === 0 || i === numTicks || i === numTicks / 2;
    
    const tickStartRadius = radius * 0.85;
    const tickEndRadius = radius * (isImportantTick ? 0.75 : 0.8);
    
    const x1 = size / 2 + Math.cos((tickAngle * Math.PI) / 180) * tickStartRadius;
    const y1 = size / 2 + Math.sin((tickAngle * Math.PI) / 180) * tickStartRadius;
    const x2 = size / 2 + Math.cos((tickAngle * Math.PI) / 180) * tickEndRadius;
    const y2 = size / 2 + Math.sin((tickAngle * Math.PI) / 180) * tickEndRadius;
    
    tickMarks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={isImportantTick ? 2 : 1}
        strokeLinecap="round"
      />
    );
    
    // Add value labels for important ticks
    if (isImportantTick) {
      const labelRadius = radius * 0.65;
      const labelX = size / 2 + Math.cos((tickAngle * Math.PI) / 180) * labelRadius;
      const labelY = size / 2 + Math.sin((tickAngle * Math.PI) / 180) * labelRadius;
      
      tickMarks.push(
        <text
          key={`label-${i}`}
          x={labelX}
          y={labelY}
          fill="rgba(255, 255, 255, 0.5)"
          fontSize={size * 0.08}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-tick-label"
        >
          {format(tickValue)}
        </text>
      );
    }
  }
  
  // Needle position
  const needleLength = radius * 0.65;
  const needleX = size / 2 + Math.cos((angle * Math.PI) / 180) * needleLength;
  const needleY = size / 2 + Math.sin((angle * Math.PI) / 180) * needleLength;
  
  // Trend arrow
  const getTrendArrow = () => {
    const arrowSize = size * 0.06;
    const arrowX = size / 2 + size * 0.25;
    const arrowY = size / 2 - size * 0.2;
    
    if (trend === 'up') {
      return (
        <polygon
          points={`${arrowX},${arrowY - arrowSize} ${arrowX - arrowSize},${arrowY + arrowSize} ${arrowX + arrowSize},${arrowY + arrowSize}`}
          fill="#00ff88"
          className="trend-arrow trend-up"
        />
      );
    } else if (trend === 'down') {
      return (
        <polygon
          points={`${arrowX},${arrowY + arrowSize} ${arrowX - arrowSize},${arrowY - arrowSize} ${arrowX + arrowSize},${arrowY - arrowSize}`}
          fill="#ff6b35"
          className="trend-arrow trend-down"
        />
      );
    }
    return (
      <circle
        cx={arrowX}
        cy={arrowY}
        r={arrowSize * 0.6}
        fill="rgba(255, 255, 255, 0.3)"
        className="trend-stable"
      />
    );
  };
  
  return (
    <div className="advanced-3d-gauge" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="gauge-svg"
        style={{
          filter: `drop-shadow(0 0 8px ${gaugeColor}40)`
        }}
      >
        {/* Outer Ring - Background */}
        <circle
          stroke="rgba(48, 64, 80, 0.3)"
          fill="transparent"
          strokeWidth={strokeWidth * 1.2}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={circumference - (0.67 * circumference)}
          transform={`rotate(-120 ${size / 2} ${size / 2})`}
        />
        
        {/* Middle Ring - Warning Zone */}
        {warningThreshold && (
          <circle
            stroke="rgba(255, 165, 0, 0.2)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={size / 2}
            cy={size / 2}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={circumference - (((warningThreshold - min) / (max - min)) * 0.67) * circumference}
            transform={`rotate(-120 ${size / 2} ${size / 2})`}
          />
        )}
        
        {/* Inner Ring - Critical Zone */}
        {criticalThreshold && (
          <circle
            stroke="rgba(255, 23, 68, 0.3)"
            fill="transparent"
            strokeWidth={strokeWidth * 0.8}
            strokeLinecap="round"
            r={innerRadius}
            cx={size / 2}
            cy={size / 2}
            strokeDasharray={`${innerRadius * 2 * Math.PI} ${innerRadius * 2 * Math.PI}`}
            strokeDashoffset={innerRadius * 2 * Math.PI - (((criticalThreshold - min) / (max - min)) * 0.67) * innerRadius * 2 * Math.PI}
            transform={`rotate(-120 ${size / 2} ${size / 2})`}
          />
        )}
        
        {/* Main Value Arc with Glow */}
        <circle
          stroke={gaugeColor}
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
          style={{
            filter: `drop-shadow(0 0 4px ${gaugeColor}) drop-shadow(0 0 8px ${gaugeColor}60)`
          }}
        />
        
        {/* Tick marks */}
        {tickMarks}
        
        {/* Center hub with 3D effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.06}
          fill="url(#centerGradient)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={1}
        />
        
        {/* Needle with glow */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={needleX}
          y2={needleY}
          stroke="#ffffff"
          strokeWidth={3}
          strokeLinecap="round"
          className="gauge-needle"
          style={{
            filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))'
          }}
        />
        
        {/* Trend indicator */}
        {getTrendArrow()}
        
        {/* Gradients */}
        <defs>
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.5)" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Center digital display with glass effect */}
      <div className="gauge-center-display-3d">
        <div className="gauge-value-3d" style={{ color: gaugeColor }}>
          {format(value)}
        </div>
        {unit && <div className="gauge-unit-3d">{unit}</div>}
        {label && <div className="gauge-label-3d">{label}</div>}
      </div>
    </div>
  );
};

export default Advanced3DGauge;