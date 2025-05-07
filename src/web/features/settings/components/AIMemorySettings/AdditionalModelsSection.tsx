import React from 'react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Badge } from '@/components/ui/badge';

// Types
import { AdditionalModelsSectionProps, ProviderType } from '@shared/types/ai';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

/**
 * Displays information about additional available but not installed models
 */
const AdditionalModelsSectionComponent: React.FC<
  AdditionalModelsSectionProps
> = ({
  allAvailableModels,
  installedModels,
  getNotInstalledModelsForProvider,
}) => {
  // Skip rendering if all models are installed
  if (allAvailableModels.length <= installedModels.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
      <p className="font-medium text-blue-800">Additional Models Available</p>
      <p className="text-blue-700 mt-1">
        Some embedding models for your enabled providers aren't installed.
        {allAvailableModels.some(
          (m) => m.providerType === 'Ollama' && !m.isInstalled
        ) && (
          <span>
            {' '}
            Install additional Ollama models with{' '}
            <code className="px-1 py-0.5 bg-blue-100 rounded font-mono">
              ollama pull [model-name]
            </code>
          </span>
        )}
      </p>

      {/* List of uninstalled models */}
      <div className="mt-2 space-y-2">
        {Object.keys(
          allAvailableModels.reduce(
            (acc, model) => {
              if (model.isInstalled === false) {
                acc[model.provider] = true;
              }
              return acc;
            },
            {} as Record<string, boolean>
          )
        ).map((provider) => {
          const notInstalledModels = getNotInstalledModelsForProvider(provider);
          if (notInstalledModels.length === 0) return null;

          return (
            <div
              key={provider}
              className="pl-2"
            >
              <div className="flex items-center gap-1 text-blue-800">
                <ProviderIcon
                  provider={provider as ProviderType}
                  className="h-3 w-3"
                />
                <span className="font-medium text-xs">{provider}</span>
              </div>
              <div className="pl-4 text-xs flex flex-wrap gap-1 mt-1">
                {notInstalledModels.map((model) => (
                  <Badge
                    key={model.id}
                    variant="outline"
                    className="bg-blue-50 text-blue-600 border-blue-200"
                  >
                    {model.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdditionalModelsSection = observer(
  AdditionalModelsSectionComponent
);
