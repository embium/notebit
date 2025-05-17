import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface CustomDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** If true, don't close dropdown when clicking inside the content area */
  persistOnItemClick?: boolean;
  /** Maximum height for the dropdown content, after which it will scroll */
  maxHeight?: number;
}

// Parent context to track active submenu hierarchy
const DropdownContext = React.createContext<{
  activeSubmenuIds: Set<string>;
  setActiveSubmenu: (
    id: string,
    isActive: boolean,
    parentId?: string | null
  ) => void;
  closeDropdown?: () => void;
  persistOnItemClick?: boolean;
  maxHeight?: number;
}>({
  activeSubmenuIds: new Set<string>(),
  setActiveSubmenu: () => {},
  closeDropdown: undefined,
  persistOnItemClick: false,
  maxHeight: undefined,
});

// Helper function to calculate ideal position within viewport
const calculatePosition = (
  triggerRect: DOMRect,
  contentWidth: number,
  contentHeight: number,
  position: 'right' | 'top' = 'top',
  gap: number = 8
) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  let top, left;

  if (position === 'top') {
    // Position above the trigger by default
    top = triggerRect.top + scrollTop - contentHeight - gap;
    left = triggerRect.left + scrollLeft;

    // If not enough space above, position below
    if (top < scrollTop) {
      top = triggerRect.bottom + scrollTop + gap;
    }

    // If too far to the right, align right edge with trigger right edge
    if (left + contentWidth > viewportWidth + scrollLeft) {
      left = triggerRect.right + scrollLeft - contentWidth;
    }

    // Ensure minimum left position
    left = Math.max(scrollLeft, left);
  } else {
    // Position to the right of the trigger by default
    top = triggerRect.top + scrollTop;
    left = triggerRect.right + scrollLeft + gap;

    // If not enough space to the right, position to the left
    if (left + contentWidth > viewportWidth + scrollLeft) {
      left = triggerRect.left + scrollLeft - contentWidth - gap;
    }

    // If not enough space to the left either, align with trigger left
    if (left < scrollLeft) {
      left = triggerRect.left + scrollLeft;
    }

    // If dropdown would extend past bottom of viewport, adjust upward
    if (top + contentHeight > viewportHeight + scrollTop) {
      // Align bottom with viewport bottom, with small margin
      top = viewportHeight + scrollTop - contentHeight - 16;

      // Don't position higher than the top of the trigger
      top = Math.max(
        top,
        triggerRect.top + scrollTop - contentHeight + triggerRect.height
      );
    }
  }

  return { top, left };
};

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  trigger,
  children,
  className,
  contentClassName,
  persistOnItemClick = false,
  maxHeight = 300,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [activeSubmenuIds, setActiveSubmenuIds] = useState<Set<string>>(
    new Set()
  );

  // Tracks parent-child relationships between submenus
  const submenuParentMap = useRef<Map<string, string | null>>(new Map());

  // Set active submenu and manage hierarchy
  const setActiveSubmenu = (
    id: string,
    isActive: boolean,
    parentId?: string | null
  ) => {
    setActiveSubmenuIds((prev) => {
      const updated = new Set(prev);

      if (isActive) {
        // Store parent relationship
        if (parentId !== undefined) {
          submenuParentMap.current.set(id, parentId);
        }

        // Add this submenu to active set
        updated.add(id);

        // Close any siblings (menus with same parent that aren't this one)
        submenuParentMap.current.forEach((pId, menuId) => {
          if (
            menuId !== id &&
            pId === submenuParentMap.current.get(id) &&
            updated.has(menuId)
          ) {
            updated.delete(menuId);
          }
        });
      } else {
        // Remove this submenu from active set
        updated.delete(id);

        // Also remove any children of this submenu
        submenuParentMap.current.forEach((pId, menuId) => {
          if (pId === id) {
            updated.delete(menuId);
          }
        });
      }

      return updated;
    });
  };

  // Function to close the dropdown
  const closeDropdown = () => {
    setIsOpen(false);
    setActiveSubmenuIds(new Set());
    submenuParentMap.current.clear();
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      setIsOpen(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    // Only add the click listener when the dropdown is open
    if (isOpen) {
      // Use setTimeout to ensure this handler runs after any click handlers on dropdown items
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update position when dropdown opens or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const contentWidth = contentRef.current?.offsetWidth || rect.width;
        const contentHeight = contentRef.current?.offsetHeight || 200;

        const { top, left } = calculatePosition(
          rect,
          contentWidth,
          contentHeight,
          'top'
        );

        setPosition({
          top,
          left,
          width: rect.width,
        });
      }
    };

    if (isOpen) {
      // Update position initially
      updatePosition();

      // Update position after a short delay to make sure content is rendered
      setTimeout(updatePosition, 10);

      // Update position on window resize
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const contextValue = React.useMemo(
    () => ({
      activeSubmenuIds,
      setActiveSubmenu,
      closeDropdown,
      persistOnItemClick,
      maxHeight,
    }),
    [activeSubmenuIds, persistOnItemClick, maxHeight]
  );

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className={cn('relative inline-block', className)}>
        {/* Trigger element */}
        <div
          ref={triggerRef}
          onClick={toggleDropdown}
          className="cursor-pointer w-full"
        >
          {trigger}
        </div>

        {/* Dropdown content */}
        {isOpen &&
          createPortal(
            <div
              ref={contentRef}
              style={{
                position: 'absolute',
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: contentClassName?.includes('w-')
                  ? undefined
                  : `${position.width}px`,
                minWidth: `${position.width}px`,
                maxHeight: `${maxHeight}px`,
                zIndex: 50,
                overflowY: 'auto',
              }}
              className={cn(
                ' bg-background text-foreground animate-in fade-in-0 zoom-in-95 rounded-md border p-1 shadow-md',
                'scrollbar-visible',
                contentClassName
              )}
              // Stop propagation on mousedown to prevent the outside click handler from firing
              onMouseDown={
                persistOnItemClick ? (e) => e.stopPropagation() : undefined
              }
            >
              {children}
            </div>,
            document.body
          )}
      </div>
    </DropdownContext.Provider>
  );
};

// Submenu context to track open state
const SubMenuContext = React.createContext<{
  id: string;
  parentId: string | null;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  position: { top: number; left: number };
  setPosition: React.Dispatch<
    React.SetStateAction<{ top: number; left: number }>
  >;
  contentRef: React.RefObject<HTMLDivElement>;
}>({
  id: '',
  parentId: null,
  isOpen: false,
  setIsOpen: () => {},
  position: { top: 0, left: 0 },
  setPosition: () => {},
  contentRef: { current: null },
});

interface CustomDropdownSubProps {
  children: React.ReactNode;
}

let subMenuCounter = 0;

export const CustomDropdownSub: React.FC<CustomDropdownSubProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { activeSubmenuIds, setActiveSubmenu } =
    React.useContext(DropdownContext);
  const contentRef = useRef<HTMLDivElement>(null);

  // Try to find parent submenu context
  const parentContext = React.useContext(SubMenuContext);
  const parentId = parentContext.id || null;

  // Generate a unique ID for this submenu
  const id = React.useMemo(() => `submenu-${subMenuCounter++}`, []);

  // Check if this submenu should be open based on active submenu IDs
  React.useEffect(() => {
    if (!activeSubmenuIds.has(id) && isOpen) {
      setIsOpen(false);
    }
  }, [activeSubmenuIds, id, isOpen]);

  const contextValue = React.useMemo(
    () => ({
      id,
      parentId,
      isOpen,
      setIsOpen: (value: React.SetStateAction<boolean>) => {
        // Handle both function and direct value updates
        const newValue = typeof value === 'function' ? value(isOpen) : value;

        setIsOpen(newValue);
        setActiveSubmenu(id, newValue, parentId);
      },
      position,
      setPosition,
      contentRef,
    }),
    [id, parentId, isOpen, setActiveSubmenu, position]
  );

  return (
    <SubMenuContext.Provider value={contextValue}>
      <div className="relative">{children}</div>
    </SubMenuContext.Provider>
  );
};

interface CustomDropdownSubTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const CustomDropdownSubTrigger: React.FC<
  CustomDropdownSubTriggerProps
> = ({ children, className }) => {
  const { id, isOpen, setIsOpen, setPosition, contentRef } =
    React.useContext(SubMenuContext);
  const { persistOnItemClick } = React.useContext(DropdownContext);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateSubmenuPosition = () => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentWidth = contentRef.current.offsetWidth || 200;
    const contentHeight = contentRef.current.offsetHeight || 200;

    // Calculate the best position for the submenu
    const { top, left } = calculatePosition(
      triggerRect,
      contentWidth,
      contentHeight,
      'right'
    );

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      setIsOpen(true);

      // Set initial position estimate
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.right + 8, // Initial estimate
      });

      // Update position after content is rendered
      setTimeout(updateSubmenuPosition, 10);
    }
  };

  return (
    <div
      ref={triggerRef}
      className={cn(
        'flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
        'hover:bg-accent hover:text-accent-foreground',
        isOpen && 'bg-accent text-accent-foreground',
        className
      )}
      onMouseEnter={handleMouseEnter}
      // Stop propagation on mousedown to prevent the outside click handler from firing
      onMouseDown={persistOnItemClick ? (e) => e.stopPropagation() : undefined}
    >
      {children}
      <FiChevronRight className="ml-auto h-4 w-4" />
    </div>
  );
};

interface CustomDropdownSubContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CustomDropdownSubContent: React.FC<
  CustomDropdownSubContentProps
> = ({ children, className }) => {
  const { isOpen, position, contentRef } = React.useContext(SubMenuContext);
  const { persistOnItemClick, maxHeight = 300 } =
    React.useContext(DropdownContext);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        // Let the parent handle the close action
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, contentRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 51,
        overflowY: 'auto',
      }}
      className={cn(
        'bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 rounded-md border p-1 shadow-md bg-background text-foreground',
        'scrollbar-visible',
        className
      )}
      // Stop propagation on mousedown to prevent the outside click handler from firing
      onMouseDown={persistOnItemClick ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </div>,
    document.body
  );
};

// Export a function to access the dropdown closing function
export const useDropdownContext = () => React.useContext(DropdownContext);

export default CustomDropdown;
