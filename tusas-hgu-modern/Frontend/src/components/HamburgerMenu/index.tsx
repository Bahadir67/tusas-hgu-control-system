import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LogoutModal from '../LogoutModal';
import PressureCalibration from '../PressureCalibration';
import FlowCalibration from '../FlowCalibration';
import TemperatureCalibration from '../TemperatureCalibration';
import OpcDataMonitor from '../OpcDataMonitor';
import './HamburgerMenu.css';

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  action?: () => void;
  items?: MenuItem[];
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ isOpen, onToggle, onClose, onNavigate }) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPressureCalibration, setShowPressureCalibration] = useState(false);
  const [showFlowCalibration, setShowFlowCalibration] = useState(false);
  const [showTemperatureCalibration, setShowTemperatureCalibration] = useState(false);
  const [showOpcDataMonitor, setShowOpcDataMonitor] = useState(false);
  const { logout, user } = useAuth();

  // Handle logout with safety warning modal
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    // Single step - proceed with system shutdown and logout
    console.log('⚠️ Stopping all hydraulic systems...');
    console.log('🛑 System shutdown initiated...');
    console.log('🔌 Disconnecting motors...');
    console.log('💨 Releasing system pressure...');
    console.log('🔒 Closing all valves...');
    console.log('👤 Logging out user...');

    // Simulate system shutdown delay
    setTimeout(() => {
      logout();
      onClose();
      setShowLogoutModal(false);
    }, 2000);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'navigation',
      label: 'Navigation',
      icon: '🧭',
      items: [
        { id: 'main', label: 'Main Dashboard', icon: '🏠', action: () => onNavigate?.('main') },
        { id: 'motors', label: 'Motor Controls', icon: '⚙️', action: () => onNavigate?.('motors') },
        { id: 'alarms', label: 'Alarms', icon: '🚨', action: () => onNavigate?.('alarms') },
        { id: 'logs', label: 'System Logs', icon: '📋', action: () => onNavigate?.('logs') },
        { id: 'stats', label: 'Statistics', icon: '📊', action: () => onNavigate?.('stats') }
      ]
    },
    {
      id: 'system-control',
      label: 'System Control',
      icon: '⚡',
      items: [
        { id: 'pump-control', label: 'Pump Enable/Disable', icon: '🔧', action: () => console.log('Pump control') },
        { id: 'emergency-stop', label: 'Emergency Stop', icon: '🛑', action: () => console.log('Emergency stop') },
        { id: 'system-reset', label: 'System Reset', icon: '🔄', action: () => console.log('System reset') }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      items: [
        { id: 'motor-settings', label: 'Motor Calibration', icon: '🔧', action: () => console.log('Motor settings') },
        { id: 'system-settings', label: 'System Parameters', icon: '📊', action: () => console.log('System settings') },
        { id: 'user-settings', label: 'User Preferences', icon: '👤', action: () => console.log('User settings') }
      ]
    },
    {
      id: 'calibration',
      label: 'Calibration',
      icon: '🎯',
      items: [
        { id: 'pressure-cal', label: 'Pressure Sensors', icon: '📏', action: () => setShowPressureCalibration(true) },
        { id: 'flow-cal', label: 'Flow Meters', icon: '💧', action: () => setShowFlowCalibration(true) },
        { id: 'temp-cal', label: 'Temperature Sensors', icon: '🌡️', action: () => setShowTemperatureCalibration(true) }
      ]
    },
    {
      id: 'control-mode',
      label: 'Control Mode',
      icon: '🎮',
      items: [
        { id: 'auto-mode', label: 'Automatic Control', icon: '🤖', action: () => console.log('Auto mode') },
        { id: 'manual-mode', label: 'Manual Control', icon: '👋', action: () => console.log('Manual mode') },
        { id: 'maintenance-mode', label: 'Maintenance Mode', icon: '🔧', action: () => console.log('Maintenance') }
      ]
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: '🔧',
      items: [
        { id: 'diagnostics', label: 'System Diagnostics', icon: '🔍', action: () => console.log('Diagnostics') },
        { id: 'opc-monitor', label: 'OPC Data Monitor', icon: '📊', action: () => setShowOpcDataMonitor(true) },
        { id: 'filter-status', label: 'Filter Status', icon: '🔽', action: () => console.log('Filter status') },
        { id: 'scheduled-maint', label: 'Scheduled Tasks', icon: '📅', action: () => console.log('Scheduled') },
        { id: 'logs', label: 'System Logs', icon: '📋', action: () => console.log('Logs') }
      ]
    }
  ];

  // Close menu on outside click
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.hamburger-menu') && !target.closest('.hamburger-button')) {
          onClose();
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.items) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else if (item.action) {
      item.action();
      onClose(); // Close menu after action
    }
  };

  const handleSubmenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
      onClose();
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      {/* Overlay */}
      {isOpen && <div className="hamburger-overlay" onClick={onClose} />}

      {/* Navigation Drawer */}
      <nav 
        id="navigation-menu"
        className={`hamburger-menu ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="menu-header">
          <div className="menu-title">
            <span className="menu-icon">🚁</span>
            <span className="menu-text">HGU Control</span>
          </div>
        </div>

        <div className="menu-content">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-item-container">
              <button
                className={`menu-item ${activeSubmenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item)}
                aria-expanded={activeSubmenu === item.id}
                aria-controls={item.items ? `submenu-${item.id}` : undefined}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-text">{item.label}</span>
                {item.items && (
                  <span className={`menu-item-arrow ${activeSubmenu === item.id ? 'open' : ''}`}>
                    ▶
                  </span>
                )}
              </button>

              {item.items && (
                <div
                  id={`submenu-${item.id}`}
                  className={`submenu ${activeSubmenu === item.id ? 'open' : ''}`}
                  role="group"
                  aria-labelledby={`menu-${item.id}`}
                >
                  {item.items.map((subItem) => (
                    <button
                      key={subItem.id}
                      className="submenu-item"
                      onClick={() => handleSubmenuItemClick(subItem)}
                    >
                      <span className="submenu-item-icon">{subItem.icon}</span>
                      <span className="submenu-item-text">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Logout Section - At the bottom */}
        <div className="menu-logout-section">
          <div className="logout-divider"></div>
          <button
            className="menu-logout-button"
            onClick={handleLogout}
            title="Logout from system"
          >
            <span className="logout-icon">🔴</span>
            <span className="logout-text">System Logout</span>
            <span className="logout-warning">⚠️</span>
          </button>
          {user && (
            <div className="current-user">
              <span className="user-icon">👤</span>
              <span className="user-name">{user.username}</span>
              <span className="user-role">({user.role})</span>
            </div>
          )}
        </div>

        <div className="menu-footer">
          <div className="footer-info">
            <div className="footer-version">v2.1.0</div>
            <div className="footer-status">System Active</div>
          </div>
        </div>
      </nav>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />

      {/* Calibration Modals */}
      <PressureCalibration
        isOpen={showPressureCalibration}
        onClose={() => setShowPressureCalibration(false)}
        onSave={(calibrationData) => {
          console.log('Pressure calibration saved:', calibrationData);
          // TODO: Implement OPC write for pressure calibration
          setShowPressureCalibration(false);
        }}
      />

      <FlowCalibration
        isOpen={showFlowCalibration}
        onClose={() => setShowFlowCalibration(false)}
        onSave={(calibrationData) => {
          console.log('Flow calibration saved:', calibrationData);
          // TODO: Implement OPC write for flow calibration
          setShowFlowCalibration(false);
        }}
      />

      <TemperatureCalibration
        isOpen={showTemperatureCalibration}
        onClose={() => setShowTemperatureCalibration(false)}
        onSave={(calibrationData) => {
          console.log('Temperature calibration saved:', calibrationData);
          // TODO: Implement OPC write for temperature calibration
          setShowTemperatureCalibration(false);
        }}
      />

      {/* OPC Data Monitor Modal */}
      {showOpcDataMonitor && (
        <div className="modal-overlay" onClick={() => setShowOpcDataMonitor(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>OPC Data Monitor</h3>
              <button
                className="modal-close"
                onClick={() => setShowOpcDataMonitor(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <OpcDataMonitor />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HamburgerMenu;