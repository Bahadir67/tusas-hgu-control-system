import React, { useMemo } from 'react';
import { useOpcStore } from '../../store/opcStore';
import './SystemFlowPanel.css';

const SystemFlowPanel: React.FC = () => {
  const { system, motors } = useOpcStore();
  
  // Calculate active motors and total metrics
  const activeMotors = useMemo(() => {
    return Object.values(motors).filter(motor => motor.enabled && motor.status === 1);
  }, [motors]);
  
  const totalMetrics = useMemo(() => {
    return {
      totalFlow: activeMotors.reduce((sum, motor) => sum + motor.flow, 0),
      totalPressure: activeMotors.length > 0 ? 
        activeMotors.reduce((sum, motor) => sum + motor.pressure, 0) / activeMotors.length : 0,
      avgTemperature: activeMotors.length > 0 ?
        activeMotors.reduce((sum, motor) => sum + motor.temperature, 0) / activeMotors.length : 0,
      totalPower: activeMotors.reduce((sum, motor) => sum + motor.current * 220, 0) / 1000, // kW approximation
      efficiency: activeMotors.length > 0 ?
        (activeMotors.reduce((sum, motor) => sum + (motor.rpm / motor.targetRpm), 0) / activeMotors.length) * 100 : 0
    };
  }, [activeMotors]);

  // Flow path animation data (Motor 7 removed from main system)
  const flowPaths = [
    { from: 'tank', to: 'manifold', active: true }, // Direct tank to manifold
    { from: 'manifold', to: 'motor1', active: motors[1]?.enabled },
    { from: 'manifold', to: 'motor2', active: motors[2]?.enabled },
    { from: 'manifold', to: 'motor3', active: motors[3]?.enabled },
    { from: 'manifold', to: 'motor4', active: motors[4]?.enabled },
    { from: 'manifold', to: 'motor5', active: motors[5]?.enabled },
    { from: 'manifold', to: 'motor6', active: motors[6]?.enabled },
  ];

  return (
    <div className="system-flow-panel">
      {/* System Metrics Row */}
      <div className="system-metrics-row">
        <div className="system-metric-card primary">
          <div className="metric-icon">💧</div>
          <div className="metric-content">
            <div className="metric-label">Toplam Debi</div>
            <div className="metric-value">{totalMetrics.totalFlow.toFixed(1)}</div>
            <div className="metric-unit">L/min</div>
          </div>
          <div className="metric-trend positive">+2.3%</div>
        </div>

        <div className="system-metric-card secondary">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-label">Sistem Basıncı</div>
            <div className="metric-value">{totalMetrics.totalPressure.toFixed(1)}</div>
            <div className="metric-unit">bar</div>
          </div>
          <div className="metric-trend neutral">0.1%</div>
        </div>

        <div className="system-metric-card tertiary">
          <div className="metric-icon">🌡️</div>
          <div className="metric-content">
            <div className="metric-label">Ort. Sıcaklık</div>
            <div className="metric-value">{totalMetrics.avgTemperature.toFixed(0)}</div>
            <div className="metric-unit">°C</div>
          </div>
          <div className="metric-trend neutral">-0.5%</div>
        </div>

        <div className="system-metric-card quaternary">
          <div className="metric-icon">🔋</div>
          <div className="metric-content">
            <div className="metric-label">Toplam Güç</div>
            <div className="metric-value">{totalMetrics.totalPower.toFixed(1)}</div>
            <div className="metric-unit">kW</div>
          </div>
          <div className="metric-trend negative">-1.2%</div>
        </div>

        <div className="system-metric-card efficiency">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-label">Verimlilik</div>
            <div className="metric-value">{totalMetrics.efficiency.toFixed(0)}</div>
            <div className="metric-unit">%</div>
          </div>
          <div className="metric-trend positive">+0.8%</div>
        </div>
      </div>

      {/* Process Flow Diagram */}
      <div className="process-flow-diagram">
        <svg viewBox="0 0 1200 300" className="flow-svg">
          {/* Background grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(96, 160, 255, 0.1)" strokeWidth="0.5"/>
            </pattern>
            
            {/* Flow animation gradients */}
            <linearGradient id="activeFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0, 255, 136, 0.8)" />
              <stop offset="50%" stopColor="rgba(0, 153, 255, 0.8)" />
              <stop offset="100%" stopColor="rgba(0, 255, 136, 0.8)" />
            </linearGradient>
            
            <linearGradient id="inactiveFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(85, 107, 121, 0.4)" />
              <stop offset="100%" stopColor="rgba(85, 107, 121, 0.4)" />
            </linearGradient>
            
            {/* Glow filters */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Oil Tank */}
          <g className="component tank">
            <rect x="50" y="200" width="80" height="60" rx="8" fill="rgba(26, 34, 44, 0.8)" 
                  stroke="rgba(96, 160, 255, 0.4)" strokeWidth="2"/>
            <rect x="55" y="225" width="70" height={system.tankLevel / 100 * 35} 
                  fill="rgba(0, 153, 255, 0.6)" rx="4"/>
            <text x="90" y="285" textAnchor="middle" fill="rgba(168, 178, 192, 0.9)" fontSize="12">
              Tank: {system.tankLevel.toFixed(0)}%
            </text>
          </g>
          
          {/* Motor 7 removed from main system - it's now separate high-pressure system */}
          
          {/* Distribution Manifold */}
          <g className="component manifold">
            <rect x="350" y="210" width="100" height="40" rx="20" fill="rgba(26, 34, 44, 0.8)" 
                  stroke="rgba(96, 160, 255, 0.4)" strokeWidth="2"/>
            <text x="400" y="285" textAnchor="middle" fill="rgba(168, 178, 192, 0.9)" fontSize="12">
              Dağıtım Manifoldu
            </text>
          </g>
          
          {/* Motor Units - Increased spacing */}
          {[1, 2, 3, 4, 5, 6].map((motorId, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = 650 + col * 180; // Increased horizontal spacing
            const y = 120 + row * 140; // Increased vertical spacing
            const motor = motors[motorId];
            
            return (
              <g key={motorId} className="component motor">
                <rect x={x} y={y} width="80" height="60" rx="8" 
                      fill="rgba(26, 34, 44, 0.8)" 
                      stroke={motor?.enabled ? 
                        motor.status === 1 ? "rgba(0, 255, 136, 0.6)" : "rgba(255, 165, 0, 0.6)"
                        : "rgba(85, 107, 121, 0.4)"} 
                      strokeWidth="2" filter="url(#glow)"/>
                
                {/* Motor status indicator */}
                <circle cx={x + 15} cy={y + 15} r="6" 
                        fill={motor?.enabled ? 
                          motor.status === 1 ? "#00ff88" : "#ffa500"
                          : "#556b79"}>
                  {motor?.enabled && motor.status === 1 && (
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
                  )}
                </circle>
                
                <text x={x + 40} y={y + 35} textAnchor="middle" fill="rgba(168, 178, 192, 0.9)" fontSize="10">
                  M{motorId}
                </text>
                <text x={x + 40} y={y + 48} textAnchor="middle" fill="rgba(168, 178, 192, 0.7)" fontSize="8">
                  {motor?.rpm.toFixed(0)} RPM
                </text>
                <text x={x + 40} y={y + 80} textAnchor="middle" fill="rgba(168, 178, 192, 0.9)" fontSize="10">
                  Motor {motorId}
                </text>
              </g>
            );
          })}
          
          {/* Flow Pipes */}
          {/* Tank directly to Manifold (Motor 7 removed) */}
          <line x1="130" y1="230" x2="350" y2="230" 
                stroke="url(#activeFlow)" 
                strokeWidth="6" strokeLinecap="round">
            <animate attributeName="stroke-dasharray" values="0 20;20 0" dur="1s" repeatCount="indefinite"/>
          </line>
          
          {/* Manifold to Motors - Updated positioning and removed Motor 7 dependency */}
          {[1, 2, 3, 4, 5, 6].map((motorId, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = 650 + col * 180; // Updated X position
            const y = 150 + row * 140; // Updated Y position
            const motor = motors[motorId];
            const isActive = motor?.enabled; // Removed Motor 7 dependency
            
            return (
              <g key={motorId}>
                <line x1="450" y1="230" x2="550" y2={y} 
                      stroke={isActive ? "url(#activeFlow)" : "url(#inactiveFlow)"} 
                      strokeWidth="4" strokeLinecap="round">
                  {isActive && (
                    <animate attributeName="stroke-dasharray" values="0 15;15 0" dur="1.5s" repeatCount="indefinite"/>
                  )}
                </line>
                <line x1="550" y1={y} x2={x} y2={y} 
                      stroke={isActive ? "url(#activeFlow)" : "url(#inactiveFlow)"} 
                      strokeWidth="4" strokeLinecap="round">
                  {isActive && (
                    <animate attributeName="stroke-dasharray" values="0 15;15 0" dur="1.5s" repeatCount="indefinite"/>
                  )}
                </line>
              </g>
            );
          })}
          
          {/* Flow direction indicators - Red arrows removed as requested */}
          {/* Removed animated arrows to main manifold */}
        </svg>
      </div>

      {/* System Status Bar */}
      <div className="system-status-bar">
        <div className="status-section">
          <div className="status-label">Aktif Motorlar</div>
          <div className="status-value">{activeMotors.length}/6</div>
        </div>
        
        <div className="status-section">
          <div className="status-label">Sistem Durumu</div>
          <div className={`status-value ${activeMotors.length > 0 ? 'running' : 'stopped'}`}>
            {activeMotors.length > 0 ? 'ÇALIŞIYOR' : 'DURDURULMUŞ'}
          </div>
        </div>
        
        <div className="status-section">
          <div className="status-label">Toplam Çalışma Süresi</div>
          <div className="status-value">
            {Math.floor(Date.now() / 1000 / 3600) % 24}:{Math.floor(Date.now() / 1000 / 60) % 60}
          </div>
        </div>
        
        <div className="status-section">
          <div className="status-label">Sistem Basıncı</div>
          <div className="status-value">
            {system.totalPressure?.toFixed(1) || '0.0'} bar
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemFlowPanel;