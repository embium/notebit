import React from 'react';
import { Check, Download, RefreshCw } from 'lucide-react';
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

// Types
import { KnowledgeGraphModel, ProviderType } from '@shared/types/ai';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

// Hooks
import { useKnowledgeGraphModels } from '@/features/settings/hooks/useKnowledegeGraphModels';
import { Button } from '@src/web/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KnowledgeGraphModelSelectorProps {
  knowledgeGraphModel: KnowledgeGraphModel | null;
  currentModel: KnowledgeGraphModel | null;
  providers: string[];
  modelsByProvider: Record<string, KnowledgeGraphModel[]>;
  allAvailableModels: KnowledgeGraphModel[];
  onSelectModel: (
    modelId: string,
    providerType: ProviderType,
    modelName?: string
  ) => void;
  handleRefreshStatus: () => void;
  isRefreshing: boolean;
}

/**
 * Component for selecting a knowledge graph model
 */
const KnowledgeGraphModelSelectorComponent: React.FC<
  KnowledgeGraphModelSelectorProps
> = ({
  knowledgeGraphModel,
  currentModel,
  providers,
  modelsByProvider,
  onSelectModel,
  handleRefreshStatus,
  isRefreshing,
}) => {
  const { isModelAvailable } = useKnowledgeGraphModels();

  // Function to determine if a model is available/installed
  const checkModelAvailability = (model: KnowledgeGraphModel) => {
    return isModelAvailable(model.id, model.providerType as ProviderType);
  };

  // Get badge text based on provider
  const getStatusBadge = (model: KnowledgeGraphModel, isAvailable: boolean) => {
    // Local providers need installation
    if (model.providerType === 'Ollama' || model.providerType === 'LMStudio') {
      return isAvailable ? 'Installed' : 'Not Installed';
    }

    // Cloud providers are just available or not
    return isAvailable ? 'Available' : 'Unavailable';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="knowledge-graph-model">Model Selection</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh model status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select
        value={knowledgeGraphModel?.id || ''}
        onValueChange={(modelId) => {
          // Find the selected model from all providers
          let selectedModel: KnowledgeGraphModel | undefined;

          for (const provider in modelsByProvider) {
            const model = modelsByProvider[provider]?.find(
              (m) => m.id === modelId
            );
            if (model) {
              selectedModel = model;
              break;
            }
          }

          if (selectedModel) {
            onSelectModel(
              selectedModel.id,
              selectedModel.providerType as ProviderType,
              selectedModel.name
            );
          } else {
            // Fallback if model not found
            onSelectModel(modelId, 'OpenAI' as ProviderType);
          }
        }}
      >
        <SelectTrigger
          id="knowledge-graph-model"
          className="w-full flex justify-between items-center"
        >
          <SelectValue placeholder="Select knowledge graph model">
            {currentModel ? (
              <div className="flex items-center">
                <ProviderIcon
                  provider={currentModel.provider as ProviderType}
                  className="mr-2 h-4 w-4 text-foreground"
                />
                <span
                  className={`${currentModel.providerType === 'Ollama' || currentModel.providerType === 'LMStudio' ? 'text-sm' : ''}`}
                >
                  {currentModel.name}
                </span>
              </div>
            ) : (
              'Select knowledge graph model'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {providers.length > 0 &&
            providers.map((provider) => (
              <SelectGroup key={provider}>
                <SelectLabel className="font-semibold flex items-center">
                  <ProviderIcon
                    provider={provider as ProviderType}
                    className="mr-2 h-4 w-4 text-foreground"
                  />
                  {provider}
                </SelectLabel>
                {modelsByProvider[provider]?.map((model) => {
                  const modelAvailable = checkModelAvailability(model);
                  const isLocalProvider =
                    model.providerType === 'Ollama' ||
                    model.providerType === 'LMStudio';

                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={!modelAvailable && isLocalProvider}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span
                            className={`font-medium ${model.providerType === 'Ollama' || model.providerType === 'LMStudio' ? 'text-sm' : ''}`}
                          >
                            {model.name}
                          </span>
                        </div>

                        {modelAvailable ? (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-green-100 text-green-800 border-green-200"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {getStatusBadge(model, true)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-amber-100 text-amber-800 border-amber-200"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {getStatusBadge(model, false)}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        The selected model will be used to extract knowledge graphs from your
        documents.
      </p>
    </div>
  );
};

export const KnowledgeGraphModelSelector = observer(
  KnowledgeGraphModelSelectorComponent
);
