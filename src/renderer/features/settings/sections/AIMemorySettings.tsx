import React from 'react';
import { observer } from '@legendapp/state/react';

// Hooks
import { useEmbeddingModels } from '@/features/settings/hooks/useEmbeddingModels';

// Components
import {
  MainSettingsCard,
  NoEmbeddingModelsCard,
  NoInstalledModelsCard,
} from '@/features/settings/components/AIMemorySettings';
/**
 * AIMemorySettings component
 *
 * Allows configuration of embedding models for semantic search and memory features
 */
const AIMemorySettingsComponent: React.FC = () => {
  const {
    modelsByProvider,
    providers,
    embeddingModel,
    currentModel,
    allAvailableModels,
    installedModels,
    isRefreshing,
    selectedModelProviderEnabled,
    handleRefreshStatus,
    setEmbeddingModel,
  } = useEmbeddingModels();

  // If there are no providers with models available, show a message
  if (allAvailableModels.length === 0) {
    return (
      <NoEmbeddingModelsCard
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshStatus}
      />
    );
  }

  // If there are available models but none are installed
  if (installedModels.length === 0) {
    return (
      <NoInstalledModelsCard
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshStatus}
        allAvailableModels={allAvailableModels}
      />
    );
  }

  // Main settings view when models are available and installed
  return (
    <MainSettingsCard
      isRefreshing={isRefreshing}
      embeddingModel={embeddingModel}
      currentModel={currentModel}
      providers={providers}
      modelsByProvider={modelsByProvider}
      installedModels={installedModels}
      selectedModelProviderEnabled={selectedModelProviderEnabled}
      onRefresh={handleRefreshStatus}
      onSelectModel={setEmbeddingModel}
    />
  );
};

export const AIMemorySettings = observer(AIMemorySettingsComponent);
