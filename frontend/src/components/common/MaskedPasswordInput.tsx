import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { apiFetch } from '../../services/apiClient';

type MaskedPasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  revealEndpoint?: string; // API endpoint to reveal password (e.g., '/servers/:id/reveal-password')
  canReveal?: boolean; // Override to force reveal capability
  className?: string;
  inputClassName?: string;
};

/**
 * Reusable masked password input component with reveal functionality
 * Requires credentials:reveal permission to reveal passwords
 */
export function MaskedPasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  disabled = false,
  error,
  label,
  revealEndpoint,
  canReveal: forceCanReveal,
  className = '',
  inputClassName = '',
}: MaskedPasswordInputProps) {
  const { hasPermission } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const canReveal = forceCanReveal !== undefined ? forceCanReveal : (hasPermission('credentials:reveal') && !!revealEndpoint);

  // Reset revealed state when value changes (e.g., when editing different server)
  useEffect(() => {
    setRevealedPassword(null);
    setIsRevealed(false);
    setShowPassword(false);
  }, [revealEndpoint]);

  const handleReveal = async () => {
    if (!revealEndpoint || isRevealing || isRevealed) return;

    setIsRevealing(true);
    try {
      const response = await apiFetch<{ password: string | null }>(revealEndpoint);
      if (response.password) {
        setRevealedPassword(response.password);
        setIsRevealed(true);
        setShowPassword(true);
      } else {
        setRevealedPassword('');
        setIsRevealed(true);
      }
    } catch (err) {
      console.error('Failed to reveal password:', err);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleToggleVisibility = () => {
    if (!isRevealed && canReveal) {
      handleReveal();
    } else {
      setShowPassword(!showPassword);
    }
  };

  // Display value: if revealed, show revealed password; otherwise show form value
  const displayValue = isRevealed && revealedPassword !== null ? revealedPassword : value;

  return (
    <div className={className}>
      {label && (
        <label className="flex flex-col mb-2">
          <span className="text-sm font-medium leading-normal text-gray-900 dark:text-white">{label}</span>
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={displayValue}
          onChange={(e) => {
            const newValue = e.target.value;
            // If revealed, update the revealed password
            if (isRevealed && revealedPassword !== null) {
              setRevealedPassword(newValue);
            }
            // Always call onChange to update form state
            onChange(newValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`form-input flex w-full rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-10 pl-10 pr-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`}
        />
        {(canReveal && revealEndpoint) && (
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={isRevealing || disabled}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label={showPassword ? 'Hide password' : isRevealed ? 'Show password' : 'Reveal password'}
            title={isRevealed ? (showPassword ? 'Hide password' : 'Show password') : 'Reveal password (requires credentials:reveal permission)'}
          >
            {isRevealing ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

