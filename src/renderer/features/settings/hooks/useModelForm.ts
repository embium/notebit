import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types
import { ModelConfig, ProviderType } from '@src/types/ai';

// Utils
import { validateJsonString } from '../utils/modelUtils';

/**
 * Hook for managing model form state
 */
export function useModelForm(providerId: ProviderType) {
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.5);
  const [presencePenalty, setPresencePenalty] = useState(0.5);
  const [contextMessageLimit, setContextMessageLimit] = useState(10);
  const [extraParams, setExtraParams] = useState('');
  const [extraParamsError, setExtraParamsError] = useState<string | null>(null);

  // When editing a model, load its values into the form
  useEffect(() => {
    if (editingModel) {
      console.log('Editing model:', editingModel);
      setSelectedModelId(editingModel.providerId || '');
      setCustomName(editingModel.name);
      setTemperature(editingModel.temperature || 0.7);
      setMaxTokens(editingModel.maxOutputTokens || 2048);
      setContextMessageLimit(editingModel.contextMessageLimit || 10);

      // Set advanced parameters
      setTopP(editingModel.topP || 0.9);
      setFrequencyPenalty(editingModel.frequencyPenalty || 0.5);
      setPresencePenalty(editingModel.presencePenalty || 0.5);

      // Set extra params if they exist
      setExtraParams(
        editingModel.extraParams ? JSON.stringify(editingModel.extraParams) : ''
      );
    }
  }, [editingModel]);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setEditingModel(null);
    setSelectedModelId('');
    setCustomName('');
    setTemperature(0.7);
    setMaxTokens(2048);
    setTopP(0.9);
    setFrequencyPenalty(0.5);
    setPresencePenalty(0.5);
    setContextMessageLimit(10);
    setExtraParams('');
    setExtraParamsError(null);
  }, []);

  /**
   * Close the dialog and reset form
   */
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  /**
   * Open the edit dialog for a model
   */
  const handleEditModel = useCallback((model: ModelConfig) => {
    setEditingModel(model);
    setIsDialogOpen(true);
  }, []);

  /**
   * Validate form values
   */
  const validateForm = useCallback(() => {
    // Check model ID and name
    if (!editingModel && (!selectedModelId || !customName.trim())) {
      toast.error('Please select a model and enter a name');
      return false;
    }

    // Validate JSON
    const validation = validateJsonString(extraParams);
    if (!validation.valid) {
      setExtraParamsError(validation.error || 'Invalid JSON format');
      return false;
    }

    return true;
  }, [editingModel, selectedModelId, customName, extraParams]);

  /**
   * Get form values as a model config object
   */
  const getFormValues = useCallback(() => {
    const parsedExtraParams = extraParams.trim()
      ? JSON.parse(extraParams.trim())
      : undefined;

    return {
      name: customName.trim(),
      providerId: selectedModelId,
      temperature,
      contextMessageLimit,
      maxOutputTokens: maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      extraParams: parsedExtraParams,
    };
  }, [
    customName,
    selectedModelId,
    temperature,
    contextMessageLimit,
    maxTokens,
    topP,
    frequencyPenalty,
    presencePenalty,
    extraParams,
  ]);

  return {
    // Form state
    isDialogOpen,
    setIsDialogOpen,
    editingModel,
    setEditingModel,
    selectedModelId,
    setSelectedModelId,
    customName,
    setCustomName,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topP,
    setTopP,
    frequencyPenalty,
    setFrequencyPenalty,
    presencePenalty,
    setPresencePenalty,
    contextMessageLimit,
    setContextMessageLimit,
    extraParams,
    setExtraParams,
    extraParamsError,
    setExtraParamsError,

    // Form handlers
    resetForm,
    handleCloseDialog,
    handleEditModel,
    validateForm,
    getFormValues,
  };
}
