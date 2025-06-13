/**
 * Modal Component
 *
 * A reusable modal component that can be used for various purposes such as
 * selectors, settings, and other modal dialogs.
 */
import React, {
  useCallback,
  useEffect,
  ReactNode,
  useState,
  useRef,
} from 'react';
import { FiX } from 'react-icons/fi';

// Utils
import { cn } from '@src/renderer/utils';

/**
 * @interface ModalProps
 * @description Properties for the Modal component.
 */
interface ModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Modal width */
  width?: string | number;
  /** Modal height */
  height?: string | number;
  /** Modal max width */
  maxWidth?: string | number;
  /** Modal max height */
  maxHeight?: string | number;
  /** Whether to close when clicking outside */
  closeOnOutsideClick?: boolean;
  /** Custom header content */
  headerContent?: ReactNode;
  /** Custom footer content */
  footerContent?: ReactNode;
  /** Whether to render as a dropdown */
  asDropdown?: boolean;
  /** Position of the dropdown */
  dropdownPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Anchor element for dropdown positioning */
  anchorEl?: HTMLElement | null;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * A reusable modal component
 */
const ModalComponent: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  width = '500px',
  height = 'auto',
  maxWidth = '90vw',
  maxHeight = '90vh',
  closeOnOutsideClick = true,
  headerContent,
  footerContent,
  asDropdown = false,
  dropdownPosition = 'bottom',
  anchorEl,
  className,
}) => {
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when anchor element or visibility changes
  useEffect(() => {
    if (!asDropdown || !visible || !anchorEl) return;

    // Get the bounding rectangle of the anchor element
    const anchorRect = anchorEl.getBoundingClientRect();

    // Calculate the modal width (using the provided width or a default)
    const modalWidth =
      typeof width === 'number' ? width : parseInt(String(width), 10) || 320;

    // Calculate available space in different directions
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;

    // Common style properties
    const style: React.CSSProperties = {
      position: 'fixed',
      width,
      height,
      maxWidth,
      maxHeight,
      zIndex: 50,
    };

    // Calculate dropdown position
    if (dropdownPosition === 'top') {
      // Position above anchor element
      style.bottom = window.innerHeight - anchorRect.top + 8;
      style.left = anchorRect.left + anchorRect.width / 2 - modalWidth / 2;
    } else if (dropdownPosition === 'bottom') {
      // Position below anchor element
      style.top = anchorRect.bottom + 16;
      style.left = anchorRect.left + anchorRect.width / 2 - modalWidth / 2;
    } else if (dropdownPosition === 'left') {
      // Position to the left of anchor element
      style.right = window.innerWidth - anchorRect.left + 8;
      style.top = anchorRect.top;
    } else if (dropdownPosition === 'right') {
      // Position to the right of anchor element
      style.left = anchorRect.right + 8;
      style.top = anchorRect.top;
    }

    // Adaptive positioning: if not enough space in specified position, try alternative
    if (
      dropdownPosition === 'bottom' &&
      spaceBelow < 250 &&
      spaceAbove > spaceBelow
    ) {
      // Flip to top if more space above than below
      style.top = undefined;
      style.bottom = window.innerHeight - anchorRect.top + 8;
    } else if (
      dropdownPosition === 'top' &&
      spaceAbove < 250 &&
      spaceBelow > spaceAbove
    ) {
      // Flip to bottom if more space below than above
      style.bottom = undefined;
      style.top = anchorRect.bottom + 8;
    }

    // Ensure the dropdown doesn't go off-screen horizontally
    if (style.left !== undefined) {
      const rightEdge = (style.left as number) + modalWidth;
      if (rightEdge > window.innerWidth) {
        style.left = window.innerWidth - modalWidth - 16;
      }
      if ((style.left as number) < 16) {
        style.left = 16;
      }
    }

    // Apply the calculated style
    setDropdownStyle(style);
  }, [
    asDropdown,
    visible,
    anchorEl,
    dropdownPosition,
    width,
    height,
    maxWidth,
    maxHeight,
  ]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (visible && event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [visible, onClose]);

  // Handle outside click
  const handleBackgroundClick = useCallback(() => {
    if (closeOnOutsideClick) {
      onClose();
    }
  }, [closeOnOutsideClick, onClose]);

  // Handler for modal content click to prevent closing on inside clicks
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Don't render anything if the modal isn't visible
  if (!visible) return null;

  // Render a dropdown-style modal
  if (asDropdown) {
    return (
      <div
        className={cn(
          'fixed inset-0 bg-transparent z-40',
          closeOnOutsideClick ? 'cursor-pointer' : ''
        )}
        onClick={handleBackgroundClick}
      >
        <div
          ref={dropdownRef}
          className={cn('absolute z-50', className)}
          style={dropdownStyle}
          onClick={handleModalClick}
        >
          {children}
        </div>
      </div>
    );
  }

  // Render as standard modal
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0"
        onClick={handleBackgroundClick}
      />
      <div
        onClick={handleModalClick}
        className="relative flex flex-col z-[1001]"
        style={{
          width,
          height,
          maxWidth,
          maxHeight,
        }}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute -top-[15px] -right-[15px] w-[30px] h-[30px] rounded-full flex items-center justify-center bg-background border border-border z-10 cursor-pointer transition-transform duration-150 text-foreground hover:scale-105 active:scale-95"
          >
            <FiX size={20} />
          </button>
        )}
        <div
          className={cn(
            'flex flex-col bg-background border border-border rounded-lg overflow-hidden w-full h-full shadow-lg',
            className
          )}
        >
          {(title || headerContent) && (
            <div className="flex justify-between items-center p-3 border-b border-border">
              {headerContent || (
                <h3 className="text-lg font-medium text-foreground m-0">
                  {title}
                </h3>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footerContent && (
            <div className="p-3 border-t border-border">{footerContent}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Modal = ModalComponent;
