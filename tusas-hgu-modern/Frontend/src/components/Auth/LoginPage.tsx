import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';
import '../../styles/login-override.css';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear error when form data changes
  useEffect(() => {
    setError('');
  }, [formData.username, formData.password]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('🔐 Attempting login for user:', formData.username.trim());
      const result = await login(formData.username.trim(), formData.password);

      console.log('🔐 Login result:', result);

      if (!result.success) {
        console.error('❌ Login failed:', result.message);
        setError(result.message);
        setIsSubmitting(false);
      } else {
        console.log('✅ Login successful - waiting for redirect...');
      }
      // Success case is handled by AuthContext - user will be redirected automatically
    } catch (error) {
      console.error('💥 Login submission error:', error);
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Industrial Background Pattern */}
      <div className="login-bg-pattern"></div>
      
      {/* Main Login Card */}
      <div className="login-card">
        {/* Header Section */}
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <div className="logo-title">TUSAŞ HGU</div>
              <div className="logo-subtitle">Hydraulic Ground Equipment Control</div>
            </div>
          </div>
          
          <div className="system-status">
            <div className="status-indicator running"></div>
            <div className="status-text">
              <div className="status-label">SYSTEM READY</div>
              <div className="status-time">{new Date().toLocaleTimeString('tr-TR')}</div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-title">
            <span className="form-icon">🔐</span>
            <span className="form-text">OPERATOR LOGIN</span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">
              <span className="label-icon">👤</span>
              <span className="label-text">Username</span>
            </label>
            <input
              id="username-input"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter username"
              disabled={isSubmitting}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              <span className="label-icon">🔑</span>
              <span className="label-text">Password</span>
            </label>
            <input
              id="password-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter password"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`login-button ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner"></span>
                <span className="button-text">Authenticating...</span>
              </>
            ) : (
              <>
                <span className="button-icon">🚀</span>
                <span className="button-text">LOGIN TO SYSTEM</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <div className="footer-info">
            <div className="version">v2.1.0</div>
            <div className="separator">|</div>
            <div className="build">Build 2024.12</div>
            <div className="separator">|</div>
            <div className="company">TUSAŞ © 2024</div>
          </div>
          <div className="security-notice">
            <span className="security-icon">🛡️</span>
            <span className="security-text">Secure SCADA Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;