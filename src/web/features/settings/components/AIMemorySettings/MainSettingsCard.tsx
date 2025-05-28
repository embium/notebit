import React from 'react';
import { BrainCircuit, RefreshCw } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
import { EmbeddingModel } from '@shared/types/ai';

// Components
import { EmbeddingModelSelector } from './EmbeddingModelSelector';
import { AdditionalModelsSection } from './AdditionalModelsSection';
import { KnowledgeGraphSettings } from './KnowledgeGraphSettings';

interface MainSettingsCardProps {
  isRefreshing: boolean;
  embeddingModel: string | null;
  currentModel: EmbeddingModel | null;
  providers: string[];
  modelsByProvider: Record<string, EmbeddingModel[]>;
  installedModels: EmbeddingModel[];
  selectedModelProviderEnabled: boolean;
  onRefresh: () => Promise<void>;
  onSelectModel: (modelId: string) => void;
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
  selectedModelProviderEnabled,
  onRefresh,
  onSelectModel,
}) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle>Semantic Memory Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure how the app processes and remembers information through
          vector embeddings for semantic search and retrieval.
        </p>

        <Tabs
          defaultValue="embedding"
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2 mb-2">
            <TabsTrigger value="embedding">Vector Embeddings</TabsTrigger>
            <TabsTrigger value="knowledge-graph">Knowledge Graph</TabsTrigger>
          </TabsList>

          <TabsContent
            value="embedding"
            className="space-y-4 pt-2"
          >
            <EmbeddingModelSelector
              embeddingModel={embeddingModel}
              currentModel={currentModel}
              providers={providers}
              modelsByProvider={modelsByProvider}
              installedModels={installedModels}
              onSelectModel={onSelectModel}
              selectedModelProviderEnabled={selectedModelProviderEnabled}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />

            {/*
            <AdditionalModelsSection
              allAvailableModels={allAvailableModels}
              installedModels={installedModels}
              getNotInstalledModelsForProvider={getNotInstalledModelsForProvider}
            />
            */}
          </TabsContent>

          <TabsContent value="knowledge-graph">
            <KnowledgeGraphSettings />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export const MainSettingsCard = observer(MainSettingsCardComponent);
