import React from 'react';
import { RefreshCw } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// State
import { EmbeddingModel } from '@/features/settings/state/aiSettings/aiMemorySettings';

// Components
import { EmbeddingModelSelector } from './EmbeddingModelSelector';
import { AdditionalModelsSection } from './AdditionalModelsSection';

interface MainSettingsCardProps {
  isRefreshing: boolean;
  embeddingModel: string | null;
  currentModel: EmbeddingModel | null;
  providers: string[];
  modelsByProvider: Record<string, EmbeddingModel[]>;
  installedModels: EmbeddingModel[];
  allAvailableModels: EmbeddingModel[];
  selectedModelProviderEnabled: boolean;
  onRefresh: () => Promise<void>;
  onSelectModel: (modelId: string) => void;
  getNotInstalledModelsForProvider: (provider: string) => EmbeddingModel[];
}

/**
 * Main settings card for AIMemorySettings when models are installed
 */
const MainSettingsCardComponent: React.FC<MainSettingsCardProps> = ({
  isRefreshing,
  embeddingModel,
  currentModel,
  providers,
  modelsByProvider,
  installedModels,
  allAvailableModels,
  selectedModelProviderEnabled,
  onRefresh,
  onSelectModel,
  getNotInstalledModelsForProvider,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Semantic Memory Settings</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure how the app processes and remembers information through
          vector embeddings for semantic search and retrieval.
        </p>

        <EmbeddingModelSelector
          embeddingModel={embeddingModel}
          currentModel={currentModel}
          providers={providers}
          modelsByProvider={modelsByProvider}
          installedModels={installedModels}
          onSelectModel={onSelectModel}
          selectedModelProviderEnabled={selectedModelProviderEnabled}
        />

        <AdditionalModelsSection
          allAvailableModels={allAvailableModels}
          installedModels={installedModels}
          getNotInstalledModelsForProvider={getNotInstalledModelsForProvider}
        />
      </CardContent>
    </Card>
  );
};

export const MainSettingsCard = observer(MainSettingsCardComponent);
