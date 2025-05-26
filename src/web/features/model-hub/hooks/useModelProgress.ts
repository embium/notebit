import { useEffect } from 'react';
import t from '@shared/config';
import { modelHubState$ } from '../state/modelHubState';

/**
 * Hook to subscribe to model installation progress updates
 */
export function useModelProgress() {
  const utils = t.useUtils();

  useEffect(() => {
    // Subscribe to model progress events from the main process
    const subscription = utils.client.ollama.onPullProgress.subscribe(
      undefined,
      {
        onData: (data) => {
          if (data.modelName && typeof data.progress === 'number') {
            // Ensure the modelProgress object has the model name as a key
            if (!modelHubState$.modelProgress[data.modelName]) {
              modelHubState$.modelProgress.set({
                ...modelHubState$.modelProgress.get(),
                [data.modelName]: { progress: 0, status: 'Initializing...' },
              });
            }

            // Update the model progress in state
            modelHubState$.modelProgress[data.modelName].set({
              progress: data.progress,
              status: data.status || 'Downloading...',
            });
          }
        },
        onError: (error) => {
          console.error('Model progress subscription error:', error);
        },
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [utils.client.ollama.onPullProgress]);
}
