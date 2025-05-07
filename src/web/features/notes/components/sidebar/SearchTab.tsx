import React, { useCallback, useState, useRef, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import {
  FiSearch,
  FiX,
  FiArrowLeft,
  FiRefreshCw,
  FiInfo,
} from 'react-icons/fi';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Highlight } from '@/components/ui/highlight';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Utils
import { generateEmbedding } from '@src/web/shared/ai/embeddingUtils';

// State
import {
  searchState$,
  searchNotes,
  setSearchQuery,
  clearSearchResults,
  setSearchMode,
  SearchMode,
  setSearchResultLimit,
} from '@/features/notes/state/searchState';
import { openNote } from '@src/web/features/notes/state/notesState';
import { currentEmbeddingModelDetails } from '@src/web/features/settings/state/aiSettings/aiMemorySettings';

/**
 * Search result item component
 */
const SearchResultItem: React.FC<{
  id: string;
  title: string;
  path: string;
  preview?: string;
  searchQuery: string;
  score: number;
  onClick: () => void;
}> = ({ title, preview, searchQuery, onClick, score }) => {
  return (
    <div
      className="p-3 mb-2 rounded-md cursor-pointer bg-card hover:bg-accent"
      onClick={onClick}
    >
      <div className="flex justify-between mb-1">
        <h3 className="font-medium">
          <Highlight
            text={title}
            highlight={searchQuery}
          />
        </h3>
        <span className="text-xs text-muted-foreground">
          {score ? `Score: ${score.toFixed(2)}` : ''}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        <Highlight
          text={preview || 'No preview available'}
          highlight={searchQuery}
        />
      </p>
    </div>
  );
};

/**
 * Search tab component
 */
const SearchTabComponent: React.FC = () => {
  const query = searchState$.query.get();
  const results = searchState$.results.get();
  const isSearching = searchState$.isSearching.get();
  const searchMode = searchState$.searchMode.get();
  const searchResultLimit = searchState$.searchResultLimit.get();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentEmbeddingModel = currentEmbeddingModelDetails.get();
  const hasEmbeddingModel = !!currentEmbeddingModel?.id;

  // Force keyword search when no embedding model is available
  useEffect(() => {
    if (
      !hasEmbeddingModel &&
      (searchMode === 'semantic' || searchMode === 'hybrid')
    ) {
      setSearchMode('keyword');
    }
  }, [hasEmbeddingModel, searchMode]);

  // Focus the input on component mount
  useEffect(() => {
    console.log('SearchTab mounted, focusing input');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  }, []);

  // Remove the automatic search effect
  // We'll now rely on explicit user triggering via button or Enter key

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    clearSearchResults();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleOpenNote = useCallback((path: string) => {
    openNote(path);
  }, []);

  const handleSearchModeChange = useCallback(
    (mode: string) => {
      // Set search mode if embedding model is available or if it's keyword search
      if (hasEmbeddingModel || mode === 'keyword') {
        setSearchMode(mode as SearchMode);
        // If we have an active search, refresh with the new mode
        if (query.trim()) {
          handleRefreshSearch();
        }
      }
    },
    [hasEmbeddingModel, query]
  );

  // Create a direct click handler for disabled tabs
  const handleDisabledTabClick = useCallback(() => {
    toast.warning(
      <div className="flex flex-col gap-1">
        <div className="font-medium flex items-center">
          <FiInfo className="mr-2" /> Embedding Model Required
        </div>
        <p className="text-sm">
          Semantic and hybrid search require an AI embedding model.
        </p>
        <p className="text-xs mt-1">
          Go to Settings &gt; AI Memory to configure one.
        </p>
      </div>,
      {
        duration: 5000,
        position: 'top-center',
        icon: null,
      }
    );
  }, []);

  const handleRefreshSearch = useCallback(() => {
    if (query.trim()) {
      searchState$.isSearching.set(true);
      generateEmbedding(query)
        .then((embedding) => {
          if (embedding) {
            searchNotes(query, embedding);
          } else {
            // Fall back to keyword search if embedding generation fails
            searchNotes(query, []);
          }
        })
        .catch((error) => {
          console.error('Error generating embedding:', error);
          // Fall back to keyword search on error
          searchNotes(query, []);
        });
    }
  }, [query]);

  const handleSearchResultLimitChange = useCallback(
    (value: string) => {
      setSearchResultLimit(parseInt(value, 10));
      // If there's an active search, refresh with the new limit
      if (query.trim()) {
        handleRefreshSearch();
      }
    },
    [handleRefreshSearch, query]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 mb-3">
        <div className="flex gap-2 mb-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={handleInputChange}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRefreshSearch();
              }
            }}
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshSearch}
              aria-label="Search"
              disabled={!query.trim()}
            >
              <FiSearch size={16} />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <Tabs
            defaultValue={searchMode}
            value={searchMode}
            className="w-full"
            onValueChange={handleSearchModeChange}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="keyword">Keyword</TabsTrigger>
              <TabsTrigger
                value="semantic"
                disabled={!hasEmbeddingModel}
                onClick={
                  !hasEmbeddingModel ? handleDisabledTabClick : undefined
                }
              >
                Semantic
              </TabsTrigger>
              <TabsTrigger
                value="hybrid"
                disabled={!hasEmbeddingModel}
                onClick={
                  !hasEmbeddingModel ? handleDisabledTabClick : undefined
                }
              >
                Hybrid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="text-xs text-muted-foreground">
            {isSearching ? (
              <div className="flex items-center">
                <Spinner className="w-3 h-3 mr-2" /> Searching...
              </div>
            ) : results.length > 0 ? (
              `${results.length} results`
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={searchResultLimit.toString()}
              onValueChange={handleSearchResultLimitChange}
            >
              <SelectTrigger className="text-xs h-7 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 results</SelectItem>
                <SelectItem value="20">20 results</SelectItem>
                <SelectItem value="50">50 results</SelectItem>
                <SelectItem value="100">100 results</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-3">
        {results.length === 0 && !isSearching && query.trim().length > 0 && (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            id={result.id}
            title={result.title}
            path={result.path}
            preview={result.preview}
            searchQuery={query}
            score={result.score || 0}
            onClick={() => handleOpenNote(result.path)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Search tab header component
 */
const SearchTabHeaderComponent: React.FC<{
  onToggleSearch: () => void;
}> = ({ onToggleSearch }) => {
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={onToggleSearch}
        aria-label="Back to notes"
      >
        <FiArrowLeft size={14} />
      </Button>
    </div>
  );
};

export const SearchTabHeader = SearchTabHeaderComponent;
export const SearchTab = observer(SearchTabComponent);
