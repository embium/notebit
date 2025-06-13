import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModelConfig } from '@src/types/ai';
import { GeminiModelInfo } from '@src/renderer/lib/ai/models/gemini';

// Import sub-components
import { ModelBaseInfo } from './ModelBaseInfo';
import { ModelBasicParams } from './ModelBasicParams';
import { ModelAdvancedParams } from './ModelAdvancedParams';

interface ModelFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  availableModels: string[] | GeminiModelInfo[];
  editingModel: ModelConfig | null;
  sortedAvailableModels: (string | GeminiModelInfo)[];

  // Form fields
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  customName: string;
  setCustomName: (name: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  frequencyPenalty: number;
  setFrequencyPenalty: (penalty: number) => void;
  presencePenalty: number;
  setPresencePenalty: (penalty: number) => void;
  contextMessageLimit: number;
  setContextMessageLimit: (limit: number) => void;
  extraParams: string;
  setExtraParams: (params: string) => void;
  extraParamsError: string | null;
  setExtraParamsError: (error: string | null) => void;

  // Form actions
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Dialog component for adding or editing a model configuration
 */
export const ModelFormDialog: React.FC<ModelFormDialogProps> = ({
  isOpen,
  setIsOpen,
  editingModel,
  sortedAvailableModels,
  availableModels,

  // Form fields
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

  // Form actions
  onSubmit,
  onClose,
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingModel ? 'Edit Model' : 'Add Custom Model'}
          </DialogTitle>
          <DialogDescription>
            {editingModel
              ? 'Edit the model configuration settings'
              : 'Create a custom model configuration for this provider'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Base model info section */}
          <ModelBaseInfo
            editingModel={editingModel}
            selectedModelId={selectedModelId}
            setSelectedModelId={setSelectedModelId}
            customName={customName}
            setCustomName={setCustomName}
            sortedAvailableModels={sortedAvailableModels}
          />

          {/* Basic parameters section */}
          <ModelBasicParams
            temperature={temperature}
            setTemperature={setTemperature}
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
            contextMessageLimit={contextMessageLimit}
            setContextMessageLimit={setContextMessageLimit}
            selectedModelId={selectedModelId}
            availableModels={availableModels}
          />

          {/* Advanced parameters section */}
          <ModelAdvancedParams
            topP={topP}
            setTopP={setTopP}
            frequencyPenalty={frequencyPenalty}
            setFrequencyPenalty={setFrequencyPenalty}
            presencePenalty={presencePenalty}
            setPresencePenalty={setPresencePenalty}
            extraParams={extraParams}
            setExtraParams={setExtraParams}
            extraParamsError={extraParamsError}
            setExtraParamsError={setExtraParamsError}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={onSubmit}
          >
            {editingModel ? 'Update Model' : 'Create Model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModelFormDialog;
