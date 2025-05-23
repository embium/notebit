import React, { useCallback } from 'react';
import { FiSettings } from 'react-icons/fi';
import { FiMessageSquare, FiFileText } from 'react-icons/fi';
import { FiBookOpen } from 'react-icons/fi';
import { LuBrain } from 'react-icons/lu';
import { observer } from '@legendapp/state/react';

// Assets
import iconPng from '@assets/icons/icon.png';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// State
import { activeTab } from '@/features/notes/state/notesState';

// Components
import UpdateProgressIndicator from './UpdateProgressIndicator';

interface LeftSidebarProps {
  onSetActiveTab: (tab: string) => void;
  onSmartHubsPress: () => void;
  onPromptsLibraryPress: () => void;
  onSettingsPress: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = observer(
  ({
    onSetActiveTab,
    onSmartHubsPress,
    onPromptsLibraryPress,
    onSettingsPress,
  }) => {
    const handleSettingsPress = useCallback(() => {
      onSettingsPress();
    }, [onSettingsPress]);

    const handleSetChatsTab = useCallback(() => {
      onSetActiveTab('chats');
    }, [onSetActiveTab]);

    const handleSetNotesTab = useCallback(() => {
      onSetActiveTab('notes');
    }, [onSetActiveTab]);

    const handlePromptsLibraryPress = useCallback(() => {
      onPromptsLibraryPress();
    }, [onPromptsLibraryPress]);

    const handleSmartHubsPress = useCallback(() => {
      onSmartHubsPress();
    }, [onSmartHubsPress]);

    // Get active tab value from Legend State
    const activeTabValue = activeTab.get();

    return (
      <div className="flex flex-col h-full border-r ransition-all duration-200 ease-in-out w-[60px] items-center">
        <div className="flex flex-col h-[60px] border-b items-center justify-center">
          <img
            src={iconPng}
            alt="Notebit"
            className="h-8 w-8"
          />
        </div>

        {/* Top section with Chats and Notes buttons */}
        <div className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={handleSetChatsTab}
                    className={`${activeTabValue === 'chats' ? 'bg-muted' : ''}`}
                  >
                    <FiMessageSquare className="scale-125" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
              >
                <p>Chats</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={handleSetNotesTab}
                    className={`${activeTabValue === 'notes' ? 'bg-muted' : ''}`}
                  >
                    <FiFileText className="scale-125" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
              >
                <p>Notes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Bottom section with Settings button */}
        <div className="mt-auto mb-4">
          {/* Update Progress Indicator appears above Smart Hubs */}
          <UpdateProgressIndicator />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={handleSmartHubsPress}
                  >
                    <LuBrain className="scale-125" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
              >
                <p>Smart Hubs</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={handlePromptsLibraryPress}
                  >
                    <FiBookOpen className="scale-125" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
              >
                <p>Prompts Library</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={handleSettingsPress}
                  >
                    <FiSettings className="scale-125" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
              >
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }
);

export default LeftSidebar;
