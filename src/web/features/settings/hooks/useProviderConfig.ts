import { useState, useEffect, useRef, useCallback } from 'react';

// State
import {
  getProviderConfig,
  updateProviderConfig,
} from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import { fetchAvailableModels } from '@/features/settings/state/aiSettings/aiModels/modelFactory';

// Types
import {
  AVAILABLE_PROVIDERS,
  ProviderType,
  PROVIDER_CONFIG_MAP,
} from '@shared/types/ai';
import { GeminiModelInfo } from '@/shared/ai/models/gemini';

/**
 * Status for model loading operations
 */
export interface LoadingStatus {
  message: string;
  type: 'success' | 'error' | null;
}

/**
 * Hook for managing provider configuration and operations
 */
export function useProviderConfig() {
  const [activeProvider, setActiveProvider] = useState<ProviderType>('Ollama');
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<
    string[] | GeminiModelInfo[]
  >([]);
  const [status, setStatus] = useState<LoadingStatus>({
    message: '',
    type: null,
  });

  // Add a debounce timer ref for API configuration changes
  const debounceFetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add a local state to track whether a provider is enabled
  // This helps solve race conditions when toggling provider state
  const [localEnabledState, setLocalEnabledState] = useState<
    Record<ProviderType, boolean>
  >({} as Record<ProviderType, boolean>);

  // Get all provider configs to display statuses
  const providerConfigs = AVAILABLE_PROVIDERS.map((providerId) =>
    getProviderConfig(providerId)
  );

  // Get the current provider config
  const providerConfig = getProviderConfig(activeProvider);

  // Get current provider configuration requirements
  const currentProviderConfig = PROVIDER_CONFIG_MAP[activeProvider];

  // Reset status and models when provider changes
  useEffect(() => {
    setStatus({ message: '', type: null });
    setAvailableModels([]);

    // Clear any pending debounce timer when provider changes
    if (debounceFetchTimerRef.current) {
      clearTimeout(debounceFetchTimerRef.current);
      debounceFetchTimerRef.current = null;
    }
  }, [activeProvider]);

  // Check if the provider has valid configuration
  const hasValidConfig = useCallback((): boolean => {
    // If provider needs API host, check if it's not empty
    if (currentProviderConfig.needsApiHost && !providerConfig.apiHost.trim()) {
      return false;
    }

    // If provider needs API key, check if it's not empty
    if (currentProviderConfig.needsApiKey && !providerConfig.apiKey?.trim()) {
      return false;
    }

    return true;
  }, [
    currentProviderConfig.needsApiHost,
    currentProviderConfig.needsApiKey,
    providerConfig.apiHost,
    providerConfig.apiKey,
  ]);

  // Initialize the local enabled state from the global state
  useEffect(() => {
    const initialEnabledState = AVAILABLE_PROVIDERS.reduce(
      (acc, providerId) => {
        acc[providerId] = getProviderConfig(providerId).enabled;
        return acc;
      },
      {} as Record<ProviderType, boolean>
    );

    setLocalEnabledState(initialEnabledState);
  }, []);

  // Update local state when the global state changes
  useEffect(() => {
    setLocalEnabledState((prev) => ({
      ...prev,
      [activeProvider]: providerConfig.enabled,
    }));
  }, [activeProvider, providerConfig.enabled]);

  // Debounced fetch effect
  useEffect(() => {
    // Check both the local and global state to determine if models should be loaded
    const isCurrentProviderEnabled =
      localEnabledState[activeProvider] && providerConfig.enabled;

    // Clear any existing timer
    if (debounceFetchTimerRef.current) {
      clearTimeout(debounceFetchTimerRef.current);
      debounceFetchTimerRef.current = null;
    }

    if (isCurrentProviderEnabled && hasValidConfig()) {
      // Set a debounce timer to fetch models after typing stops
      debounceFetchTimerRef.current = setTimeout(() => {
        loadAvailableModels();
      }, 800); // 800ms debounce delay
    } else {
      setAvailableModels([]);
      // Only show status message if provider is enabled but missing config
      if (isCurrentProviderEnabled && !hasValidConfig()) {
        setStatus({
          message: getMissingConfigMessage(),
          type: 'error',
        });
      }
    }

    // Cleanup function to clear the timer if component unmounts or dependencies change
    return () => {
      if (debounceFetchTimerRef.current) {
        clearTimeout(debounceFetchTimerRef.current);
        debounceFetchTimerRef.current = null;
      }
    };
  }, [
    activeProvider,
    localEnabledState[activeProvider],
    providerConfig.apiHost,
    providerConfig.apiKey,
    hasValidConfig,
  ]);

  /**
   * Get message about missing configuration
   */
  const getMissingConfigMessage = useCallback(() => {
    return `Please provide ${
      currentProviderConfig.needsApiKey ? 'an API key' : ''
    }${
      currentProviderConfig.needsApiKey && currentProviderConfig.needsApiHost
        ? ' and '
        : ''
    }${
      currentProviderConfig.needsApiHost ? 'an API host' : ''
    } before fetching models.`;
  }, [currentProviderConfig.needsApiKey, currentProviderConfig.needsApiHost]);

  /**
   * Load available models from the provider
   */
  const loadAvailableModels = async () => {
    // Don't fetch if already loading
    if (isLoading) return;

    // Validate configuration before attempting to fetch models
    if (!hasValidConfig()) {
      setStatus({
        message: getMissingConfigMessage(),
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    setStatus({ message: 'Loading models...', type: null });
    try {
      // Pass forceEnabled=true to override the enabled check in fetchAvailableModels
      const models = await fetchAvailableModels(
        activeProvider,
        providerConfig,
        true
      );

      if (Array.isArray(models) && models.length > 0) {
        setAvailableModels(models);
        setStatus({
          message: `Successfully loaded ${models.length} models`,
          type: 'success',
        });
      } else {
        setAvailableModels([]);
        setStatus({
          message: 'No models found for this provider',
          type: 'error',
        });
      }
    } catch (error) {
      setAvailableModels([]);
      setStatus({
        message: `Error loading models: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle provider enabled/disabled
   */
  const handleProviderToggle = useCallback(
    (enabled: boolean) => {
      // Update local state immediately
      setLocalEnabledState((prev) => ({
        ...prev,
        [activeProvider]: enabled,
      }));

      // Update global state
      updateProviderConfig(activeProvider, { enabled });
    },
    [activeProvider]
  );

  /**
   * Update API host configuration
   */
  const handleApiHostChange = useCallback(
    (apiHost: string) => {
      updateProviderConfig(activeProvider, { apiHost });
    },
    [activeProvider]
  );

  /**
   * Update API key configuration
   */
  const handleApiKeyChange = useCallback(
    (apiKey: string) => {
      updateProviderConfig(activeProvider, { apiKey });
    },
    [activeProvider]
  );

  /**
   * Get documentation URL for provider
   */
  const getProviderDocsUrl = useCallback((providerId: ProviderType): string => {
    const urls: Record<ProviderType, string> = {
      Ollama: 'https://github.com/ollama/ollama',
      'Google Gemini': 'https://ai.google.dev/',
      OpenAI: 'https://platform.openai.com/docs',
      Claude: 'https://docs.anthropic.com/claude/docs',
      Groq: 'https://docs.groq.com/',
      LMStudio: 'https://lmstudio.ai/docs',
      Perplexity: 'https://docs.perplexity.ai/',
      SiliconFlow: 'https://docs.siliconflow.ai/',
      xAI: 'https://platform.x.ai/docs',
    };
    return urls[providerId] || '#';
  }, []);

  /**
   * Check if provider is enabled
   */
  const isProviderEnabled = useCallback(
    (providerId: ProviderType) => {
      return localEnabledState[providerId] || false;
    },
    [localEnabledState]
  );

  /**
   * Check if the refresh models button should be disabled
   */
  const isRefreshDisabled = useCallback(() => {
    return isLoading || !hasValidConfig();
  }, [isLoading, hasValidConfig]);

  return {
    // State
    activeProvider,
    setActiveProvider,
    isLoading,
    availableModels,
    status,
    providerConfigs,
    providerConfig,
    currentProviderConfig,

    // Actions
    loadAvailableModels,
    handleProviderToggle,
    handleApiHostChange,
    handleApiKeyChange,

    // Utilities
    hasValidConfig,
    getProviderDocsUrl,
    isProviderEnabled,
    isRefreshDisabled,
    getMissingConfigMessage,

    // Constants
    AVAILABLE_PROVIDERS,
  };
}
