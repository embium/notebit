import { createLazyFileRoute } from '@tanstack/react-router';
import LeftSidebar from '@/features/layout/components/LeftSidebar';
import MiddleSidebar from '@/features/layout/components/MiddleSidebar';
import SettingsModal from '@/features/settings/components/SettingsModal';
import { useState, useCallback } from 'react';
import { ChatScreen } from '@/features/chats/screens/ChatScreen';
import { NoteScreen } from '@/features/notes/screens/NoteScreen';
import { middleSidebarWidth } from '@/features/settings/state/layoutSettingsState';
import { observer } from '@legendapp/state/react';
import { PromptsLibraryModal } from '@/features/prompts-library/components/PromptsLibraryModal';
import { SmartHubsModal } from '@/features/smart-hubs/components/SmartHubsModal';

// Define the Index component first
const Index = observer(function Index() {
  const [activeTab, setActiveTab] = useState('chats');
  const [isMiddleSidebarCollapsed, setIsMiddleSidebarCollapsed] =
    useState(false);
  const [promptsLibraryModalVisible, setPromptsLibraryModalVisible] =
    useState(false);
  const [smartHubsModalVisible, setSmartHubsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Get the current sidebar width from Legend State
  const sidebarWidth = middleSidebarWidth.get();

  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleToggleMiddleSidebar = useCallback(() => {
    setIsMiddleSidebarCollapsed((prev) => !prev);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setSettingsModalVisible(false);
  }, []);

  const handlePromptsLibraryOpen = useCallback(() => {
    setPromptsLibraryModalVisible(true);
  }, []);

  const handlePromptsLibraryClose = useCallback(() => {
    setPromptsLibraryModalVisible(false);
  }, []);

  const handleSmartHubsOpen = useCallback(() => {
    setSmartHubsModalVisible(true);
  }, []);

  const handleSmartHubsClose = useCallback(() => {
    setSmartHubsModalVisible(false);
  }, []);

  return (
    <div className="flex w-full h-full">
      {/* Left Sidebar - fixed width */}
      <div className="flex-shrink-0">
        <LeftSidebar
          onSettingsPress={handleSettingsOpen}
          onPromptsLibraryPress={handlePromptsLibraryOpen}
          onSmartHubsPress={handleSmartHubsOpen}
          onSetActiveTab={handleSetActiveTab}
        />
      </div>

      {/* Middle Sidebar with CSS transition for better performance */}
      <div
        className="transition-all duration-300 ease-in-out flex-shrink-0 h-full resizing-container"
        style={{
          width: isMiddleSidebarCollapsed ? '0' : `${sidebarWidth}px`,
          opacity: isMiddleSidebarCollapsed ? 0 : 1,
          overflow: 'visible',
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${sidebarWidth}px`,
            minWidth: `${sidebarWidth}px`,
            visibility: isMiddleSidebarCollapsed ? 'hidden' : 'visible',
            height: '100%',
            minHeight: '100%',
            transition: 'none', // Disable transition for direct DOM manipulation
          }}
        >
          <MiddleSidebar
            activeTab={activeTab}
            onToggleMiddleSidebar={handleToggleMiddleSidebar}
          />
        </div>
      </div>

      {/* Main Content Area - Chat Interface - will expand to fill available space */}
      <div className="flex-1 flex h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out">
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
          {activeTab === 'chats' ? (
            <ChatScreen
              isMiddlebarCollapsed={isMiddleSidebarCollapsed}
              onToggleMiddleSidebar={handleToggleMiddleSidebar}
            />
          ) : (
            <NoteScreen
              isMiddlebarCollapsed={isMiddleSidebarCollapsed}
              onToggleMiddleSidebar={handleToggleMiddleSidebar}
              onSetActiveTab={handleSetActiveTab}
            />
          )}
        </div>
      </div>

      {smartHubsModalVisible && (
        <SmartHubsModal
          visible={smartHubsModalVisible}
          onClose={handleSmartHubsClose}
        />
      )}
      {settingsModalVisible && (
        <SettingsModal
          visible={settingsModalVisible}
          onClose={handleSettingsClose}
        />
      )}
      {promptsLibraryModalVisible && (
        <PromptsLibraryModal
          visible={promptsLibraryModalVisible}
          onClose={handlePromptsLibraryClose}
        />
      )}
    </div>
  );
});

// Then use it in the route
export const Route = createLazyFileRoute('/')({
  component: Index,
});
