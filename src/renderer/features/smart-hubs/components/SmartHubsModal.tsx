/**
 * SmartHubsModal component
 *
 * Renders a modal dialog with Smart Hubs
 */
import React, { useState, useCallback, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { Plus, Search, BookmarkIcon } from 'lucide-react';

// UI Components
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Components
import { AddSmartHubForm } from './AddSmartHubForm';

// State
import {
  deleteSmartHub,
  smartHubsState$,
  toggleBookmark,
} from '../state/smartHubsState';
import { currentEmbeddingModelDetails } from '../../settings/state/aiSettings/aiMemorySettings';

// Screens
import { SmartHubsScreen } from '../screens/SmartHubsScreen';

// Utils
import { cn } from '@src/renderer/utils';

// Types
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SmartHub } from '@src/types/smartHubs';

/**
 * Props for the SmartHubsModal component
 */
interface SmartHubsModalProps {
  visible: boolean;
  onClose: () => void;
}

type Category = 'all' | 'ready' | 'composing' | 'draft' | 'error';

/**
 * Modal component displaying Smart Hubs
 */
const SmartHubsModalComponent: React.FC<SmartHubsModalProps> = ({
  visible,
  onClose,
}) => {
  const smartHubs = smartHubsState$.smartHubs.get();
  const [selectedSmartHub, setSelectedSmartHub] = useState<SmartHub | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [smartHubToEdit, setSmartHubToEdit] = useState<SmartHub | undefined>(
    undefined
  );
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const currentModel = currentEmbeddingModelDetails.get();

  // Make sure selectedSmartHub is always valid
  useEffect(() => {
    if (
      selectedSmartHub &&
      !smartHubs.some((p) => p.id === selectedSmartHub.id)
    ) {
      setSelectedSmartHub(null);
    }
  }, [smartHubs, selectedSmartHub]);

  // Filter smartHubs based on search and category
  const filteredSmartHubs = smartHubs
    .filter((smartHub) => {
      // Filter by search term
      const matchesSearch =
        search.trim() === ''
          ? true
          : smartHub.name.toLowerCase().includes(search.toLowerCase());

      // Filter by category
      const matchesCategory =
        activeCategory === 'all' ? true : smartHub.status === activeCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Sort bookmarked first
      if (a.bookmarked && !b.bookmarked) return -1;
      if (!a.bookmarked && b.bookmarked) return 1;
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  // Handle adding a new smartHub
  const handleAddSmartHub = useCallback(() => {
    setSmartHubToEdit(undefined);
    setIsAddEditModalOpen(true);
  }, []);

  // Handle editing a smartHub
  const handleEditSmartHub = useCallback((smartHub: SmartHub) => {
    setSmartHubToEdit(smartHub);
    setIsAddEditModalOpen(true);
  }, []);

  // Handle deleting a smartHub
  const handleDeleteSmartHub = useCallback(
    (smartHubId: string) => {
      deleteSmartHub(smartHubId);
      if (selectedSmartHub && selectedSmartHub.id === smartHubId) {
        setSelectedSmartHub(null);
      }
    },
    [selectedSmartHub]
  );

  // Toggle bookmark for a smartHub
  const handleToggleBookmark = useCallback((smartHubId: string) => {
    toggleBookmark(smartHubId);
  }, []);

  return (
    <>
      <Modal
        visible={visible}
        onClose={onClose}
        width="70vw"
        height="70vh"
        maxWidth="1200px"
        maxHeight="800px"
        showCloseButton
      >
        <div className="flex flex-row h-full bg-background text-foreground">
          {/* Left Sidebar */}
          <div className="w-[380px] border-r border-border flex flex-col bg-muted/40">
            <div className="p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4">Smart Hubs</h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    activeCategory === 'all'
                      ? 'bg-gray-600 text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => setActiveCategory('all')}
                >
                  All
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                    activeCategory === 'ready'
                      ? 'bg-gray-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => setActiveCategory('ready')}
                >
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Ready
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                    activeCategory === 'composing'
                      ? 'bg-gray-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => setActiveCategory('composing')}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Composing
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                    activeCategory === 'draft'
                      ? 'bg-gray-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => setActiveCategory('draft')}
                >
                  <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                  Draft
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                    activeCategory === 'error'
                      ? 'bg-gray-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => setActiveCategory('error')}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Error
                </button>
              </div>
            </div>

            {/* SmartHubs List */}
            <div className="flex-1 overflow-y-auto">
              {currentModel === null && (
                <Alert className="border-0 rounded-none text-amber-700 bg-muted">
                  <AlertTitle>Setup Needed</AlertTitle>
                  <AlertDescription>
                    Smart Hubs require an embedding model to process
                    information. Please choose one in AI Memory Settings before
                    proceeding.
                  </AlertDescription>
                </Alert>
              )}
              {filteredSmartHubs.length > 0 ? (
                <div className="flex flex-col">
                  {filteredSmartHubs.map((smartHub) => (
                    <div
                      key={smartHub.id}
                      className={cn(
                        'p-3 border-b border-border hover:bg-muted/60 cursor-pointer flex items-start',
                        selectedSmartHub?.id === smartHub.id ? 'bg-muted' : ''
                      )}
                      onClick={() => setSelectedSmartHub(smartHub)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full flex-shrink-0',
                              smartHub.status === 'ready'
                                ? 'bg-green-500'
                                : smartHub.status === 'error'
                                  ? 'bg-rose-500'
                                  : smartHub.status === 'composing'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-500'
                            )}
                          />
                          <span className="font-medium truncate">
                            {smartHub.name}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center">
                          <span>
                            {smartHub.files.length} files,{' '}
                            {smartHub.folders.length} folders,{' '}
                            {smartHub.notes.length} notes
                          </span>
                        </div>
                      </div>
                      <button
                        className="p-1 rounded-sm hover:bg-muted-foreground/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(smartHub.id);
                        }}
                      >
                        <BookmarkIcon
                          className={cn(
                            'h-4 w-4',
                            smartHub.bookmarked
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                  <p>No Smart Hubs found</p>
                  {search && (
                    <p className="text-xs mt-1">
                      Try a different search or category
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Add New Smart Hub Button - Now positioned at the bottom */}
            <div className="p-3 border-t border-border">
              <Button
                size="sm"
                onClick={handleAddSmartHub}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Smart Hub
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {selectedSmartHub ? (
              <SmartHubsScreen
                smartHubId={selectedSmartHub.id}
                onEdit={handleEditSmartHub}
                onDelete={handleDeleteSmartHub}
              />
            ) : (
              <div className="flex flex-col h-full justify-center items-center p-8 text-center">
                <div className="text-muted-foreground">
                  <div className="text-xl mb-2">No Smart Hub selected</div>
                  <p>Select a Smart Hub from the list or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add/Edit Smart Hub Modal */}
      {isAddEditModalOpen && (
        <AddSmartHubForm
          open={isAddEditModalOpen}
          onOpenChange={setIsAddEditModalOpen}
          smartHub={smartHubToEdit}
        />
      )}
    </>
  );
};

export const SmartHubsModal = observer(SmartHubsModalComponent);
