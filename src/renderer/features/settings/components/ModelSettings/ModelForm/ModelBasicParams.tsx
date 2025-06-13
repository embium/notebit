import React from 'react';
import { Info } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CustomSlider } from '@/components/ui/custom-slider';

// Types
import { GeminiModelInfo } from '@src/renderer/lib/ai/models/gemini';

// Utils
import { getModelOutputTokenLimit } from '@/features/settings/utils/modelUtils';

interface ModelBasicParamsProps {
  temperature: number;
  setTemperature: (value: number) => void;
  maxTokens: number;
  setMaxTokens: (value: number) => void;
  contextMessageLimit: number;
  setContextMessageLimit: (value: number) => void;
  selectedModelId: string;
  availableModels: string[] | GeminiModelInfo[];
}

/**
 * Component for basic model parameters
 */
const ModelBasicParamsComponent: React.FC<ModelBasicParamsProps> = ({
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  contextMessageLimit,
  setContextMessageLimit,
  selectedModelId,
  availableModels,
}) => {
  return (
    <>
      <h4 className="font-medium text-primary">Basic Parameters</h4>

      {/* Temperature slider */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="temperature"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Temperature</span>
            <ParameterTooltip content="Controls randomness: Lower values make the model more deterministic, higher values make output more creative. Range 0-1." />
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

      {/* Max tokens input */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="tokens"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Max Output Tokens</span>
            <ParameterTooltip content="Maximum length of generated text in tokens. Higher values allow for longer responses but may increase latency." />
          </div>
          <span className="text-sm text-muted-foreground flex items-center">
            {maxTokens}
            <ParameterTooltip
              content={`Model default: ${getModelOutputTokenLimit(selectedModelId, availableModels)}`}
            />
          </span>
        </Label>
        <div className="col-span-4 flex gap-2 items-center">
          <Input
            id="tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => {
              const value = Math.max(1, parseInt(e.target.value));
              setMaxTokens(value);
            }}
            className="flex-1"
          />
        </div>
        <p className="col-span-4 text-xs text-muted-foreground my-0">
          Number of tokens to generate in a response. Higher values allow for
          longer outputs.
        </p>
      </div>

      {/* Context message limit input */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="context-message-limit"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Context Message Limit</span>
            <ParameterTooltip content="Maximum number of previous messages to include in the context. Higher values provide more context but may increase token usage." />
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
              const value =
                e.target.value === ''
                  ? 0
                  : Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
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
    </>
  );
};

/**
 * Reusable tooltip component for parameter descriptions
 */
const ParameterTooltip: React.FC<{ content: string }> = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px]">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const ModelBasicParams = observer(ModelBasicParamsComponent);
