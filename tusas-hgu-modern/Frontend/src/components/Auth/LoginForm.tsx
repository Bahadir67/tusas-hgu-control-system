import React, { useState, useCallback } from 'react';
import { LoginRequest } from '../../types/auth';

interface LoginFormProps {
  onSubmit: (credentials: LoginRequest) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Reusable Login Form Component for TUSAŞ HGU Control System
 * Industrial SCADA form with validation and accessibility features
 */
const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  disabled = false,
  autoFocus = true
}) => {
  const [credentials, setCredentials] = useState<LoginRequest>({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldTouched, setFieldTouched] = useState({
    username: false,
    password: false
  });

  // Handle input changes
  const handleInputChange = useCallback((field: keyof LoginRequest, value: string | boolean) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));

    // Mark field as touched
    if (typeof value === 'string') {
      setFieldTouched(prev => ({
        ...prev,
        [field]: true
      }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation display
    setFieldTouched({
      username: true,
      password: true
    });

    if (!credentials.username.trim() || !credentials.password.trim()) {
      return;
    }

    await onSubmit(credentials);
  }, [credentials, onSubmit]);

  // Handle Enter key on password field
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !disabled) {
      handleSubmit(e as any);
    }
  }, [handleSubmit, loading, disabled]);

  // Validation helpers
  const isFormValid = credentials.username.trim() && credentials.password.trim();
  const canSubmit = isFormValid && !loading && !disabled;

  // Field validation
  const getUsernameError = () => {
    if (fieldTouched.username && !credentials.username.trim()) {
      return 'Username is required';
    }
    return null;
  };

  const getPasswordError = () => {
    if (fieldTouched.password && !credentials.password.trim()) {
      return 'Password is required';
    }
    return null;
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {/* Global Error Message */}
      {error && (
        <div className="error-message" role="alert" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Username Field */}
      <div className="form-group">
        <label htmlFor="username" className="form-label">
          Username *
        </label>
        <input
          id="username"
          type="text"
          className={`form-input ${getUsernameError() ? 'error' : ''}`}
          placeholder="Enter your username"
          value={credentials.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          disabled={loading || disabled}
          autoComplete="username"
          autoFocus={autoFocus}
          required
          aria-invalid={!!getUsernameError()}
          aria-describedby={getUsernameError() ? 'username-error' : undefined}
        />
        {getUsernameError() && (
          <div id="username-error" className="field-error" role="alert">
            {getUsernameError()}
          </div>
        )}
      </div>

      {/* Password Field */}
      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password *
        </label>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className={`form-input ${getPasswordError() ? 'error' : ''}`}
            placeholder="Enter your password"
            value={credentials.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || disabled}
            autoComplete="current-password"
            required
            aria-invalid={!!getPasswordError()}
            aria-describedby={getPasswordError() ? 'password-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle-button"
            disabled={loading || disabled}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <span className="password-toggle-icon">
              {showPassword ? '🙈' : '👁️'}
            </span>
          </button>
        </div>
        {getPasswordError() && (
          <div id="password-error" className="field-error" role="alert">
            {getPasswordError()}
          </div>
        )}
      </div>

      {/* Remember Me */}
      <div className="remember-me-group">
        <input
          id="rememberMe"
          type="checkbox"
          className="remember-checkbox"
          checked={credentials.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
          disabled={loading || disabled}
        />
        <label htmlFor="rememberMe" className="remember-label">
          Remember me for 30 days
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className={`login-button ${loading ? 'loading' : ''}`}
        disabled={!canSubmit}
        aria-describedby="submit-help"
      >
        <span className="button-text">
          {loading ? 'Authenticating...' : 'Access System'}
        </span>
        <div className="login-spinner" aria-hidden="true"></div>
      </button>

      {/* Form Help Text */}
      <div id="submit-help" className="form-help">
        {!canSubmit && !loading && (
          <span className="form-validation-message">
            Please fill in all required fields
          </span>
        )}
      </div>
    </form>
  );
};

export default LoginForm;