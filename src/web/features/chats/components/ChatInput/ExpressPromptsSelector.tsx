import React, { useState } from 'react';
import { RiChatSmileAiLine } from 'react-icons/ri';
import { RiSearchLine } from 'react-icons/ri';
import { BookmarkIcon } from 'lucide-react';
import { observer } from '@legendapp/state/react';

import { Button } from '@src/web/components/ui/button';
import CustomDropdown from '@src/web/components/custom/CustomDropdown';
import CustomDropdownItem from '@src/web/components/custom/CustomDropdownItem';
import { Input } from '@src/web/components/ui/input';

// State
import { promptsLibraryState$ } from '@src/web/features/prompts-library/state/promptsLibraryState';

// Types
import { Prompt } from '@src/shared/types/promptsLibrary';

interface ExpressPromptsSelectorProps {
  onSelectPrompt: (prompt: Prompt) => void;
}

const ExpressPromptsSelectorComponent: React.FC<
  ExpressPromptsSelectorProps
> = ({ onSelectPrompt }) => {
  const prompts = promptsLibraryState$.prompts.get();
  const [searchQuery, setSearchQuery] = useState('');

  // Sort prompts with bookmarked ones first, then alphabetically
  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.bookmarked && !b.bookmarked) return -1;
    if (!a.bookmarked && b.bookmarked) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter prompts based on search query
  const filteredPrompts = searchQuery
    ? sortedPrompts.filter((prompt: Prompt) => {
        // Check if it's a tag search
        if (searchQuery.toLowerCase().startsWith('tags:')) {
          const tagQuery = searchQuery.slice(5).trim();
          if (!tagQuery) return true; // Empty tag query returns all prompts

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
          const hasMatchingTag = prompt.tags.some((tag) =>
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

          return hasMatchingTag && matchesText;
        } else {
          // Regular name search
          return prompt.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
      })
    : sortedPrompts;

  return (
    <CustomDropdown
      className="w-auto"
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Express Prompts"
        >
          <RiChatSmileAiLine className="h-4 w-4" />
        </Button>
      }
      contentClassName="w-auto flex flex-col"
    >
      <div className="sticky top-0 z-10 p-2 border-b border-border bg-background">
        <div className="relative">
          <RiSearchLine className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search or 'tags:keyword'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-[300px]">
        {!filteredPrompts || filteredPrompts.length === 0 ? (
          <CustomDropdownItem disabled>
            {prompts.length === 0
              ? 'No prompts available'
              : 'No matching prompts'}
          </CustomDropdownItem>
        ) : (
          filteredPrompts.map((prompt) => (
            <CustomDropdownItem key={prompt.id}>
              <div
                className="flex w-full items-center gap-2 pl-4 pr-2"
                onClick={() => onSelectPrompt(prompt)}
              >
                <div
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    prompt.role === 'system' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                />
                <div className="flex-grow truncate">{prompt.name}</div>
                {prompt.bookmarked && (
                  <BookmarkIcon className="h-4 w-4 flex-shrink-0 fill-primary text-primary" />
                )}
              </div>
            </CustomDropdownItem>
          ))
        )}
      </div>
    </CustomDropdown>
  );
};

export const ExpressPromptsSelector = observer(ExpressPromptsSelectorComponent);
