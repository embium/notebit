import React from 'react';
import { cn } from '@src/renderer/utils';
import { CheckIcon } from 'lucide-react';
import {
  CustomDropdownSub,
  CustomDropdownSubTrigger,
  CustomDropdownSubContent,
  useDropdownContext,
} from './CustomDropdown';

interface CustomDropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Whether to keep dropdown open after clicking (default: false) */
  keepOpen?: boolean;
}

export const CustomDropdownLabel: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-medium', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CustomDropdownSeparator: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  return (
    <div
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
};

export const CustomDropdownItem: React.FC<CustomDropdownItemProps> = ({
  className,
  children,
  checked,
  onCheckedChange,
  disabled = false,
  keepOpen = false,
  onClick,
  ...props
}) => {
  const { closeDropdown } = useDropdownContext();

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent document click handler from triggering immediately
    e.stopPropagation();

    if (disabled) return;

    try {
      // Handle checkbox functionality
      if (onCheckedChange) {
        onCheckedChange(!checked);
      }

      // Call the original onClick handler if provided
      if (onClick) {
        await Promise.resolve(onClick(e));
      }

      // Close the dropdown after onClick unless keepOpen is true
      if (!keepOpen && closeDropdown) {
        closeDropdown();
      }
    } catch (error) {
      console.error('Error in dropdown item click handler:', error);
      // Close dropdown even on error, unless keepOpen is true
      if (!keepOpen && closeDropdown) {
        closeDropdown();
      }
    }
  };

  return (
    <div
      className={cn(
        'relative cursor-default items-center gap-2 rounded-sm py-1.5 text-sm outline-hidden select-none',
        'hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {onCheckedChange !== undefined && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && <CheckIcon className="h-4 w-4" />}
        </span>
      )}
      <div className={cn(onCheckedChange !== undefined && 'pl-6')}>
        {children}
      </div>
    </div>
  );
};

// Re-export submenu components
export {
  CustomDropdownSub,
  CustomDropdownSubTrigger,
  CustomDropdownSubContent,
};

export default CustomDropdownItem;
