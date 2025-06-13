import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// State
import { modelHubState$, searchModels } from '../state/modelHubState';

// Utils
import { cn } from '@src/renderer/utils';

const ModelSearchComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<
    'embedding' | 'vision' | 'tools' | undefined
  >();
  const [sort, setSort] = useState<'popular' | 'newest'>('popular');
  const isSearching = modelHubState$.isSearching.get();

  // Initialize search on first load
  useEffect(() => {
    searchModels();
  }, []);

  const handleSearch = () => {
    searchModels(searchTerm, category, sort);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    searchModels('', category, sort);
  };

  const handleCategoryChange = (value: string) => {
    const newCategory =
      value === 'all' ? undefined : (value as 'embedding' | 'vision' | 'tools');

    setCategory(newCategory);
    searchModels(searchTerm, newCategory, sort);
  };

  const handleSortChange = (value: string) => {
    const newSort = value as 'popular' | 'newest';
    setSort(newSort);
    searchModels(searchTerm, category, newSort);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search models by name or capability..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 w-full"
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleSearch}
            disabled={isSearching}
            className="gap-2 min-w-[150px]"
          >
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Model type:
          </span>
          <Select
            value={category || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="embedding">Embedding</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </span>
          <Select
            value={sort}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export const ModelSearch = observer(ModelSearchComponent);
