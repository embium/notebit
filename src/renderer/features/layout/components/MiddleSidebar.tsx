import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GoSidebarExpand } from 'react-icons/go';
import { observer } from '@legendapp/state/react';

// Components
import {
  NoteTab,
  NoteTabHeader,
} from '@/features/notes/components/sidebar/NoteTab';
import { ChatTab, ChatTabHeader } from '@/features/chats/components/ChatTab';

// State
import { setActiveTab } from '@/features/notes/state/notesState';
import {
  middleSidebarWidth,
  setMiddleSidebarWidth,
} from '@/features/settings/state/layoutSettingsState';
import { handleTabChange } from '@/features/notes/state/searchState';

interface MiddleSidebarProps {
  activeTab: string;
  onToggleMiddleSidebar: () => void;
}

const MiddleSidebar: React.FC<MiddleSidebarProps> = observer(
  ({ activeTab, onToggleMiddleSidebar }) => {
    // Set the active tab in the notes state when it changes
    useEffect(() => {
      if (activeTab === 'notes' || activeTab === 'chats') {
        setActiveTab(activeTab as 'notes' | 'chats');

        // Call the handleTabChange function to update search state
        handleTabChange(activeTab);
      }
    }, [activeTab]);

    // Use Legend State for sidebar width
    const sidebarWidthValue = middleSidebarWidth.get();
    const isResizing = useRef(false);
    const [isAnimating, setIsAnimating] = useState(true);
    const sidebarRef = useRef<HTMLDivElement>(null);
    // Enable animations when component mounts
    useEffect(() => {
      setIsAnimating(true);

      // Update the container to match the sidebar width initially
      const sidebarElement = document.querySelector(
        '.border-r.bg-card.relative'
      ) as HTMLElement;
      const resizingContainer = sidebarElement?.closest(
        '.resizing-container'
      ) as HTMLElement;

      if (sidebarElement && resizingContainer) {
        resizingContainer.style.width = `${sidebarWidthValue}px`;
      }

      return () => {
        setIsAnimating(false);

        // Clean up any residual resize events
        if (isResizing.current) {
          isResizing.current = false;
          document.body.style.cursor = '';
        }
      };
    }, [sidebarWidthValue]);

    // Mouse event handlers for resizing
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent text selection during resize
        e.preventDefault();

        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
        const startX = e.clientX;
        const startWidth = sidebarWidthValue;

        // Disable animations during resize for better performance
        setIsAnimating(false);

        // Use a reference for the current width to avoid stale values
        const currentWidth = { value: startWidth };

        // Get the sidebar element and parent container
        const sidebarElement = e.currentTarget.parentElement;
        const resizingContainer = sidebarElement?.closest(
          '.resizing-container'
        ) as HTMLElement;

        // Use RAF for smoother animation
        let rafId: number | null = null;

        // Create a more efficient move handler
        const onMouseMove = (moveEvent: MouseEvent) => {
          if (!isResizing.current) return;

          // Cancel any pending animation frame
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }

          // Schedule update on next animation frame for better performance
          rafId = requestAnimationFrame(() => {
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(180, Math.min(startWidth + delta, 1200));

            // Only update DOM if the width has changed significantly
            if (Math.abs(newWidth - currentWidth.value) >= 1) {
              currentWidth.value = newWidth;

              // Update both the container and sidebar
              if (sidebarElement) {
                sidebarElement.style.width = `${newWidth}px`;
                sidebarElement.style.minWidth = `${newWidth}px`;
              }

              // Update parent container width
              if (resizingContainer) {
                resizingContainer.style.width = `${newWidth}px`;
              }
            }
          });
        };

        const onMouseUp = () => {
          isResizing.current = false;
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          // Cancel any pending animation frame
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }

          // Update the state after resize is complete
          setMiddleSidebarWidth(currentWidth.value);

          // Re-enable animations after resize completes
          setTimeout(() => setIsAnimating(true), 100);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      },
      [sidebarWidthValue]
    );

    // Memoize sidebar content based on active tab to avoid unnecessary renders
    const sidebarContent = React.useMemo(() => {
      return activeTab === 'notes' ? <NoteTab /> : <ChatTab />;
    }, [activeTab]);

    // Memoize the header content
    const headerContent = React.useMemo(() => {
      return activeTab === 'notes' ? <NoteTabHeader /> : <ChatTabHeader />;
    }, [activeTab]);

    return (
      <div
        className="flex flex-col h-full overflow-hidden border-r bg-card relative"
        ref={sidebarRef}
        style={{
          transition: isAnimating ? 'all 300ms ease-in-out' : 'none',
          width: `${sidebarWidthValue}px`,
          minWidth: `${sidebarWidthValue}px`,
        }}
      >
        <div className="h-[60px] flex items-center justify-between px-3 border-b">
          <div className="flex items-center">
            <button
              onClick={onToggleMiddleSidebar}
              className="mr-2 b-0 bg-transparent border-none shadow-none hover:bg-accent"
            >
              <GoSidebarExpand
                size={20}
                className="text-lg"
              />
            </button>
            <span className="flex-1 font-medium text-lg">
              {activeTab === 'chats' ? 'Chats' : 'Notes'}
            </span>
          </div>

          {/* Add button - use the appropriate header component */}
          {headerContent}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-visible pr-3 h-full min-h-0">
          {/* Render the appropriate content component */}
          <div className="h-full flex flex-col">{sidebarContent}</div>
        </div>
        {/* Draggable resizer */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 h-full w-3 cursor-ew-resize z-10 bg-transparent hover:bg-accent/40 transition-colors"
          style={{ userSelect: 'none' }}
          aria-label="Resize sidebar"
          role="separator"
        />
      </div>
    );
  }
);

export default MiddleSidebar;
