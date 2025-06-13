import React from 'react';

export interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Accessible, theme-aware custom Switch component.
 * - Modern, visually balanced, and accessible
 * - Works in both light and dark mode
 * - No external dependencies
 */
export const CustomSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      id={id}
      tabIndex={0}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors outline-none
        focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2
        ${checked ? 'bg-primary' : 'bg-input'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      {/* Thumb */}
      <span
        className={`
          absolute top-1/2 -translate-y-1/2 transition-all duration-200
          h-5 w-5 rounded-full shadow
          border border-border
          ${checked ? 'left-[calc(100%-1.25rem)] bg-primary-foreground' : 'left-0.5 bg-foreground'}
        `}
        aria-hidden="true"
      />
    </button>
  );
};

export default CustomSwitch;
