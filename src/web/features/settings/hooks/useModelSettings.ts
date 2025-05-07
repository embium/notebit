import { useState, useMemo } from 'react';
import { useObservable, useObserve } from '@legendapp/state/react';

// State
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

// Hooks
import { useModelForm } from './useModelForm';
import { useModelOperations } from './useModelOperations';

// Utils
import { sortModels } from '../utils/modelUtils';

// Types
import { GeminiModelInfo } from '@/shared/ai/models/gemini';
import { ProviderType } from '@shared/types/ai';

/**
 * Unified hook for managing model settings
 * Combines useModelForm and useModelOperations
 */
export function useModelSettings(
  providerId: ProviderType,
  availableModels: string[] | GeminiModelInfo[]
) {
  // Force-update mechanism for key changes
  const [updateCounter, setUpdateCounter] = useState(0);

  // Observe the models state for reactivity
  const modelsState = useObservable(aiSettingsState$.models);

  // Track when models are added or changed
  useObserve(modelsState, () => {
    setUpdateCounter((prev) => prev + 1);
  });

  // Get form and operations hooks
  const modelForm = useModelForm(providerId);
  const modelOperations = useModelOperations(providerId);

  // Sort available models
  const sortedAvailableModels = useMemo(() => {
    return sortModels(availableModels);
  }, [availableModels]);

  // Handle form submission
  const handleSubmit = () => {
    if (!modelForm.validateForm()) {
      return;
    }

    const formValues = modelForm.getFormValues();
    modelOperations.handleCreateOrUpdateModel(
      modelForm.editingModel?.id || null,
      formValues
    );

    modelForm.setIsDialogOpen(false);
    modelForm.resetForm();
  };

  // Reset form and close dialog
  const handleResetForm = () => {
    modelForm.resetForm();
  };

  // Memoize model IDs to prevent unnecessary re-renders
  const defaultModelIds = useMemo(
    () => modelOperations.defaultModels.map((model) => model.id),
    [modelOperations.defaultModels, updateCounter]
  );

  const customModelIds = useMemo(
    () => modelOperations.customModels.map((model) => model.id),
    [modelOperations.customModels, updateCounter]
  );

  // Props for ModelFormDialog component
  const modelFormProps = {
    editingModel: modelForm.editingModel,
    selectedModelId: modelForm.selectedModelId,
    setSelectedModelId: modelForm.setSelectedModelId,
    customName: modelForm.customName,
    setCustomName: modelForm.setCustomName,
    temperature: modelForm.temperature,
    setTemperature: modelForm.setTemperature,
    maxTokens: modelForm.maxTokens,
    setMaxTokens: modelForm.setMaxTokens,
    topP: modelForm.topP,
    setTopP: modelForm.setTopP,
    frequencyPenalty: modelForm.frequencyPenalty,
    setFrequencyPenalty: modelForm.setFrequencyPenalty,
    presencePenalty: modelForm.presencePenalty,
    setPresencePenalty: modelForm.setPresencePenalty,
    contextMessageLimit: modelForm.contextMessageLimit,
    setContextMessageLimit: modelForm.setContextMessageLimit,
    extraParams: modelForm.extraParams,
    setExtraParams: modelForm.setExtraParams,
    extraParamsError: modelForm.extraParamsError,
    setExtraParamsError: modelForm.setExtraParamsError,
    onClose: modelForm.handleCloseDialog,
    onSubmit: handleSubmit,
    sortedAvailableModels,
  };

  // Props for ModelList component
  const modelOperationsProps = {
    handleToggleModel: modelOperations.handleToggleModel,
    handleDeleteModel: modelOperations.handleDeleteModel,
    handleCloneModel: modelOperations.handleCloneModel,
    handleEditModel: modelForm.handleEditModel,
  };

  return {
    // General state
    isDialogOpen: modelForm.isDialogOpen,
    setIsDialogOpen: modelForm.setIsDialogOpen,
    updateCounter,
    noModelsAvailable: modelOperations.noModelsAvailable,

    // Form handlers
    handleResetForm,

    // Props objects for components
    modelFormProps,
    modelOperationsProps,

    // Model data
    defaultModelIds,
    customModelIds,
  };
}
