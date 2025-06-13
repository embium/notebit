/**
 * SettingsModal component
 *
 * Renders a modal dialog with application settings
 */
import React, { useState, useCallback } from 'react';
import { FiSettings } from 'react-icons/fi';
import { FaMicrochip } from 'react-icons/fa';
import { FaRobot } from 'react-icons/fa';
import { MdMessage } from 'react-icons/md';

// Utils
import { cn } from '@src/renderer/utils';

// UI Components
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

// Sections
import GeneralSettings from '@/features/settings/sections/GeneralSettings';
import { AIProviderSettings } from '@/features/settings/sections/AIProviderSettings';
import { DefaultPromptsSettings } from '@/features/settings/sections/DefaultPromptsSettings';
import { AIMemorySettings } from '@/features/settings/sections/AIMemorySettings';

/**
 * Props for the SettingsModal component
 */
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Available settings sections in the sidebar
 */
type SettingsSectionType =
  | 'General'
  | 'AI Models'
  | 'AI Memory'
  | 'Default Prompts';

/**
 * Modal component displaying application settings
 */
const SettingsModal: React.FC<SettingsModalProps> = React.memo(
  ({ visible, onClose }) => {
    const [activeSection, setActiveSection] =
      useState<SettingsSectionType>('General');

    // Memoize active section change handler - must be defined before any conditional returns
    const handleSectionChange = useCallback((section: SettingsSectionType) => {
      setActiveSection(section);
    }, []);

    /**
     * Renders a sidebar navigation item
     *
     * @param section - The section name to render
     * @param icon - React icon component to render
     * @returns JSX element for the sidebar item
     */
    const renderSidebarItem = (
      section: SettingsSectionType,
      icon: React.ReactNode
    ) => {
      const isActive = activeSection === section;
      return (
        <Button
          key={section}
          onClick={() => handleSectionChange(section)}
          className={cn(
            'flex items-center w-full px-4 py-3 text-left',
            'hover:bg-muted/50 dark:hover:bg-muted/20',
            'rounded-md transition-colors duration-150 border-0',
            isActive
              ? 'bg-muted dark:bg-muted/30 text-accent-foreground'
              : 'text-foreground'
          )}
          variant="ghost"
        >
          <div className="flex items-center gap-3 w-full">
            <span
              className={cn(
                isActive ? 'text-accent-foreground' : 'text-muted-foreground'
              )}
            >
              {icon}
            </span>
            <span className="text-lg font-medium">{section}</span>
          </div>
        </Button>
      );
    };

    // Render the footer content
    const renderFooter = useCallback(() => {
      return (
        <div className="p-3 mt-auto text-center border-t border-border">
          <span className="text-xs text-muted-foreground opacity-70">
            NoteBit v1.0.0
          </span>
        </div>
      );
    }, []);

    return (
      <Modal
        visible={visible}
        onClose={onClose}
        width="70vw"
        height="70vh"
        maxWidth="1200px"
        maxHeight="800px"
        showCloseButton
      >
        <div className="flex flex-row rounded-lg overflow-hidden w-full h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-border p-4 flex flex-col">
            <h3 className="mb-4 px-2 text-lg font-semibold text-foreground">
              Settings
            </h3>
            <nav className="flex flex-col gap-1">
              {renderSidebarItem('General', <FiSettings size={18} />)}
              {renderSidebarItem('AI Models', <FaMicrochip size={18} />)}
              {renderSidebarItem('AI Memory', <FaRobot size={18} />)}
              {renderSidebarItem('Default Prompts', <MdMessage size={18} />)}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {activeSection}
              </h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto scrollbar-visible">
              {activeSection === 'General' && <GeneralSettings />}
              {activeSection === 'AI Models' && <AIProviderSettings />}
              {activeSection === 'AI Memory' && <AIMemorySettings />}
              {activeSection === 'Default Prompts' && (
                <DefaultPromptsSettings />
              )}
            </div>

            {renderFooter()}
          </div>
        </div>
      </Modal>
    );
  }
);

export default SettingsModal;
