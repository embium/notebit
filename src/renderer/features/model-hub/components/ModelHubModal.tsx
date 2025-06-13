import React, { useEffect } from 'react';
import { observer, useSelector } from '@legendapp/state/react';
import {
  RefreshCw,
  ServerCrash,
  Search,
  DownloadCloud,
  CheckCircle2,
} from 'lucide-react';

// Components
import { InstalledModelCard, AvailableModelCard } from './ModelCard';
import { ModelSearch } from './ModelSearch';
import { Modal } from '@/components/ui/modal';

// UI Components
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// State
import {
  modelHubState$,
  loadInstalledModels,
  searchModels,
} from '../state/modelHubState';
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiSettingsState';

// Hooks
import { useModelProgress } from '../hooks/useModelProgress';

// Utils
import { cn } from '@src/renderer/utils';

// Custom CSS to override Radix UI's hidden behavior
import './modelHubStyles.css';

interface ModelHubModalProps {
  visible: boolean;
  onClose: () => void;
}

const ModelHubModalComponent: React.FC<ModelHubModalProps> = ({
  visible,
  onClose,
}) => {
  const installedModels = useSelector(modelHubState$.installedModels);
  const availableModels = useSelector(modelHubState$.availableModels);
  const isLoading = useSelector(modelHubState$.isLoading);
  const isSearching = useSelector(modelHubState$.isSearching);
  const searchQuery = useSelector(modelHubState$.searchQuery);
  const searchCategory = useSelector(modelHubState$.searchCategory);
  const sortBy = useSelector(modelHubState$.sortBy);
  const ollamaConfig = useSelector(aiSettingsState$.providers.Ollama);

  // Subscribe to model installation progress
  useModelProgress();

  useEffect(() => {
    if (visible && ollamaConfig.enabled) {
      loadInstalledModels();

      // Only search on first open if no search has been done yet
      if (availableModels.length === 0) {
        searchModels();
      }
    }
  }, [visible, ollamaConfig.enabled, availableModels.length]);

  const handleRefreshInstalledModels = () => {
    loadInstalledModels();
  };

  const handleRefreshAvailableModels = () => {
    searchModels(searchQuery, searchCategory, sortBy);
  };

  // Render the not enabled state
  if (!ollamaConfig.enabled) {
    return (
      <Modal
        visible={visible}
        onClose={onClose}
        width="90vw"
        height="80vh"
        maxWidth="1300px"
        maxHeight="800px"
        showCloseButton
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Alert className="max-w-lg border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <ServerCrash className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                Ollama provider not enabled
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Please enable and configure the Ollama provider in Settings to
                use the Model Hub.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </Modal>
    );
  }

  // Main content when Ollama is enabled
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      width="90vw"
      height="80vh"
      maxWidth="1300px"
      maxHeight="800px"
      showCloseButton
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <h1 className="text-xl font-bold">Model Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse, search, install and manage your Ollama models
          </p>
        </div>

        {/* Tabs Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            defaultValue="available"
            className="flex-1 flex flex-col overflow-hidden model-hub-tabs"
          >
            {/* Tab Selectors */}
            <div className="py-1 px-4 border-b border-border">
              <TabsList className="grid grid-cols-2 w-[400px]">
                <TabsTrigger
                  value="installed"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Installed Models{' '}
                  {installedModels.length > 0 && `(${installedModels.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="available"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Available Models
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Installed Models Tab */}
            <TabsContent
              value="installed"
              className="model-hub-tab-content flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-3 border-b border-border">
                <h2 className="text-lg font-medium">Your Installed Models</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshInstalledModels}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[220px] bg-muted/60 rounded-md animate-pulse"
                      />
                    ))}
                  </div>
                ) : installedModels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="max-w-md">
                      <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-xl font-medium mb-2">
                        No models installed yet
                      </h3>
                      <p className="text-muted-foreground">
                        Switch to the "Available Models" tab to discover and
                        install Ollama models.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {installedModels.map(
                      (model) =>
                        model && (
                          <InstalledModelCard
                            key={model.id}
                            model={model}
                          />
                        )
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Available Models Tab */}
            <TabsContent
              value="available"
              className="model-hub-tab-content flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-3 border-b border-border">
                <h2 className="text-lg font-medium">Browse Ollama Models</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAvailableModels}
                  disabled={isSearching}
                  className="gap-2"
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              <div className="border-b border-border bg-muted/20">
                <div className="p-3">
                  <ModelSearch />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[220px] bg-muted/60 rounded-md animate-pulse"
                      />
                    ))}
                  </div>
                ) : availableModels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="max-w-md">
                      <Search className="h-10 w-10 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-xl font-medium mb-2">
                        No models found
                      </h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search criteria or browse popular
                        models.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableModels.map(
                      (model) =>
                        model && (
                          <AvailableModelCard
                            key={model.id}
                            model={model}
                          />
                        )
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Modal>
  );
};

export const ModelHubModal = observer(ModelHubModalComponent);
