import React from 'react';
import { observer } from '@legendapp/state/react';
import { RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Types
import { ProviderType } from '@src/types/ai';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

// State
import { EmbeddingModel } from '@/features/settings/state/aiSettings/aiMemorySettings';

interface NoInstalledModelsCardProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  allAvailableModels: EmbeddingModel[];
}

/**
 * Card displayed when there are available models but none are installed
 */
const NoInstalledModelsCardComponent: React.FC<NoInstalledModelsCardProps> = ({
  isRefreshing,
  onRefresh,
  allAvailableModels,
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
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                No installed embedding models found
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  You have enabled providers that support embeddings, but no
                  models are installed.
                </p>

                <div className="mt-3">
                  <p className="font-medium">
                    Installing Ollama embedding models:
                  </p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Open a terminal/command prompt</li>
                    <li>
                      Run the following command to install an embedding model:
                    </li>
                    <div className="mt-1 mb-2 font-mono text-xs bg-black bg-opacity-80 text-white p-2 rounded overflow-x-auto">
                      ollama pull nomic-embed-text
                    </div>
                    <li>Click the refresh button after installation</li>
                  </ol>
                </div>

                <p className="mt-3">
                  Alternatively, enable a cloud provider like OpenAI or Google
                  Gemini that has pre-installed embedding models.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-medium">Available Providers</h3>
          <div className="mt-2 space-y-3">
            {Object.keys(
              allAvailableModels.reduce(
                (acc, model) => {
                  acc[model.provider] = true;
                  return acc;
                },
                {} as Record<string, boolean>
              )
            ).map((provider) => (
              <div
                key={provider}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon
                    provider={provider as ProviderType}
                    className="h-4 w-4 text-foreground"
                  />
                  <span className="font-medium">{provider}</span>
                </div>
                <div className="pl-6 text-sm">
                  {allAvailableModels
                    .filter((model) => model.provider === provider)
                    .map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center mt-1"
                      >
                        <ArrowRight className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>{model.name}</span>
                        <Badge
                          variant="outline"
                          className="ml-2 bg-red-100 text-red-800 border-red-200 text-xs"
                        >
                          Not Installed
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const NoInstalledModelsCard = observer(NoInstalledModelsCardComponent);
