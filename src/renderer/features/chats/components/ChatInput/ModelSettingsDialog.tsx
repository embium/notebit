import React, { useEffect } from 'react';
import { BsSliders } from 'react-icons/bs';
import { Info, Settings } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CustomSlider } from '@/components/ui/custom-slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Utils
import { cn } from '@src/renderer/utils';

// Hooks
import { useModelForm } from '@/features/settings/hooks/useModelForm';

// State
import { selectedModel } from '@/features/settings/state/aiSettings/aiModels/modelOperations';
import { ProviderType, ModelConfig } from '@src/types/ai';

interface ModelSettingsDialogProps {
  handleCreateOrUpdateModel: (
    modelId: string | null,
    formValues: ModelConfig
  ) => void;
}

/**
 * Dialog for configuring AI model settings
 */
const ModelSettingsDialogComponent: React.FC<ModelSettingsDialogProps> = ({
  handleCreateOrUpdateModel,
}) => {
  // Use a constant default provider to ensure hooks are always called in the same order
  // The actual provider will be set later in the useEffect
  const defaultProvider: ProviderType = 'Ollama';

  const {
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
    resetForm,
    handleCloseDialog,
    validateForm,
    getFormValues,
  } = useModelForm(defaultProvider);

  // Using the observer pattern ensures this component re-renders when selectedModel changes
  const currentModel = selectedModel.get();

  // Set up the model when dialog opens or when the model changes
  useEffect(() => {
    if (isDialogOpen && currentModel) {
      setEditingModel(currentModel);

      if (currentModel.providerId) {
        setSelectedModelId(currentModel.providerId);
      }
    }
  }, [isDialogOpen, currentModel, setEditingModel, setSelectedModelId]);

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const formValues = getFormValues();
    handleCreateOrUpdateModel(
      editingModel?.id || null,
      formValues as ModelConfig
    );

    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <>
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 w-8 p-0"
            title="Edit model settings"
          >
            <BsSliders className="h-4 w-4" />
          </Button>
        </DialogTrigger>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="base-model"
                className="col-span-4"
              >
                Base Model
              </Label>
              <div className={cn('col-span-4', editingModel && 'opacity-70')}>
                {selectedModelId}
              </div>
              {editingModel && (
                <p className="col-span-4 text-xs text-amber-500">
                  The base model cannot be changed when editing.
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="custom-name"
                className="col-span-4"
              >
                Custom Name
              </Label>
              <Input
                id="custom-name"
                className="col-span-4"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="My Custom Model"
              />
            </div>

            <Separator className="my-2" />
            <h4 className="font-medium text-primary">Basic Parameters</h4>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="temperature"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Temperature</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Controls randomness: Lower values make the model more
                          deterministic, higher values make output more
                          creative. Range 0-1.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground">
                  {temperature.toFixed(2)}
                </span>
              </Label>
              <CustomSlider
                id="temperature"
                className="col-span-4"
                min={0}
                max={1}
                step={0.01}
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                aria-label="Temperature"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="tokens"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Max Output Tokens</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Maximum length of generated text in tokens. Higher
                          values allow for longer responses but may increase
                          latency.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground flex items-center">
                  {maxTokens}
                </span>
              </Label>
              <div className="col-span-4 flex gap-2 items-center">
                <Input
                  id="tokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => {
                    const value = Math.max(
                      1,
                      Math.min(8192, parseInt(e.target.value) || 0)
                    );
                    setMaxTokens(value);
                  }}
                  className="flex-1"
                />
              </div>
              <p className="col-span-4 text-xs text-muted-foreground my-0">
                Number of tokens to generate in a response. Higher values allow
                for longer outputs.
              </p>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="context-message-limit"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Context Message Limit</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Maximum number of previous messages to include in the
                          context. Higher values provide more context but may
                          increase token usage.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground">
                  {contextMessageLimit}
                </span>
              </Label>
              <div className="col-span-4 flex gap-2 items-center">
                <Input
                  id="context-message-limit"
                  type="number"
                  value={contextMessageLimit}
                  onChange={(e) => {
                    const value = Math.max(
                      1,
                      Math.min(100, parseInt(e.target.value) || 0)
                    );
                    setContextMessageLimit(value);
                  }}
                  className="flex-1"
                />
              </div>
              <p className="col-span-4 text-xs text-muted-foreground my-0">
                Number of previous messages to include in the context.
              </p>
            </div>

            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary">Advanced Parameters</h4>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="top-p"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Top P</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Controls diversity via nucleus sampling: 0.5 means
                          half of all likelihood-weighted options are
                          considered. Range 0-1.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground">
                  {topP.toFixed(2)}
                </span>
              </Label>
              <CustomSlider
                id="top-p"
                className="col-span-4"
                min={0.01}
                max={1}
                step={0.01}
                value={[topP]}
                onValueChange={(value) => setTopP(value[0])}
                aria-label="Top P"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="frequency-penalty"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Frequency Penalty</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Penalizes repeated tokens: higher values reduce
                          repetition. Range 0-1.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground">
                  {frequencyPenalty.toFixed(2)}
                </span>
              </Label>
              <CustomSlider
                id="frequency-penalty"
                className="col-span-4"
                min={0}
                max={1}
                step={0.01}
                value={[frequencyPenalty]}
                onValueChange={(value) => setFrequencyPenalty(value[0])}
                aria-label="Frequency Penalty"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="presence-penalty"
                className="col-span-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>Presence Penalty</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p>
                          Penalizes new tokens based on whether they appear in
                          the existing text: higher values encourage new topics.
                          Range 0-1.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-muted-foreground">
                  {presencePenalty.toFixed(2)}
                </span>
              </Label>
              <CustomSlider
                id="presence-penalty"
                className="col-span-4"
                min={0}
                max={1}
                step={0.01}
                value={[presencePenalty]}
                onValueChange={(value) => setPresencePenalty(value[0])}
                aria-label="Presence Penalty"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4 mt-2">
              <div className="flex items-center gap-2 col-span-4">
                <Label htmlFor="extra-params">Extra Model Parameters</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p>
                        Additional parameters in JSON format to send to the
                        model. These will override any other settings configured
                        above.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="col-span-4">
                <Textarea
                  id="extra-params"
                  placeholder='{
  "top_k": 40,
  "min_p": 0.05,
  "mirostat_mode": 2
}'
                  value={extraParams}
                  onChange={(e) => {
                    setExtraParams(e.target.value);
                    setExtraParamsError(null);
                  }}
                  className={cn(
                    'font-mono text-xs',
                    extraParamsError && 'border-destructive'
                  )}
                  rows={5}
                />
                {extraParamsError && (
                  <p className="text-xs text-destructive mt-1">
                    {extraParamsError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Enter valid JSON. These parameters override all others.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
            >
              {editingModel ? 'Update Model' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
export const ModelSettingsDialog = observer(ModelSettingsDialogComponent);
