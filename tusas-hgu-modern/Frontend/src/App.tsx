import React, { useEffect, useState } from 'react';
import { useOpcStore } from './store/opcStore';
import HamburgerMenu from './components/HamburgerMenu';
import CompactMotorPanel from './components/CompactMotorPanel';
import MotorDetailModal from './components/MotorDetailModal';
import SystemOverviewPanel from './components/SystemOverviewPanel';
import TankCoolingPanel from './components/TankCoolingPanel';
import LogsPage from './components/LogsPage';
import AlarmsPage from './components/AlarmsPage';
import ProcessFlowPage from './components/ProcessFlowPage';
// import SettingsModal from './components/SettingsModal';
import './styles/industrial-theme.css';
import './styles/modern-layout.css';

function App() {
  const { system, updateAll, setConnection } = useOpcStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedMotorId, setSelectedMotorId] = useState<number | null>(null);
  const [selectedSystemPanel, setSelectedSystemPanel] = useState<string | null>(null);
  const [alarms, setAlarms] = useState<Array<{ id: number; message: string; type: string }>>([]);
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState<'main' | 'motors' | 'logs' | 'alarms' | 'stats' | 'process-flow'>('main');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage !== 'main') {
        if (currentPage === 'motors') navigateToPage('main');
        if (currentPage === 'logs') navigateToPage('motors');
        if (currentPage === 'alarms') navigateToPage('logs');
        if (currentPage === 'stats') navigateToPage('alarms');
        if (currentPage === 'process-flow') navigateToPage('stats');
      } else if (e.key === 'ArrowRight' && currentPage !== 'process-flow') {
        if (currentPage === 'main') navigateToPage('motors');
        if (currentPage === 'motors') navigateToPage('logs');
        if (currentPage === 'logs') navigateToPage('alarms');
        if (currentPage === 'alarms') navigateToPage('stats');
        if (currentPage === 'stats') navigateToPage('process-flow');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage]);

  // Simulated data updates (replace with real API calls)
  useEffect(() => {
    // Simulate initial connection
    setConnection(true);

    // Create interval for simulated data updates
    const interval = setInterval(() => {
      // Simulate random data for testing
      const simulatedData: any = {};
      
      // Generate data for each motor
      for (let i = 1; i <= 7; i++) {
        simulatedData[`MOTOR_${i}_RPM_EXECUTION`] = { value: 1450 + Math.random() * 100 };
        simulatedData[`MOTOR_${i}_CURRENT_EXECUTION`] = { value: 120 + Math.random() * 20 };
        simulatedData[`MOTOR_${i}_TARGET_EXECUTION`] = { value: 1500 };
        simulatedData[`MOTOR_${i}_LEAK_EXECUTION`] = { value: Math.random() * 0.05 };
        simulatedData[`MOTOR_${i}_TEMPERATURE_EXECUTION`] = { value: 45 + Math.random() * 10 };
        simulatedData[`MOTOR_${i}_STATUS_EXECUTION`] = { value: Math.random() > 0.8 ? 1 : 0 };
        simulatedData[`MOTOR_${i}_VALVE_EXECUTION`] = { value: Math.random() > 0.5 ? 1 : 0 };
        simulatedData[`MOTOR_${i}_LINE_FILTER_EXECUTION`] = { value: 2 };
        simulatedData[`MOTOR_${i}_SUCTION_FILTER_EXECUTION`] = { value: 2 };
        simulatedData[`MOTOR_${i}_FLOW_FLOWMETER`] = { value: 75 + Math.random() * 10 };
        simulatedData[`MOTOR_${i}_PRESSURE_VALUE`] = { value: 120 + Math.random() * 15 }; // Add actual pressure value
        simulatedData[`MOTOR_${i}_PRESSURE_SETPOINT`] = { value: 125 };
        simulatedData[`MOTOR_${i}_FLOW_SETPOINT`] = { value: 80 };
        simulatedData[`MOTOR_${i}_ENABLE_EXECUTION`] = { value: Math.random() > 0.3 ? 1 : 0 };
      }
      
      // System data
      simulatedData['SYSTEM_TOTAL_FLOW'] = { value: 450 + Math.random() * 50 };
      simulatedData['SYSTEM_TOTAL_PRESSURE'] = { value: 125 + Math.random() * 10 };
      simulatedData['OIL_TEMPERATURE'] = { value: 55 + Math.random() * 5 };
      simulatedData['TANK_LEVEL'] = { value: 75 + Math.random() * 10 };
      simulatedData['AQUA_SENSOR'] = { value: Math.random() * 0.5 };
      
      updateAll(simulatedData);
      
      // Generate random alarms for testing
      if (Math.random() > 0.95) {
        const newAlarm = {
          id: Date.now(),
          message: `Motor ${Math.floor(Math.random() * 7) + 1} yüksek sıcaklık uyarısı`,
          type: Math.random() > 0.5 ? 'warning' : 'critical'
        };
        setAlarms(prev => [...prev.slice(-4), newAlarm]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Navigation functions
  const navigateToPage = (page: 'main' | 'motors' | 'logs' | 'alarms' | 'stats' | 'process-flow') => {
    if (page === currentPage || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 150);
  };

  const handleMotorClick = (motorId: number) => {
    console.log(`Motor ${motorId} clicked! Opening modal...`);
    console.log('Current selectedMotorId:', selectedMotorId);
    setSelectedMotorId(motorId);
    console.log('New selectedMotorId should be:', motorId);
  };

  const handleSystemPanelClick = (panelType: string) => {
    setSelectedSystemPanel(panelType);
    console.log(`Opening ${panelType} system panel...`);
  };

  const closeModal = () => {
    setSelectedMotorId(null);
    setSelectedSystemPanel(null);
  };

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = currentTouch.clientX - startX;
      
      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0 && currentPage !== 'main') {
          // Swipe right - go to previous page
          if (currentPage === 'motors') navigateToPage('main');
          if (currentPage === 'logs') navigateToPage('motors');
          if (currentPage === 'alarms') navigateToPage('logs');
          if (currentPage === 'stats') navigateToPage('alarms');
          if (currentPage === 'process-flow') navigateToPage('stats');
        } else if (deltaX < 0 && currentPage !== 'process-flow') {
          // Swipe left - go to next page
          if (currentPage === 'main') navigateToPage('motors');
          if (currentPage === 'motors') navigateToPage('logs');
          if (currentPage === 'logs') navigateToPage('alarms');
          if (currentPage === 'alarms') navigateToPage('stats');
          if (currentPage === 'stats') navigateToPage('process-flow');
        }
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Render page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case 'main':
        return (
          <div className="dashboard-content-modern">
            {/* Top Row - System Panels */}
            <div className="system-panels-row">
              <SystemOverviewPanel 
                onClick={() => handleSystemPanelClick('system-overview')}
                alarms={alarms}
              />
              <TankCoolingPanel 
                onClick={() => handleSystemPanelClick('tank-cooling')} 
              />
            </div>

            {/* Main Control Section */}
            <div className="main-control-section">
              <div className="pump-control-panel">
                <div className="pump-control-header">
                  <span className="pump-control-icon">⚡</span>
                  <span className="pump-control-title">MAIN SYSTEM CONTROL</span>
                </div>
                <div className="pump-control-content">
                  <div className="pump-enable-switch-container">
                    <label className="pump-enable-label">System Pump Enable</label>
                    <div className="pump-enable-switch enabled">
                      <div className="pump-enable-slider" />
                    </div>
                    <div className="pump-status-text">ENABLED</div>
                  </div>
                  <div className="pump-control-warning">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">Changing pump state requires confirmation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation to Motors and Process Flow */}
            <div className="page-navigation-section">
              <button 
                className="nav-to-motors-btn"
                onClick={() => navigateToPage('motors')}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">View All Motors</span>
                <span className="nav-arrow">→</span>
              </button>
              
              <button 
                className="nav-to-motors-btn"
                onClick={() => navigateToPage('process-flow')}
                style={{ marginTop: '12px' }}
              >
                <span className="nav-icon">🔄</span>
                <span className="nav-text">Process Flow</span>
                <span className="nav-arrow">→</span>
              </button>
            </div>
          </div>
        );
        
      case 'motors':
        return (
          <div className="motors-page-content">
            {/* Ultra Compact Motor Grid - Inverted Pyramid Layout */}
            <div className="ultra-compact-motor-grid">
              {/* Top row - Motors 1,2,3,4 */}
              <div className="motor-row-top">
                {[1, 2, 3, 4].map(id => (
                  <div key={id} className="ultra-compact-motor-wrapper">
                    <CompactMotorPanel 
                      motorId={id} 
                      onClick={() => handleMotorClick(id)}
                    />
                  </div>
                ))}
              </div>
              
              {/* Bottom row - Motors 5,6,7 centered */}
              <div className="motor-row-bottom">
                {[5, 6, 7].map(id => (
                  <div key={id} className="ultra-compact-motor-wrapper">
                    <CompactMotorPanel 
                      motorId={id} 
                      isSpecial={id === 7}
                      onClick={() => handleMotorClick(id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* System Flow Summary */}
            <div className="system-flow-summary">
              <div className="flow-metric">
                <span className="flow-label">Total Flow:</span>
                <span className="flow-value">450 L/min</span>
              </div>
              <div className="flow-separator">|</div>
              <div className="flow-metric">
                <span className="flow-label">Total Pressure:</span>
                <span className="flow-value">125 bar</span>
              </div>
              <div className="flow-separator">|</div>
              <div className="flow-metric">
                <span className="flow-label">Active Motors:</span>
                <span className="flow-value">5</span>
              </div>
            </div>
          </div>
        );
        
      case 'logs':
        return <LogsPage />;
        
      case 'alarms':
        return <AlarmsPage />;
        
      case 'stats':
        return (
          <div className="stats-page-content">
            <div className="stats-page-header">
              <div className="stats-title">
                <span className="stats-icon">📊</span>
                <span className="stats-text">SYSTEM STATISTICS</span>
              </div>
            </div>
            
            <div className="stats-content">
              <div className="stats-placeholder">
                <div className="stats-item">
                  <h3>System Trends</h3>
                  <p>Real-time performance graphs will be displayed here</p>
                </div>
                <div className="stats-item">
                  <h3>Efficiency Analysis</h3>
                  <p>Motor efficiency comparison charts</p>
                </div>
                <div className="stats-item">
                  <h3>Power Consumption</h3>
                  <p>Energy usage statistics and trends</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'process-flow':
        return <ProcessFlowPage />;
        
      default:
        return null;
    }
  };

  return (
    <div className="modern-dashboard" onTouchStart={handleTouchStart}>
      {/* Hamburger Navigation */}
      <HamburgerMenu 
        isOpen={isMenuOpen}
        onToggle={() => setIsMenuOpen(!isMenuOpen)}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={(page) => {
          navigateToPage(page as 'main' | 'motors' | 'logs' | 'alarms' | 'stats' | 'process-flow');
          setIsMenuOpen(false);
        }}
      />

      {/* Enhanced Header */}
      <div className="dashboard-header-modern">
        <div className="header-title-section">
          <div className="title-content-modern">
            <h1 className="main-title-modern">
              {currentPage === 'main' && 'TUSAŞ HGU Control'}
              {currentPage === 'motors' && 'TUSAŞ HGU Motors'}
              {currentPage === 'logs' && 'TUSAŞ HGU Logs'}
              {currentPage === 'alarms' && 'TUSAŞ HGU Alarms'}
              {currentPage === 'stats' && 'TUSAŞ HGU Stats'}
              {currentPage === 'process-flow' && 'TUSAŞ HGU Process Flow'}
            </h1>
            <div className="subtitle-modern">Hydraulic Ground Equipment - Real-time SCADA</div>
          </div>
        </div>
        
        {/* Page Indicators */}
        <div className="page-indicators">
          <div 
            className={`page-dot ${currentPage === 'main' ? 'active' : ''}`}
            onClick={() => navigateToPage('main')}
          />
          <div 
            className={`page-dot ${currentPage === 'motors' ? 'active' : ''}`}
            onClick={() => navigateToPage('motors')}
          />
          <div 
            className={`page-dot ${currentPage === 'logs' ? 'active' : ''}`}
            onClick={() => navigateToPage('logs')}
          />
          <div 
            className={`page-dot ${currentPage === 'alarms' ? 'active' : ''}`}
            onClick={() => navigateToPage('alarms')}
          />
          <div 
            className={`page-dot ${currentPage === 'stats' ? 'active' : ''}`}
            onClick={() => navigateToPage('stats')}
          />
          <div 
            className={`page-dot ${currentPage === 'process-flow' ? 'active' : ''}`}
            onClick={() => navigateToPage('process-flow')}
          />
        </div>
        
        <div className="header-status-section">
          <div className="connection-status-modern">
            <span className={`status-indicator-large-modern ${system ? 'status-running' : 'status-error'}`} />
            <div className="status-text-modern">
              <div className="status-label-modern">{system ? 'SYSTEM ACTIVE' : 'CONNECTION ERROR'}</div>
              <div className="status-time-modern">{new Date().toLocaleTimeString('tr-TR')}</div>
            </div>
          </div>
          
          <div className="system-info-modern">
            <div className="info-item-modern">
              <div className="info-label-modern">VERSION</div>
              <div className="info-value-modern">v2.1.0</div>
            </div>
            <div className="info-item-modern">
              <div className="info-label-modern">UPTIME</div>
              <div className="info-value-modern">{Math.floor(Date.now() / 1000 / 3600) % 24}h:{Math.floor(Date.now() / 1000 / 60) % 60}m</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content with Transition */}
      <div className={`page-container ${isTransitioning ? 'transitioning' : ''}`}>
        {renderPageContent()}
      </div>

      {/* Motor Detail Modal */}
      {selectedMotorId && (
        <>
          {console.log('Rendering MotorDetailModal for motorId:', selectedMotorId)}
          <MotorDetailModal
            motorId={selectedMotorId}
            isOpen={true}
            onClose={closeModal}
          />
        </>
      )}


      {/* System Settings Modal */}
      {selectedSystemPanel && selectedMotorId === null && (
        <div className="system-settings-modal-overlay" onClick={closeModal}>
          <div className="system-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSystemPanel === 'system-overview' ? 'System Overview Settings' : 'Tank & Cooling Settings'}</h2>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-content">
              <p>Settings panel for {selectedSystemPanel} will be implemented here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;