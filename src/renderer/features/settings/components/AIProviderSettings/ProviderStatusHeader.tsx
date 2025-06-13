import { observer } from '@legendapp/state/react';

// UI Components
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

// Types
import { ProviderType } from '@src/types/ai';

interface ProviderStatusHeaderProps {
  providers: Array<{
    id: ProviderType;
    enabled: boolean;
  }>;
  setActiveProvider: (provider: ProviderType) => void;
}

/**
 * Header component that shows enabled providers status
 */
const ProviderStatusHeaderComponent = ({
  providers,
  setActiveProvider,
}: ProviderStatusHeaderProps) => {
  const enabledProviders = providers.filter((p) => p.enabled);

  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="flex space-x-1">
      {enabledProviders.map((provider) => (
        <TooltipProvider key={provider.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md border text-green-500 border-green-400 bg-green-50 dark:bg-green-950/20"
                onClick={() => setActiveProvider(provider.id)}
              >
                <ProviderIcon provider={provider.id} />
                <span className="ml-1 text-xs text-green-500">On</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{provider.id} is enabled</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export const ProviderStatusHeader = observer(ProviderStatusHeaderComponent);
