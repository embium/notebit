import { AlertCircle, RefreshCw } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Button } from '@/components/ui/button';

interface ModelLoadingStateProps {
  state: 'loading' | 'empty' | 'missing-config';
  loadAvailableModels: () => void;
  isRefreshDisabled: () => boolean;
  missingConfigMessage?: string;
}

/**
 * Component to display various loading states for the model settings
 */
const ModelLoadingStateComponent = ({
  state,
  loadAvailableModels,
  isRefreshDisabled,
  missingConfigMessage = 'Please provide the required configuration to access models.',
}: ModelLoadingStateProps) => {
  switch (state) {
    case 'loading':
      return (
        <div className="p-6 border rounded-md bg-muted/30 text-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            <h3 className="text-base font-medium">Loading Models</h3>
            <p className="text-sm text-muted-foreground">
              Fetching available models...
            </p>
          </div>
        </div>
      );

    case 'empty':
      return (
        <div className="p-6 border rounded-md bg-muted/30 text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-medium">No Models Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              No models were found for this provider. Try refreshing the models
              or check your configuration.
            </p>
            <Button
              onClick={loadAvailableModels}
              disabled={isRefreshDisabled()}
              variant="outline"
              size="sm"
              className="mt-2 flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Models
            </Button>
          </div>
        </div>
      );

    case 'missing-config':
      return (
        <div className="p-6 border rounded-md bg-muted/30 text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-medium">Configuration Required</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {missingConfigMessage}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const ModelLoadingState = observer(ModelLoadingStateComponent);
