/**
 * PromptsLibraryModal component
 *
 * Renders a modal dialog with prompts library
 */
import React, { useState, useCallback, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { Plus, Search, BookmarkIcon } from 'lucide-react';

// UI Components
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// State
import {
  deletePrompt,
  promptsLibraryState$,
  toggleBookmark,
} from '@/features/prompts-library/state/promptsLibraryState';

// Components
import { PromptsLibraryScreen } from '@/features/prompts-library/screens/PromptsLibraryScreen';

// Sub-Components
import { AddEditPromptForm } from './AddEditPromptForm';

// Utils
import { cn } from '@/shared/utils';

// Types

import { Prompt } from '@shared/types/promptsLibrary';
/**
 * Props for the PromptsLibraryModal component
 */
interface PromptsLibraryModalProps {
  visible: boolean;
  onClose: () => void;
}

type Category = 'all' | 'system' | 'user' | 'refine';

/**
 * Modal component displaying prompts library
 */
const PromptsLibraryModalComponent: React.FC<PromptsLibraryModalProps> =
  observer(({ visible, onClose }) => {
    const prompts = promptsLibraryState$.prompts.get();
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [search, setSearch] = useState('');
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [promptToEdit, setPromptToEdit] = useState<Prompt | undefined>(
      undefined
    );
    const [activeCategory, setActiveCategory] = useState<Category>('all');

    // Make sure selectedPrompt is always valid
    useEffect(() => {
      if (selectedPrompt && !prompts.some((p) => p.id === selectedPrompt.id)) {
        setSelectedPrompt(null);
      }
    }, [prompts, selectedPrompt]);

    // Filter prompts based on search and category
    const filteredPrompts = prompts
      .filter((prompt) => {
        // First filter by search term
        let matchesSearch = true;

        if (search.trim()) {
          // Check if it's a tag search with tags: prefix
          if (search.toLowerCase().startsWith('tags:')) {
            const tagQuery = search.slice(5).trim();
            if (tagQuery) {
              const tagParts = tagQuery
                .split(',')
                .map((tag) => tag.trim().toLowerCase());

              // Split into tag search and text search parts
              const tagSearchParts: string[] = [];
              const textSearchPart: string[] = [];

              tagParts.forEach((part) => {
                if (part.includes(':')) {
                  const [prefix, value] = part.split(':');
                  if (prefix.trim() === 'tags') {
                    tagSearchParts.push(value.trim());
                  } else {
                    textSearchPart.push(part);
                  }
                } else {
                  tagSearchParts.push(part);
                }
              });

              // Match any of the specified tags
              const hasMatchingTag =
                tagSearchParts.length === 0 ||
                prompt.tags.some((tag) =>
                  tagSearchParts.some((searchTag) =>
                    tag.toLowerCase().includes(searchTag)
                  )
                );

              // If there's a text part, the name must also match it
              const matchesText =
                textSearchPart.length === 0 ||
                textSearchPart.every((text) =>
                  prompt.name.toLowerCase().includes(text.toLowerCase())
                );

              matchesSearch = hasMatchingTag && matchesText;
            }
          } else {
            // Regular search
            matchesSearch =
              prompt.name.toLowerCase().includes(search.toLowerCase()) ||
              prompt.tags.some((tag) =>
                tag.toLowerCase().includes(search.toLowerCase())
              );
          }
        }

        // Then filter by category
        const matchesCategory =
          activeCategory === 'all'
            ? true
            : activeCategory === 'system'
              ? prompt.role === 'system'
              : activeCategory === 'user'
                ? prompt.role === 'user'
                : activeCategory === 'refine'
                  ? prompt.tags.includes('refine')
                  : true;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        // Sort bookmarked prompts first
        if (a.bookmarked && !b.bookmarked) return -1;
        if (!a.bookmarked && b.bookmarked) return 1;
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

    // Handle adding a new prompt
    const handleAddPrompt = useCallback(() => {
      setPromptToEdit(undefined);
      setIsAddEditModalOpen(true);
    }, []);

    // Handle editing a prompt
    const handleEditPrompt = useCallback((prompt: Prompt) => {
      setPromptToEdit(prompt);
      setIsAddEditModalOpen(true);
    }, []);

    // Handle deleting a prompt
    const handleDeletePrompt = useCallback(
      (promptId: string) => {
        if (selectedPrompt && selectedPrompt.id === promptId) {
          setSelectedPrompt(null);
          deletePrompt(promptId);
        }
      },
      [selectedPrompt]
    );

    // Toggle bookmark for a prompt
    const handleToggleBookmark = useCallback((promptId: string) => {
      toggleBookmark(promptId);
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
                <h2 className="text-xl font-bold mb-4">Prompts Library</h2>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search or 'tags:code,help'"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      activeCategory === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                    onClick={() => setActiveCategory('all')}
                  >
                    All
                  </button>
                  <button
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                      activeCategory === 'system'
                        ? 'bg-rose-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                    onClick={() => setActiveCategory('system')}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    System
                  </button>
                  <button
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                      activeCategory === 'user'
                        ? 'bg-sky-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                    onClick={() => setActiveCategory('user')}
                  >
                    <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                    User
                  </button>
                </div>
              </div>

              {/* Prompts List */}
              <div className="flex-1 overflow-y-auto">
                {filteredPrompts.length > 0 ? (
                  <div className="flex flex-col">
                    {filteredPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={cn(
                          'p-3 border-b border-border hover:bg-muted/60 cursor-pointer flex items-start',
                          selectedPrompt?.id === prompt.id ? 'bg-muted' : ''
                        )}
                        onClick={() => setSelectedPrompt(prompt)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full flex-shrink-0',
                                prompt.role === 'system'
                                  ? 'bg-rose-500'
                                  : 'bg-sky-500'
                              )}
                            ></span>
                            <h3 className="font-medium truncate">
                              {prompt.name}
                            </h3>
                          </div>
                          {prompt.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prompt.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          className="ml-2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleBookmark(prompt.id)}
                        >
                          <BookmarkIcon
                            className={cn(
                              'h-4 w-4',
                              prompt.bookmarked
                                ? 'fill-primary text-primary'
                                : 'fill-none'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                    <p>
                      {search ? 'No prompts found' : 'No prompts added yet'}
                    </p>
                  </div>
                )}
              </div>

              {/* Add Prompt Button */}
              <div className="p-3 border-t border-border">
                <Button
                  onClick={handleAddPrompt}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Prompt
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <PromptsLibraryScreen
                promptId={selectedPrompt?.id ?? null}
                onEditPrompt={handleEditPrompt}
                onDeletePrompt={handleDeletePrompt}
              />
            </div>
          </div>
        </Modal>

        <AddEditPromptForm
          open={isAddEditModalOpen}
          onOpenChange={setIsAddEditModalOpen}
          prompt={promptToEdit}
        />
      </>
    );
  });

export const PromptsLibraryModal = observer(PromptsLibraryModalComponent);
