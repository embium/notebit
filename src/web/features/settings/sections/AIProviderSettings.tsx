import React from 'react';
import { observer } from '@legendapp/state/react';

// Hooks
import { useProviderConfig } from '@/features/settings/hooks/useProviderConfig';

// Components
import { ProviderList } from '@/features/settings/components/AIProviderSettings/ProviderList';
import { ProviderSettingsCard } from '@/features/settings/components/AIProviderSettings/ProviderSettingsCard';
import { ModelLoadingState } from '@/features/settings/components/AIProviderSettings/ModelLoadingState';
import { ProviderStatusHeader } from '@/features/settings/components/AIProviderSettings/ProviderStatusHeader';

// Sections
import { ModelSettings } from '@/features/settings/sections/ModelSettings';

/**
 * AI Provider Settings section for the settings page
 */
const AIProviderSettingsComponent: React.FC = () => {
  const {
    activeProvider,
    setActiveProvider,
    isLoading,
    availableModels,
    status,
    providerConfigs,
    providerConfig,
    currentProviderConfig,
    loadAvailableModels,
    handleProviderToggle,
    handleApiHostChange,
    handleApiKeyChange,
    hasValidConfig,
    getProviderDocsUrl,
    isProviderEnabled,
    isRefreshDisabled,
    getMissingConfigMessage,
    AVAILABLE_PROVIDERS,
  } = useProviderConfig();

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-end">
          <div className="flex space-x-2">
            <ProviderStatusHeader
              providers={providerConfigs}
              setActiveProvider={setActiveProvider}
            />
          </div>
        </div>

        {/* Provider selection and configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Provider list */}
          <ProviderList
            providers={AVAILABLE_PROVIDERS}
            activeProvider={activeProvider}
            setActiveProvider={setActiveProvider}
            isProviderEnabled={isProviderEnabled}
          />

          {/* Provider configuration */}
          <div className="md:col-span-3">
            <ProviderSettingsCard
              activeProvider={activeProvider}
              providerConfig={providerConfig}
              currentProviderConfig={currentProviderConfig}
              isProviderEnabled={isProviderEnabled}
              hasValidConfig={hasValidConfig}
              getProviderDocsUrl={getProviderDocsUrl}
              status={status}
              isLoading={isLoading}
              isRefreshDisabled={isRefreshDisabled}
              handleProviderToggle={handleProviderToggle}
              handleApiHostChange={handleApiHostChange}
              handleApiKeyChange={handleApiKeyChange}
              loadAvailableModels={loadAvailableModels}
            />

            {isProviderEnabled(activeProvider) && (
              <div className="mt-6">
                {!hasValidConfig() ? (
                  <ModelLoadingState
                    state="missing-config"
                    loadAvailableModels={loadAvailableModels}
                    isRefreshDisabled={isRefreshDisabled}
                    missingConfigMessage={getMissingConfigMessage()}
                  />
                ) : isLoading ? (
                  <ModelLoadingState
                    state="loading"
                    loadAvailableModels={loadAvailableModels}
                    isRefreshDisabled={isRefreshDisabled}
                  />
                ) : availableModels.length === 0 ? (
                  <ModelLoadingState
                    state="empty"
                    loadAvailableModels={loadAvailableModels}
                    isRefreshDisabled={isRefreshDisabled}
                  />
                ) : (
                  <ModelSettings
                    providerId={activeProvider}
                    availableModels={availableModels}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AIProviderSettings = observer(AIProviderSettingsComponent);
