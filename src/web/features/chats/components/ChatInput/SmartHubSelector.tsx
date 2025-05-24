import React, { useState, useEffect, useCallback } from 'react';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { IoMdFolder } from 'react-icons/io';
import { RiSearchLine } from 'react-icons/ri';
import { BookmarkIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomDropdown from '@/components/custom/CustomDropdown';
import CustomDropdownItem from '@/components/custom/CustomDropdownItem';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// State
import {
  getAllSmartHubs,
  smartHubsState$,
} from '@/features/smart-hubs/state/smartHubsState';
import {
  currentChatId,
  getSmartHubSearchParams,
  SimilarityThresholdLevel,
  updateSmartHubSearchParams,
} from '@/features/chats/state/chatsState';
import { useSmartHubKnowledgeGraph } from '../../hooks/useSmartHubKnowledgeGraph';

// State for selected smart hubs
export const selectedSmartHubsState$ = observable<Record<string, string[]>>({});

interface SmartHubSelectorProps {
  // Additional props can be added here if needed
}

const SmartHubSelectorComponent: React.FC<SmartHubSelectorProps> = () => {
  const smartHubs = getAllSmartHubs();
  const currentId = currentChatId.get();
  const searchParams = getSmartHubSearchParams(currentId);
  const [searchQuery, setSearchQuery] = useState('');

  // Track if knowledge graph is enabled
  const useKnowledgeGraph = smartHubsState$.useKnowledgeGraph.get();

  // Get current selected smart hubs for this chat
  const selectedSmartHubIds = currentId
    ? selectedSmartHubsState$[currentId].get() || []
    : [];

  // Toggle selection of a smart hub
  const toggleSmartHubSelection = (hubId: string) => {
    if (!currentId) {
      toast.error('No chat selected');
      return;
    }

    const currentSelection = [...selectedSmartHubIds];
    const index = currentSelection.indexOf(hubId);

    if (index === -1) {
      // Add hub to selection
      selectedSmartHubsState$[currentId].set([...currentSelection, hubId]);
    } else {
      // Remove hub from selection
      currentSelection.splice(index, 1);
      selectedSmartHubsState$[currentId].set(currentSelection);
    }
  };

  // Update similarity level
  const updateSimilarity = (value: SimilarityThresholdLevel) => {
    if (!currentId) return;
    updateSmartHubSearchParams({
      chatId: currentId,
      searchParams: {
        similarityThreshold: value,
        chunks: searchParams.chunks || 10,
      },
    });
  };

  // Update chunks count
  const updateChunks = (value: string) => {
    if (!currentId) return;

    // Allow empty string during editing (when backspacing)
    if (value === '') {
      // Just update the input value without updating state
      return;
    }

    const numValue = parseInt(value, 10);
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      // Constrain to min/max values
      const constrainedValue = Math.max(1, Math.min(50, numValue));

      updateSmartHubSearchParams({
        chatId: currentId,
        searchParams: {
          similarityThreshold: searchParams.similarityThreshold || 'medium',
          chunks: constrainedValue,
        },
      });
    }
  };

  // Sort smart hubs with bookmarked ones first, then alphabetically
  const sortedSmartHubs = [...smartHubs].sort((a, b) => {
    if (a.bookmarked && !b.bookmarked) return -1;
    if (!a.bookmarked && b.bookmarked) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter smart hubs based on search query
  const filteredSmartHubs = searchQuery
    ? sortedSmartHubs.filter((hub) =>
        hub.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedSmartHubs;

  // Only show ready smart hubs
  const readySmartHubs = filteredSmartHubs.filter(
    (hub) => hub.status === 'ready'
  );

  // Get count of selected smart hubs
  const selectedCount = selectedSmartHubIds.length;

  // Use the knowledge graph hook
  const { isKnowledgeGraphAvailable } = useSmartHubKnowledgeGraph();

  /**
   * Check if knowledge graph is available and enable it
   */
  const checkAndEnableKnowledgeGraph = useCallback(async () => {
    const available = await isKnowledgeGraphAvailable();
    smartHubsState$.useKnowledgeGraph.set(available);
    return available;
  }, [isKnowledgeGraphAvailable]);

  return (
    <>
      <CustomDropdown
        className="w-auto"
        persistOnItemClick={true}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 relative ${selectedCount > 0 ? 'text-primary' : ''}`}
            title="Smart Hubs"
            onClick={() => checkAndEnableKnowledgeGraph()}
          >
            <IoMdFolder className="h-4 w-4" />
            {selectedCount > 0 && (
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {selectedCount}
              </div>
            )}
          </Button>
        }
        contentClassName="w-64 flex flex-col"
      >
        <div className="sticky top-0 z-10 p-2 border-b border-border bg-background">
          <div className="relative">
            <RiSearchLine className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Search smart hubs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[300px]">
          {useKnowledgeGraph && (
            <div className="mx-2 my-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-md border border-green-200 dark:border-green-800 flex items-center justify-center font-medium">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500 mr-1.5" />
              Knowledge Graph Connected
            </div>
          )}
          {!readySmartHubs || readySmartHubs.length === 0 ? (
            <div className={`flex w-full items-center gap-2 pl-2 pr-2 py-1`}>
              <CustomDropdownItem disabled>
                {smartHubs.length === 0
                  ? 'No smart hubs available'
                  : searchQuery
                    ? 'No matching smart hubs'
                    : 'No ready smart hubs available'}
              </CustomDropdownItem>
            </div>
          ) : (
            readySmartHubs.map((hub) => {
              const isSelected = selectedSmartHubIds.includes(hub.id);
              return (
                <CustomDropdownItem
                  key={hub.id}
                  keepOpen={true}
                >
                  <div
                    className={`flex w-full items-center gap-2 pl-2 pr-2 py-1`}
                    onClick={() => toggleSmartHubSelection(hub.id)}
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                    <div className="flex-grow truncate">{hub.name}</div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                    {hub.bookmarked && (
                      <BookmarkIcon className="h-4 w-4 flex-shrink-0 fill-primary text-primary" />
                    )}
                  </div>
                </CustomDropdownItem>
              );
            })
          )}
        </div>

        {/* Search parameters section */}
        <div className="sticky bottom-0 border-t border-border p-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor="similarity"
                className="text-sm text-muted-foreground mb-1 block"
              >
                Similarity
              </Label>
              <div className="h-8 relative">
                <Select
                  value={searchParams.similarityThreshold || 'medium'}
                  onValueChange={(value) =>
                    updateSimilarity(value as SimilarityThresholdLevel)
                  }
                  disabled={selectedCount === 0}
                >
                  <SelectTrigger
                    id="similarity"
                    className="absolute inset-0 h-8 min-h-0 !w-full text-sm py-0 px-2 whitespace-nowrap border-input"
                  >
                    <SelectValue placeholder="Medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="highest">Highest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label
                htmlFor="chunks"
                className="text-sm text-muted-foreground mb-1 block"
              >
                # of Chunks
              </Label>
              <Input
                id="chunks"
                type="number"
                className="h-9 min-h-0 w-full text-sm py-0 px-2"
                defaultValue={searchParams.chunks || 10}
                onChange={(e) => updateChunks(e.target.value)}
                onBlur={(e) => {
                  // When input loses focus, ensure a valid value
                  if (
                    e.target.value === '' ||
                    isNaN(parseInt(e.target.value, 10))
                  ) {
                    updateSmartHubSearchParams({
                      chatId: currentId,
                      searchParams: {
                        similarityThreshold:
                          searchParams.similarityThreshold || 'medium',
                        chunks: 10, // Default to 10 if invalid
                      },
                    });
                  }
                }}
                min={1}
                max={50}
                disabled={selectedCount === 0}
              />
            </div>
          </div>
        </div>
      </CustomDropdown>
    </>
  );
};

// Export the component wrapped with observer to make it reactive
export const SmartHubSelector = observer(SmartHubSelectorComponent);
