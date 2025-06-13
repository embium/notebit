import React from 'react';
import { RefreshCw } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

// Types
import { ProviderType } from '@src/types/ai';

// State
import { PROVIDER_EMBEDDING_MODELS } from '@shared/constants';
import { observer } from '@legendapp/state/react';

interface NoEmbeddingModelsCardProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

/**
 * Displays a card when no embedding models are available
 */
const NoEmbeddingModelsCardComponent: React.FC<NoEmbeddingModelsCardProps> = ({
  isRefreshing,
  onRefresh,
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
      <CardContent>
        <p className="text-sm text-muted-foreground">
          No embedding models available. Please enable one of the following AI
          providers in the Providers tab:
          <div className="mt-2 space-y-1.5">
            {Object.keys(PROVIDER_EMBEDDING_MODELS)
              .filter(
                (providerKey) =>
                  PROVIDER_EMBEDDING_MODELS[providerKey as ProviderType]
                    ?.length > 0
              )
              .map((providerKey) => {
                const upperCaseProviderKey =
                  providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
                return (
                  <div
                    key={providerKey}
                    className="flex items-center gap-2"
                  >
                    <ProviderIcon
                      provider={upperCaseProviderKey as ProviderType}
                      className="h-4 w-4 text-foreground"
                    />
                    <span className="font-medium">{providerKey}</span>
                  </div>
                );
              })}
          </div>
        </p>
      </CardContent>
    </Card>
  );
};

export const NoEmbeddingModelsCard = observer(NoEmbeddingModelsCardComponent);
