import React, { useState, useEffect } from 'react';
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

  const menuItems: MenuItem[] = [
    {
      id: 'navigation',
      label: 'Navigation',
      icon: '🧭',
      items: [
        { id: 'main', label: 'Main Dashboard', icon: '🏠', action: () => onNavigate?.('main') },
        { id: 'motors', label: 'Motor Controls', icon: '⚙️', action: () => onNavigate?.('motors') },
        { id: 'process-flow', label: 'Process Flow', icon: '🔄', action: () => onNavigate?.('process-flow') },
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
        { id: 'pressure-cal', label: 'Pressure Sensors', icon: '📏', action: () => console.log('Pressure cal') },
        { id: 'flow-cal', label: 'Flow Meters', icon: '💧', action: () => console.log('Flow cal') },
        { id: 'temp-cal', label: 'Temperature Sensors', icon: '🌡️', action: () => console.log('Temp cal') }
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

        <div className="menu-footer">
          <div className="footer-info">
            <div className="footer-version">v2.1.0</div>
            <div className="footer-status">System Active</div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default HamburgerMenu;