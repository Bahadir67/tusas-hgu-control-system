import React, { useEffect, useMemo, useState } from 'react';
import { useOpcStore } from './store/opcStore';
import { useAuth } from './contexts/AuthContext';
import { opcApiService } from './services/opcApiService';
import { useSystemModeTransition } from './hooks/useSystemModeTransition';
import HamburgerMenu from './components/HamburgerMenu';
import SystemOverviewPanel from './components/SystemOverviewPanel';
import TankCoolingPanel from './components/TankCoolingPanel';
import { LogsPage } from './components/LogsPage';
import AlarmsPage from './components/AlarmsPage';
import InfluxDBMonitor, { InfluxMonitorTab } from './components/InfluxDBMonitor';
import MotorsPage from './components/MotorsPage';
import './styles/industrial-theme.css';
import './styles/modern-layout.css';


function App() {
  const { token } = useAuth();
  const {
    system,
    motors,
    isConnected,
    isLoading,
    errors,
    currentPage: storeCurrentPage,
    fetchPageData, 
    setConnection,
    setCurrentPage: setStoreCurrentPage,
    clearErrors,
    writeVariable,
    triggerOpcRefresh
  } = useOpcStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedSystemPanel, setSelectedSystemPanel] = useState<string | null>(null);
  const [alarms, setAlarms] = useState<Array<{ id: number; message: string; type: string }>>([]);
  const [influxSubPage, setInfluxSubPage] = useState<InfluxMonitorTab>('summary');
  
  // Use system mode transition hook
  const transitionState = useSystemModeTransition();
  
  // Page navigation state - use store state directly
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Use store's currentPage directly
  const currentPage = storeCurrentPage as 'main' | 'logs' | 'alarms' | 'stats' | 'influxdb';

  const pageContainerStyle: React.CSSProperties | undefined = currentPage === 'logs'
    ? { overflow: 'hidden', display: 'flex', flexDirection: 'column' }
    : undefined;

  // Set auth token when it changes
  useEffect(() => {
    if (token) {
      opcApiService.setAuthToken(token);
    } else {
      // Try to get token from localStorage as fallback
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        opcApiService.setAuthToken(storedToken);
      } else {
        opcApiService.setAuthToken(null);
      }
    }
  }, [token]);

  // Force token refresh from localStorage on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');

    if (storedToken) {
      opcApiService.setAuthToken(storedToken);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage !== 'main') {
        if (currentPage === 'motors') navigateToPage('main');
        if (currentPage === 'logs') navigateToPage('motors');
        if (currentPage === 'alarms') navigateToPage('logs');
        if (currentPage === 'stats') navigateToPage('alarms');
        if (currentPage === 'influxdb') navigateToPage('stats');
      } else if (e.key === 'ArrowRight' && currentPage !== 'influxdb') {
        if (currentPage === 'main') navigateToPage('motors');
        if (currentPage === 'motors') navigateToPage('logs');
        if (currentPage === 'logs') navigateToPage('alarms');
        if (currentPage === 'alarms') navigateToPage('stats');
        if (currentPage === 'stats') navigateToPage('influxdb');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 'influxdb') {
      setInfluxSubPage('summary');
    }
  }, [currentPage]);

  // Real OPC data fetching with page-based optimization
  useEffect(() => {
    // Initial connection check and data fetch
    const initializeData = async () => {
      try {
        // Check OPC connection with auth token
        const connectionCheck = await fetch('http://localhost:5000/api/Opc/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        setConnection(connectionCheck.ok);
        
        // Fetch initial data for current page (skip InfluxDB - uses own API)
        if (currentPage !== 'influxdb') {
          await fetchPageData(currentPage);
        }
        
      } catch (error) {
        console.error('OPC Backend not available - NO MOCK DATA');
        setConnection(false);
        // No mock data - will show errors instead (skip InfluxDB - uses own API)
        if (currentPage !== 'influxdb') {
          await fetchPageData(currentPage);
        }
      }
    };

    // Only initialize if we have a token
    if (token) {
      initializeData();
    }

    // Set up periodic data updates (every 2 seconds for page-specific data)
    const interval = setInterval(async () => {
      try {
        // Skip InfluxDB - uses own API with own refresh
        if (currentPage !== 'influxdb') {
          await fetchPageData(currentPage);
        }
        
        // Generate random alarms for testing (remove in production)
        if (Math.random() > 0.95) {
          const newAlarm = {
            id: Date.now(),
            message: `Motor ${Math.floor(Math.random() * 7) + 1} yüksek sıcaklık uyarısı`,
            type: Math.random() > 0.5 ? 'warning' : 'critical'
          };
          setAlarms(prev => [...prev.slice(-4), newAlarm]);
        }
      } catch (error) {
        console.error('Data update failed:', error);
      }
    }, 2000); // 2 second intervals for better performance

    return () => clearInterval(interval);
  }, [currentPage, fetchPageData, setConnection, clearErrors, token]);  // Re-fetch when page changes or token updates

  // Navigation functions with data fetching
  const navigateToPage = (page: 'main' | 'logs' | 'alarms' | 'stats' | 'influxdb') => {
    if (page === currentPage || isTransitioning) return;

    setIsTransitioning(true);

    // Clear any existing errors
    clearErrors();

    // Update page in store and fetch new data
    setStoreCurrentPage(page as any);

    // Fetch data for new page immediately (skip InfluxDB - uses own API)
    if (['main', 'logs', 'alarms', 'stats'].includes(page)) {
      fetchPageData(page as any).catch(error => {
        console.error(`Failed to fetch data for page ${page}:`, error);
      });
    }

    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  const handleSystemPanelClick = (panelType: string) => {
    setSelectedSystemPanel(panelType);
  };

  const closeModal = () => {
    setSelectedSystemPanel(null);
  };

  // Handle system enable toggle
  const handleSystemEnableToggle = async () => {
    const newValue = !system?.systemEnable;
    
    try {
      const success = await writeVariable('SYSTEM_ENABLE', newValue);
      if (success) {
        console.log(`System ${newValue ? 'enabled' : 'disabled'} successfully`);
        
        // Trigger immediate OPC refresh to get updated value without waiting for timer
        console.log('🔄 Triggering immediate OPC refresh for updated system enable status...');
        const refreshResult = await triggerOpcRefresh();
        
        if (refreshResult.success) {
          console.log('✅ Fresh data loaded via manual refresh');
        } else {
          console.warn('⚠️ OPC refresh failed, will update on next timer cycle');
        }
        
      } else {
        alert('System state update failed!');
      }
    } catch (error) {
      console.error('Failed to toggle system enable:', error);
      alert('Error occurred while changing system state!');
    }
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
          if (currentPage === 'logs') navigateToPage('main');
          if (currentPage === 'alarms') navigateToPage('logs');
          if (currentPage === 'stats') navigateToPage('alarms');
          if (currentPage === 'influxdb') navigateToPage('stats');
        } else if (deltaX < 0 && currentPage !== 'influxdb') {
          // Swipe left - go to next page
          if (currentPage === 'main') navigateToPage('logs');
          if (currentPage === 'logs') navigateToPage('alarms');
          if (currentPage === 'alarms') navigateToPage('stats');
          if (currentPage === 'stats') navigateToPage('influxdb');
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
                alarms={alarms}
                onSystemEnableToggle={handleSystemEnableToggle}
              />
              <TankCoolingPanel
                onClick={() => handleSystemPanelClick('tank-cooling')}
              />
            </div>
          </div>
        );

      case 'logs':
        return <LogsPage />;
        
      case 'alarms':
        return <AlarmsPage />;
        
      case 'stats':
        return <MotorsPage />;

      case 'influxdb':
        return (
          <InfluxDBMonitor
            activeTab={influxSubPage}
            onTabChange={setInfluxSubPage}
          />
        );


      default:
        return null;
    }
  };

  return (
    <div className="modern-dashboard" onTouchStart={handleTouchStart}>
      {/* System Mode Transition Notification */}
      {transitionState.message && (
        <div 
          className={`transition-notification transition-${transitionState.messageType}`}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: transitionState.messageType === 'warning' ? '#f59e0b' :
                           transitionState.messageType === 'success' ? '#22c55e' :
                           transitionState.messageType === 'error' ? '#ef4444' : '#6b7280',
            color: 'white',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {transitionState.messageType === 'warning' && '⚠️ '}
          {transitionState.messageType === 'success' && '✅ '}
          {transitionState.messageType === 'error' && '❌ '}
          {transitionState.message}
        </div>
      )}

      {/* Hamburger Menu Overlay - Outside header */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onToggle={() => setIsMenuOpen(!isMenuOpen)}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={(page) => {
          navigateToPage(page as 'main' | 'logs' | 'alarms' | 'stats' | 'influxdb');
          setIsMenuOpen(false);
        }}
      />

      {/* Enhanced Header */}
      <div className="dashboard-header-modern">
        <div className="header-title-section">
          <div className="title-content-modern">
            <h1 className="main-title-modern">
              {currentPage === 'main' && 'TUSAŞ HGU Control'}
              {currentPage === 'logs' && 'TUSAŞ HGU Logs'}
              {currentPage === 'alarms' && 'TUSAŞ HGU Alarms'}
              {currentPage === 'stats' && 'TUSAŞ HGU Motors Detail'}
              {currentPage === 'influxdb' && 'TUSAŞ HGU Database'}
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
            className={`page-dot ${currentPage === 'influxdb' ? 'active' : ''}`}
            onClick={() => navigateToPage('influxdb')}
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
      <div
        className={`page-container ${isTransitioning ? 'transitioning' : ''}`}
        style={pageContainerStyle}
      >
        {renderPageContent()}
      </div>

    </div>
  );
}

export default App;
