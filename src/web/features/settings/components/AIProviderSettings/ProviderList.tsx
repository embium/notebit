import { ChevronRight } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// Types
import { ProviderType } from '@shared/types/ai';

// Utils
import { cn } from '@/shared/utils';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

interface ProviderListProps {
  providers: ProviderType[];
  activeProvider: ProviderType;
  setActiveProvider: (provider: ProviderType) => void;
  isProviderEnabled: (provider: ProviderType) => boolean;
}

/**
 * Provider selection sidebar list
 */
const ProviderListComponent = ({
  providers,
  activeProvider,
  setActiveProvider,
  isProviderEnabled,
}: ProviderListProps) => {
  return (
    <div className="md:col-span-1 space-y-2">
      <div className="text-sm font-medium mb-2">Available Providers</div>
      <div className="space-y-1 max-h-[480px] overflow-y-auto pr-2">
        {providers.map((providerId) => (
          <div
            key={providerId}
            className={cn(
              'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
              activeProvider === providerId
                ? 'bg-muted font-medium'
                : 'hover:bg-muted/50'
            )}
            onClick={() => setActiveProvider(providerId)}
          >
            <div className="flex items-center">
              <span className="mr-2">
                <ProviderIcon provider={providerId} />
              </span>
              <span>{providerId}</span>
            </div>
            <div className="flex items-center">
              {isProviderEnabled(providerId) && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              )}
              <ChevronRight
                className={cn(
                  'h-4 w-4 ml-1 transition-transform',
                  activeProvider === providerId && 'rotate-90'
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProviderList = observer(ProviderListComponent);
