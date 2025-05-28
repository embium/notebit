import React from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
import { ProviderType } from '@shared/types/ai';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

// State
import { EmbeddingModel } from '@shared/types/ai';
import { Button } from '@src/web/components/ui/button';

interface EmbeddingModelSelectorProps {
  embeddingModel: string | null;
  currentModel: EmbeddingModel | null;
  providers: string[];
  modelsByProvider: Record<string, EmbeddingModel[]>;
  installedModels: EmbeddingModel[];
  onSelectModel: (modelId: string) => void;
  selectedModelProviderEnabled: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Component for selecting an embedding model
 */
const EmbeddingModelSelectorComponent: React.FC<
  EmbeddingModelSelectorProps
> = ({
  embeddingModel,
  currentModel,
  providers,
  modelsByProvider,
  installedModels,
  onSelectModel,
  selectedModelProviderEnabled,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="embedding-model">Embedding Model</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh installation status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select
        value={embeddingModel || ''}
        onValueChange={onSelectModel}
      >
        <SelectTrigger
          id="embedding-model"
          className="w-full flex justify-between items-center"
        >
          <SelectValue placeholder="Select embedding model">
            {currentModel ? (
              <div className="flex items-center">
                <ProviderIcon
                  provider={currentModel.provider as ProviderType}
                  className="mr-2 h-4 w-4 text-foreground"
                />
                {currentModel.name}
              </div>
            ) : (
              'Select embedding model'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <SelectGroup key={provider}>
                <SelectLabel className="font-semibold flex items-center">
                  <ProviderIcon
                    provider={provider as ProviderType}
                    className="mr-2 h-4 w-4 text-foreground"
                  />
                  {provider}
                </SelectLabel>
                {modelsByProvider[provider]?.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-2 bg-green-100 text-green-800 border-green-200"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Installed
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            // Fallback in case providers is empty but we have installed models
            <SelectGroup>
              <SelectLabel className="font-semibold flex items-center">
                <ProviderIcon
                  provider="Ollama"
                  className="mr-2 h-4 w-4 text-foreground"
                />
                Ollama
              </SelectLabel>
              {installedModels.map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      {model.description && (
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="ml-2 bg-green-100 text-green-800 border-green-200"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Installed
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Used for semantic search, Smart Hubs, and AI memory features.
        {currentModel && (
          <span className="block mt-1">
            {currentModel.dimensions.toLocaleString()} dimensions
            {!selectedModelProviderEnabled && (
              <span className="text-amber-600 block mt-1">
                ⚠️ Warning: The provider for this model is currently disabled.
                Please choose another model or enable{' '}
                {currentModel.providerType} in the Providers tab.
              </span>
            )}
          </span>
        )}
      </p>
    </div>
  );
};

export const EmbeddingModelSelector = observer(EmbeddingModelSelectorComponent);
